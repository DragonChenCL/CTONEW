<template>
  <div :class="['discussion-panel', { 'discussion-panel--chat': store.workflow.phase !== 'setup' }]">
    <CaseInputForm v-if="store.workflow.phase === 'setup'" />
    <div v-else class="chat-wrapper">
      <div class="controls">
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <div style="color:#8c8c8c; font-size:12px;">
            当前阶段：{{ store.workflow.phase === 'discussion' ? '讨论中' : (store.workflow.phase === 'voting' ? '评估中' : (store.workflow.phase === 'finished' ? '已结束' : store.workflow.phase)) }}
          </div>
          <div>
            <a-button 
              size="small" 
              v-if="store.workflow.phase === 'discussion'" 
              @click="togglePause"
              :type="store.workflow.paused ? 'primary' : 'default'"
              :danger="!store.workflow.paused"
            >
              <span v-if="store.workflow.paused">▶️ 继续</span>
              <span v-else>⏸️ 暂停</span>
            </a-button>
          </div>
        </div>
      </div>
      <!-- Pause Banner -->
      <a-alert 
        v-if="store.workflow.phase === 'discussion' && store.workflow.paused"
        type="warning"
        show-icon
        closable
        class="pause-banner"
        @close="togglePause"
      >
        <template #message>
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
            <span style="font-size: 16px;">⏸️</span>
            <span>会诊已暂停</span>
          </div>
        </template>
        <template #description>
          点击右侧"继续"按钮或关闭此提示以恢复会诊进程
        </template>
      </a-alert>
      <ChatDisplay class="chat-scroll-area" :history="store.discussionHistory" :active-id="store.workflow.activeTurn" />
      <div class="chat-input">
        <div style="display: flex; gap: 8px; width: 100%;">
          <a-upload
            v-if="imageRecognitionEnabled"
            :before-upload="handleImageUpload"
            :show-upload-list="false"
            accept="image/*"
            multiple
            :disabled="!canInput"
          >
            <a-button :loading="hasPendingImages" :disabled="!canInput">
              <span>📷</span>
            </a-button>
          </a-upload>
          <a-input-search
            v-model:value="input"
            placeholder="我想补充一些情况，按回车发送..."
            enter-button="发送"
            :disabled="!canInput"
            @search="onSend"
            style="flex: 1;"
          />
        </div>
        <div v-if="imageRecognitionEnabled && (recognizingCount > 0 || queuedCount > 0)" class="upload-hint">
          <span v-if="recognizingCount > 0">识别中 {{ recognizingCount }} 张</span>
          <span v-if="queuedCount > 0">待识别 {{ queuedCount }} 张</span>
        </div>
        <div v-if="uploadingImages.length > 0" class="uploading-list">
          <div v-for="(image, index) in uploadingImages" :key="image.id" class="uploading-item">
            <div style="display: flex; gap: 8px; align-items: flex-start;">
              <template v-if="image.dataUrl">
                <img :src="image.dataUrl" alt="补充图片" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" />
              </template>
              <div style="flex: 1; min-width: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <span style="font-size: 12px; color: #595959;">{{ image.name }}</span>
                  <a-button type="link" danger size="small" @click="removeUploadingImage(index)" :disabled="image.status === 'recognizing'">删除</a-button>
                </div>
                <div v-if="image.status === 'recognizing'" style="color: #1890ff; font-size: 12px;">
                  <a-spin size="small" style="margin-right: 4px;" /> 识别中...
                </div>
                <div v-else-if="image.status === 'queued'" style="color: #faad14; font-size: 12px;">
                  <span style="margin-right: 4px;">⏳</span> 排队中
                </div>
                <div v-else-if="image.status === 'success'" style="color: #52c41a; font-size: 12px;">
                  <span style="margin-right: 4px;">✓</span> 识别完成
                </div>
                <div v-else-if="image.status === 'error'" style="color: #ff4d4f; font-size: 12px;">
                  <span style="margin-right: 4px;">✗</span> {{ image.error || '识别失败' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { message } from 'ant-design-vue'
import { useConsultStore } from '../store'
import CaseInputForm from './CaseInputForm.vue'
import ChatDisplay from './ChatDisplay.vue'
import { useImageRecognitionQueue } from '../composables/useImageRecognitionQueue'

const store = useConsultStore()
const input = ref('')
const uploadMessageMap = new Map()

const canInput = computed(() => store.workflow.phase !== 'setup')

function patientAuthor() {
  return store.patientCase?.name ? `患者（${store.patientCase.name}）` : '患者'
}

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildImageMessageContent(image, status, extra = {}) {
  const colors = {
    queued: '#faad14',
    recognizing: '#1890ff',
    success: '#52c41a',
    error: '#ff4d4f',
    removed: '#8c8c8c'
  }
  const labels = {
    queued: '排队中，稍后返回识别结果',
    recognizing: '识别中，请稍候...',
    success: '识别完成',
    error: extra.error || image.error || '识别失败',
    removed: '图片已被删除'
  }
  const statusColor = colors[status] || '#8c8c8c'
  const statusLabel = labels[status] || status
  const resultText = status === 'success' ? (extra.result || image.result || '') : ''
  const resultHtml = resultText
    ? `<div style="margin-top:6px; font-size:13px; color:#4a4a4a; line-height:1.6;"><strong>识别结果：</strong>${escapeHtml(resultText)}</div>`
    : ''

  return `
    <div style="font-size:13px; color:#595959;">
      <div style="font-weight:600; margin-bottom:4px;">补充图片：${escapeHtml(image.name || '未命名图片')}</div>
      ${image.dataUrl ? `<img src="${image.dataUrl}" alt="补充图片" style="max-width:180px; border-radius:8px; display:block; margin-bottom:8px;" />` : ''}
      <div style="color:${statusColor};">${statusLabel}</div>
      ${resultHtml}
    </div>
  `
}

function createImageDiscussionMessage(image, status, extra) {
  const msg = {
    type: 'patient',
    author: patientAuthor(),
    content: buildImageMessageContent(image, status, extra)
  }
  store.discussionHistory.push(msg)
  uploadMessageMap.set(image.id, msg)
}

function updateImageDiscussionMessage(image, status, extra) {
  const msg = uploadMessageMap.get(image.id)
  if (!msg) {
    createImageDiscussionMessage(image, status, extra)
    return
  }
  msg.content = buildImageMessageContent(image, status, extra)
  if (status === 'removed') {
    uploadMessageMap.delete(image.id)
  }
}

const {
  uploadedImages,
  imageRecognitionEnabled,
  hasPendingImages,
  recognizingCount,
  queuedCount,
  queueImageFile,
  removeImage
} = useImageRecognitionQueue({
  onQueued(image) {
    createImageDiscussionMessage(image, 'queued')
  },
  onStatusChange(image, status, payload = {}) {
    if (status === 'recognizing') {
      updateImageDiscussionMessage(image, 'recognizing')
    } else if (status === 'success') {
      updateImageDiscussionMessage(image, 'success', { result: payload.result })
      message.success('图片识别完成')
    } else if (status === 'error') {
      updateImageDiscussionMessage(image, 'error', { error: payload.error })
      message.error(payload.error || '图片识别失败，请检查配置')
    }
  }
})

const uploadingImages = uploadedImages

function togglePause() {
  store.togglePause()
}

function onSend() {
  const text = input.value.trim()
  if (!text) return
  store.addPatientMessage(text)
  input.value = ''
}

async function handleImageUpload(file) {
  try {
    await queueImageFile(file)
    message.success(`已添加图片：${file.name}`)
  } catch (err) {
    if (err?.message) {
      message.error(err.message)
    } else {
      message.error('读取图片失败，请重试')
    }
  }
  return false
}

function removeUploadingImage(index) {
  const target = uploadingImages.value[index]
  if (!target) return
  if (target.status === 'recognizing') {
    message.warning('当前图片正在识别中，无法删除')
    return
  }
  removeImage(index)
  updateImageDiscussionMessage(target, 'removed')
}
</script>

<style scoped>
.discussion-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.discussion-panel--chat {
  height: 100%;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}
.controls {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px;
  background: #fff;
  border-radius: 8px 8px 0 0;
  flex-shrink: 0;
}
.pause-banner {
  flex-shrink: 0;
  margin: 0;
  border-radius: 0;
  border-left: none;
  border-right: none;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    background-color: #fffbe6;
  }
  50% {
    background-color: #fff7e6;
  }
}

.chat-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.chat-input {
  position: sticky;
  bottom: 0;
  border-top: 1px solid #f0f0f0;
  padding: 8px;
  background: #fff;
  border-radius: 0 0 8px 8px;
  flex-shrink: 0;
  z-index: 10;
}

.upload-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #1890ff;
  display: flex;
  gap: 8px;
}

.uploading-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.uploading-item {
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
  transition: background 0.2s ease;
}

.uploading-item:hover {
  background: #f5f5f5;
}
</style>
