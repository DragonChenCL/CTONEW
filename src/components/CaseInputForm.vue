<template>
  <a-card title="病例输入" :bordered="false" class="case-input-card">
    <!-- <a-alert
      type="warning"
      show-icon
      message="【本内容仅供参考，身体不适尽早就医】"
      style="margin-bottom: 16px;"
    /> -->
    <a-form :model="form" layout="vertical" @finish="onSubmit">
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="患者名称" name="name" :rules="[{ required: true, message: '请输入患者名称' }]">
            <a-input v-model:value="form.name" placeholder="张三" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="性别" name="gender">
            <a-select v-model:value="form.gender" placeholder="请选择性别">
              <a-select-option value="male">男</a-select-option>
              <a-select-option value="female">女</a-select-option>
              <a-select-option value="other">其他</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="年龄" name="age">
            <a-input-number v-model:value="form.age" :min="0" :max="150" placeholder="请输入年龄" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="既往疾病" name="pastHistory">
        <a-textarea v-model:value="form.pastHistory" rows="3" placeholder="既往疾病、手术史、用药史等" />
      </a-form-item>
      <a-form-item label="本次问题" name="currentProblem" :rules="[{ required: true, message: '请输入本次问题' }]">
        <a-textarea v-model:value="form.currentProblem" rows="4" placeholder="主诉与现病史" />
      </a-form-item>
      <a-form-item v-if="imageRecognitionEnabled" label="病灶图片">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <a-upload
            :before-upload="handleImageUpload"
            :show-upload-list="false"
            accept="image/*"
            multiple
          >
            <a-button :loading="hasPendingImages">
              <template #icon><span>📷</span></template>
              {{ uploadedImages.length ? '继续上传图片' : '上传图片' }}
            </a-button>
          </a-upload>
          <div v-if="recognizingCount > 0" style="color: #1890ff; font-size: 12px;">
            正在识别 {{ recognizingCount }} 张图片，队列中等待 {{ queuedCount }} 张
          </div>
          <div v-else-if="queuedCount > 0" style="color: #faad14; font-size: 12px;">
            已加入识别队列，待识别图片 {{ queuedCount }} 张
          </div>
          <div v-if="uploadedImages.length > 0" style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
            <div v-for="(image, index) in uploadedImages" :key="index" style="border: 1px solid #d9d9d9; border-radius: 4px; padding: 8px;">
              <div style="display: flex; gap: 8px; align-items: flex-start;">
                <template v-if="image.dataUrl">
                  <img :src="image.dataUrl" alt="病灶图片" style="width: 120px; height: 120px; object-fit: cover; border-radius: 4px; flex-shrink: 0;" />
                </template>
                <template v-else>
                  <div style="width: 120px; height: 120px; border: 1px dashed #d9d9d9; display: flex; align-items: center; justify-content: center; color: #bfbfbf; border-radius: 4px; flex-shrink: 0; font-size: 12px;">
                    无预览
                  </div>
                </template>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <span style="font-weight: 600; font-size: 12px; color: #595959;">图片 {{ index + 1 }}</span>
                    <a-button type="link" danger size="small" @click="removeImage(index)">删除</a-button>
                  </div>
                  <div v-if="image.status === 'recognizing'" style="color: #1890ff; font-size: 12px;">
                    <a-spin size="small" style="margin-right: 4px;" /> 识别中...
                  </div>
                  <div v-else-if="image.status === 'queued'" style="color: #faad14; font-size: 12px;">
                    <span style="margin-right: 4px;">⏳</span> 排队中，等待识别
                  </div>
                  <div v-else-if="image.status === 'success' && image.result" style="margin-top: 4px;">
                    <a-alert type="success" message="识别成功" show-icon size="small">
                      <template #description>
                        <div style="max-height: 80px; overflow-y: auto; font-size: 12px;">
                          {{ image.result }}
                        </div>
                      </template>
                    </a-alert>
                  </div>
                  <div v-else-if="image.status === 'error'" style="margin-top: 4px;">
                    <a-alert type="error" message="识别失败" show-icon size="small">
                      <template #description>
                        <div style="font-size: 12px;">
                          {{ image.error || '识别失败' }}
                        </div>
                      </template>
                    </a-alert>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </a-form-item>
      <div style="display:flex; gap: 8px;">
        <a-button type="primary" html-type="submit">开始会诊</a-button>
        <a-button @click="openSettings">配置医生/提示词</a-button>
      </div>
    </a-form>
  </a-card>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useConsultStore } from '../store'
import { useGlobalStore } from '../store/global'
import { recognizeImageWithSiliconFlow } from '../api/imageRecognition'

const store = useConsultStore()
const global = useGlobalStore()

const form = reactive({
  name: store.patientCase.name,
  gender: store.patientCase.gender,
  age: store.patientCase.age,
  pastHistory: store.patientCase.pastHistory,
  currentProblem: store.patientCase.currentProblem
})

const uploadedImages = ref(initializeImages())
const processingCount = ref(0)

