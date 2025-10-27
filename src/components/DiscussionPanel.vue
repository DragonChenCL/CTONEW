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
            :disabled="!canInput || isRecognizingImage"
          >
            <a-button :loading="isRecognizingImage" :disabled="!canInput || isRecognizingImage">
              <span>📷</span>
            </a-button>
          </a-upload>
          <a-input-search
            v-model:value="input"
            placeholder="我想补充一些情况，按回车发送..."
            enter-button="发送"
            :disabled="!canInput || isRecognizingImage"
            @search="onSend"
            style="flex: 1;"
          />
        </div>
        <div v-if="imageRecognitionEnabled && isRecognizingImage" class="upload-hint">
          <span>正在识别图片...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useConsultStore } from '../store'
import { useGlobalStore } from '../store/global'
import CaseInputForm from './CaseInputForm.vue'
import ChatDisplay from './ChatDisplay.vue'
import { recognizeImageWithSiliconFlow } from '../api/imageRecognition'

const store = useConsultStore()
const global = useGlobalStore()
const input = ref('')
const isRecognizingImage = ref(false)

const canInput = computed(() => store.workflow.phase !== 'setup')
const imageRecognitionConfig = computed(() => global.imageRecognition || {})
const imageRecognitionEnabled = computed(() => !!imageRecognitionConfig.value?.enabled)

function togglePause() {
  store.togglePause()
}

function onSend() {
  const text = input.value.trim()
  if (!text) return
  store.addPatientMessage(text)
  input.value = ''
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const full = reader.result
      let raw = ''
      if (typeof full === 'string') {
        const parts = full.split(',')
        raw = parts.length > 1 ? parts[1] : parts[0]
      }
      resolve({ full, raw })
    }
    reader.onerror = (e) => reject(e)
    reader.readAsDataURL(file)
  })
}

async function handleImageUpload(file) {
  if (!imageRecognitionEnabled.value) {
    message.warning('请先在设置中启用图像识别功能')
    return false
  }

  isRecognizingImage.value = true
  
  try {
    const base64 = await toBase64(file)
    
    const result = await recognizeImageWithSiliconFlow({
      apiKey: imageRecognitionConfig.value.apiKey,
      baseUrl: imageRecognitionConfig.value.baseUrl,
      model: imageRecognitionConfig.value.model,
      prompt: imageRecognitionConfig.value.prompt,
      imageBase64: base64.raw
    })

    const trimmed = (result || '').trim()

    if (trimmed) {
      input.value = trimmed
      await nextTick()
      onSend()
    } else {
      message.warning('图片识别未返回内容')
    }
  } catch (err) {
    const errorMessage = err?.message || '图片识别失败，请检查配置'
    message.error(errorMessage)
  } finally {
    isRecognizingImage.value = false
  }
  
  return false
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
</style>
