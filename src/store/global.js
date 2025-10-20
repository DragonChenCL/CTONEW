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

export const useGlobalStore = defineStore('global', {
  state: () => ({
    doctors: loadGlobalDoctors()
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
    }
  }
})