const imageRecognitionConfig = computed(() => global.imageRecognition || {})
const imageRecognitionEnabled = computed(() => !!imageRecognitionConfig.value?.enabled)
const maxConcurrent = computed(() => {
  const value = imageRecognitionConfig.value?.maxConcurrent
  const num = Number(value)
  if (Number.isFinite(num) && num >= 1) {
    return Math.floor(num)
  }
  return 1
})
const queuedImages = computed(() => uploadedImages.value.filter((img) => img.status === 'queued'))
const recognizingImages = computed(() => uploadedImages.value.filter((img) => img.status === 'recognizing'))
const queuedCount = computed(() => queuedImages.value.length)
const recognizingCount = computed(() => recognizingImages.value.length)
const pendingImages = computed(() => uploadedImages.value.filter((img) => img.status === 'queued' || img.status === 'recognizing'))
const hasPendingImages = computed(() => pendingImages.value.length > 0)

function initializeImages() {
  const saved = Array.isArray(store.patientCase.imageRecognitions) ? store.patientCase.imageRecognitions : []
  if (saved.length > 0) {
    return saved.map((item, idx) => ({
      id: item.id || `saved-${idx}`,
      name: item.name || '',
      dataUrl: item.dataUrl || item.imageUrl || '',
      result: item.result || '',
      status: normalizeStatus(item.status, item.result),
      error: item.error || '',
      raw: item.raw || '',
      createdAt: item.createdAt || Date.now()
    }))
  }
  if (store.patientCase.imageRecognitionResult) {
    return [
      {
        id: `legacy-${Date.now()}`,
        name: '',
        dataUrl: '',
        result: store.patientCase.imageRecognitionResult,
        status: 'success',
        error: '',
        raw: '',
        createdAt: Date.now()
      }
    ]
  }
  return []
}

function normalizeStatus(status, result) {
  if (status === 'queued' || status === 'recognizing') return 'queued'
  if (status === 'error') return 'error'
  if (status === 'success') return 'success'
  return result ? 'success' : 'queued'
}

function sanitizeImages() {
  return (uploadedImages.value || []).map((item) => ({
    id: item.id,
    name: item.name,
    dataUrl: item.dataUrl,
    result: item.result,
    status: item.status,
    error: item.error,
    createdAt: item.createdAt,
    raw: item.status === 'queued' || item.status === 'recognizing' ? item.raw : ''
  }))
}

function syncCaseImageState() {
  store.setPatientCase({ imageRecognitions: sanitizeImages() })
}

if (uploadedImages.value.length) {
  syncCaseImageState()
}

async function handleImageUpload(file) {
  if (!imageRecognitionEnabled.value) {
    message.warning('请先在设置中启用图像识别功能')
    return false
  }
  try {
    const base64 = await toBase64(file)
    const item = {
      id: `img-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      dataUrl: base64.full,
      result: '',
      status: 'queued',
      error: '',
      raw: base64.raw,
      createdAt: Date.now()
    }
    uploadedImages.value.push(item)
    syncCaseImageState()
    processQueue()
    message.success(`已添加图片：${file.name}`)
  } catch (err) {
    console.error(err)
    message.error('读取图片失败，请重试')
  }
  return false
}

async function processQueue() {
  while (true) {
    const recognizing = uploadedImages.value.filter((img) => img.status === 'recognizing')
    const limit = maxConcurrent.value
    if (recognizing.length >= limit) {
      break
    }
    const next = uploadedImages.value.find((img) => img.status === 'queued')
    if (!next) {
      break
    }
    next.status = 'recognizing'
    syncCaseImageState()
    processSingleImage(next)
  }
}

async function processSingleImage(imageItem) {
  try {
    const result = await recognizeImageWithSiliconFlow({
      apiKey: imageRecognitionConfig.value.apiKey,
      baseUrl: imageRecognitionConfig.value.baseUrl,
      model: imageRecognitionConfig.value.model,
      prompt: imageRecognitionConfig.value.prompt,
      imageBase64: imageItem.raw
    })
    imageItem.result = result
    imageItem.status = 'success'
    imageItem.error = ''
    imageItem.raw = ''
    message.success('图片识别完成')
  } catch (err) {
    console.error(err)
    imageItem.status = 'error'
    imageItem.error = err?.message || '图片识别失败，请检查配置'
  } finally {
    syncCaseImageState()
    processQueue()
  }
}

function removeImage(index) {
  const target = uploadedImages.value[index]
  if (!target) return
  if (target.status === 'recognizing') {
    message.warning('当前图片正在识别中，无法删除')
    return
  }
  uploadedImages.value.splice(index, 1)
  syncCaseImageState()
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

function onSubmit() {
  try {
    store.setPatientCase({
      name: form.name,
      gender: form.gender,
      age: form.age,
      pastHistory: form.pastHistory,
      currentProblem: form.currentProblem,
      imageRecognitions: sanitizeImages()
    })
    store.startConsultation()
  } catch (e) {
    message.error(e.message || String(e))
  }
}

function openSettings() {
  const event = new CustomEvent('open-settings')
  window.dispatchEvent(event)
}
</script>

<style scoped>
.case-input-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.case-input-card :deep(.ant-card-body) {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.case-input-card :deep(.ant-card-body) {
  scrollbar-width: thin;
}

.case-input-card :deep(.ant-card-body::-webkit-scrollbar) {
  width: 6px;
}
</style>
