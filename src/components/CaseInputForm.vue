<template>
  <a-card title="病例输入" :bordered="false">
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
          >
            <a-button :loading="recognizing">
              <template #icon><span>📷</span></template>
              {{ uploadedImage ? '更换图片' : '上传图片' }}
            </a-button>
          </a-upload>
          <div v-if="uploadedImage" style="margin-top: 8px;">
            <img :src="uploadedImage" alt="病灶图片" style="max-width: 100%; max-height: 200px; border-radius: 4px; border: 1px solid #d9d9d9;" />
            <a-button type="link" danger size="small" @click="clearImage">删除图片</a-button>
          </div>
          <div v-if="recognizing" style="color: #1890ff; font-size: 12px;">
            正在识别图片内容...
          </div>
          <div v-if="form.imageRecognitionResult" style="margin-top: 8px;">
            <a-alert type="success" message="图片识别成功" show-icon>
              <template #description>
                <div style="max-height: 100px; overflow-y: auto; font-size: 12px;">
                  {{ form.imageRecognitionResult }}
                </div>
              </template>
            </a-alert>
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
import { reactive, ref, computed } from 'vue'
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
  currentProblem: store.patientCase.currentProblem,
  imageRecognitionResult: store.patientCase.imageRecognitionResult || ''
})

const recognizing = ref(false)
const uploadedImage = ref('')

const imageRecognitionConfig = computed(() => global.imageRecognition || {})
const imageRecognitionEnabled = computed(() => !!imageRecognitionConfig.value?.enabled)

async function handleImageUpload(file) {
  if (!imageRecognitionEnabled.value) {
    message.warning('请先在设置中启用图像识别功能')
    return false
  }
  try {
    recognizing.value = true
    const base64 = await toBase64(file)
    uploadedImage.value = base64.full
    const result = await recognizeImageWithSiliconFlow({
      apiKey: imageRecognitionConfig.value.apiKey,
      baseUrl: imageRecognitionConfig.value.baseUrl,
      model: imageRecognitionConfig.value.model,
      prompt: imageRecognitionConfig.value.prompt,
      imageBase64: base64.raw
    })
    form.imageRecognitionResult = result
    store.setPatientCase({ imageRecognitionResult: result })
    message.success('图片识别完成')
  } catch (err) {
    console.error(err)
    message.error(err?.message || '图片识别失败，请检查配置')
  } finally {
    recognizing.value = false
  }
  return false
}

function clearImage() {
  uploadedImage.value = ''
  form.imageRecognitionResult = ''
  store.setPatientCase({ imageRecognitionResult: '' })
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
    store.setPatientCase(form)
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
