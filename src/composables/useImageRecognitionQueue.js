import { ref, computed, watch } from 'vue'
import { useConsultStore } from '../store'
import { useGlobalStore } from '../store/global'
import { recognizeImageWithSiliconFlow } from '../api/imageRecognition'

function normalizeStatus(status, result, error) {
  if (status === 'recognizing') return 'recognizing'
  if (status === 'queued') return 'queued'
  if (status === 'success' || result) return 'success'
  if (status === 'error' || error) return 'error'
  return 'queued'
}

function normalizeImagesFromStore(list) {
  if (!Array.isArray(list) || !list.length) return []
  const now = Date.now()
  return list.map((item, idx) => ({
    id: item?.id || `img-${now}-${idx}`,
    name: item?.name || '',
    dataUrl: item?.dataUrl || item?.imageUrl || '',
    result: item?.result || '',
    status: normalizeStatus(item?.status, item?.result, item?.error),
    error: item?.error || '',
    raw: item?.raw || '',
    createdAt: item?.createdAt || now
  }))
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

export function useImageRecognitionQueue(options = {}) {
  const store = useConsultStore()
  const global = useGlobalStore()
  const { onQueued, onStatusChange } = options || {}

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

  let syncing = false
  let syncResetTimer = null

  if (uploadedImages.value.length) {
    syncCaseImageState()
  }

  function initializeImages() {
    const saved = normalizeImagesFromStore(store.patientCase?.imageRecognitions)
    if (saved.length) return saved
    if (store.patientCase?.imageRecognitionResult) {
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
    syncing = true
    if (syncResetTimer) clearTimeout(syncResetTimer)
    store.setPatientCase({ imageRecognitions: sanitizeImages() })
    syncResetTimer = setTimeout(() => {
      syncing = false
      syncResetTimer = null
    }, 0)
  }

  async function queueImageFile(file) {
    if (!imageRecognitionEnabled.value) {
      throw new Error('请先在设置中启用图像识别功能')
    }
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
    if (typeof onQueued === 'function') {
      onQueued(item)
    }
    processQueue()
    return item
  }

  function removeImage(index) {
    if (index < 0 || index >= uploadedImages.value.length) return
    uploadedImages.value.splice(index, 1)
    syncCaseImageState()
  }

  async function processQueue() {
    while (true) {
      const recognizing = uploadedImages.value.filter((img) => img.status === 'recognizing')
      if (recognizing.length >= maxConcurrent.value) {
        break
      }
      const next = uploadedImages.value.find((img) => img.status === 'queued')
      if (!next) {
        break
      }
      next.status = 'recognizing'
      syncCaseImageState()
      if (typeof onStatusChange === 'function') {
        onStatusChange(next, 'recognizing')
      }
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
      if (typeof onStatusChange === 'function') {
        onStatusChange(imageItem, 'success', { result })
      }
    } catch (err) {
      imageItem.status = 'error'
      imageItem.error = err?.message || '图片识别失败，请检查配置'
      if (typeof onStatusChange === 'function') {
        onStatusChange(imageItem, 'error', { error: imageItem.error, rawError: err })
      }
    } finally {
      syncCaseImageState()
      processQueue()
    }
  }

  watch(
    () => store.patientCase?.imageRecognitions,
    (newList) => {
      if (syncing) return
      const normalized = normalizeImagesFromStore(newList)
      const incomingMap = new Map(normalized.map((item) => [item.id, item]))
      for (let i = uploadedImages.value.length - 1; i >= 0; i -= 1) {
        const current = uploadedImages.value[i]
        const incoming = incomingMap.get(current.id)
        if (!incoming) {
          uploadedImages.value.splice(i, 1)
        } else {
          Object.assign(current, incoming)
          incomingMap.delete(current.id)
        }
      }
      incomingMap.forEach((item) => {
        uploadedImages.value.push(item)
      })
    },
    { deep: true }
  )

  return {
    uploadedImages,
    processingCount,
    imageRecognitionConfig,
    imageRecognitionEnabled,
    maxConcurrent,
    queuedImages,
    recognizingImages,
    queuedCount,
    recognizingCount,
    pendingImages,
    hasPendingImages,
    queueImageFile,
    removeImage
  }
}
