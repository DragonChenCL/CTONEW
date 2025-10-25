import { defineStore } from 'pinia'

const GLOBAL_DOCTORS_KEY = 'global_doctors_config'

function loadGlobalDoctors() {
  try {
    const raw = localStorage.getItem(GLOBAL_DOCTORS_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    }
  } catch (e) {}
  // 默认全局医生配置（不包含状态与票数）
  return [
    {
      id: 'doc-1',
      name: 'Dr. GPT-4',
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    },
    {
      id: 'doc-2',
      name: 'Dr. Claude 3',
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    },
    {
      id: 'doc-3',
      name: 'Dr. Gemini',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      apiKey: '',
      baseUrl: '',
      customPrompt: ''
    }
  ]
}

function saveGlobalDoctors(list) {
  localStorage.setItem(GLOBAL_DOCTORS_KEY, JSON.stringify(list || []))
}

const IMAGE_RECOGNITION_KEY = 'global_image_recognition_config'

function normalizeMaxConcurrent(value) {
  const num = Number(value)
  if (Number.isFinite(num) && num >= 1) {
    return Math.floor(num)
  }
  return 1
}

function loadImageRecognitionConfig() {
  const defaults = {
    enabled: false,
    provider: 'siliconflow',
    model: 'Pro/Qwen/Qwen2-VL-72B-Instruct',
    apiKey: '',
    baseUrl: '',
    prompt:
      '识别当前病灶相关的图片内容。请仔细观察图片中的所有细节，用专业医学术语描述图片中的病灶特征、位置、形态、颜色、大小等关键信息。如果图片中没有明显的病灶相关内容或与医疗诊断无关，请明确说明"图片内容与病灶无关"。请使用专业、严谨的语气进行描述。',
    maxConcurrent: 1
  }
  try {
    const raw = localStorage.getItem(IMAGE_RECOGNITION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...defaults,
        ...parsed,
        maxConcurrent: normalizeMaxConcurrent(parsed?.maxConcurrent ?? defaults.maxConcurrent)
      }
    }
  } catch (e) {}
  return defaults
}

function saveImageRecognitionConfig(config) {
  localStorage.setItem(IMAGE_RECOGNITION_KEY, JSON.stringify(config))
}

export const useGlobalStore = defineStore('global', {
  state: () => ({
    doctors: loadGlobalDoctors(),
    imageRecognition: loadImageRecognitionConfig()
  }),
  actions: {
    setDoctors(list) {
      // 仅保存必要字段，避免混入 status/votes 等会诊内状态
      const sanitized = (list || []).map((d) => ({
        id: d.id,
        name: d.name,
        provider: d.provider,
        model: d.model,
        apiKey: d.apiKey,
        baseUrl: d.baseUrl,
        customPrompt: d.customPrompt
      }))
      this.doctors = sanitized
      saveGlobalDoctors(sanitized)
    },
    setImageRecognition(config) {
      const payload = {
        enabled: !!config?.enabled,
        provider: config?.provider || 'siliconflow',
        model: config?.model || 'Pro/Qwen/Qwen2-VL-72B-Instruct',
        apiKey: config?.apiKey || '',
        baseUrl: config?.baseUrl || '',
        prompt:
          config?.prompt ||
          '识别当前病灶相关的图片内容。请仔细观察图片中的所有细节，用专业医学术语描述图片中的病灶特征、位置、形态、颜色、大小等关键信息。如果图片中没有明显的病灶相关内容或与医疗诊断无关，请明确说明"图片内容与病灶无关"。请使用专业、严谨的语气进行描述。',
        maxConcurrent: normalizeMaxConcurrent(config?.maxConcurrent ?? 1)
      }
      this.imageRecognition = payload
      saveImageRecognitionConfig(payload)
    }
  }
})
