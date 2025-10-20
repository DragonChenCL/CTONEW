import axios from 'axios'
import { wrapUrlForDev } from './http'

function normalizeBaseUrl(baseUrl, fallback) {
  const url = (baseUrl || fallback || '').trim()
  if (!url) return ''
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function toOptions(list) {
  return list.map((m) => ({ label: m.displayName ? `${m.id} (${m.displayName})` : m.id, value: m.id }))
}

export async function listModels(provider, apiKey, baseUrl) {
  switch (provider) {
    case 'openai':
      return toOptions(await listOpenAIModels(apiKey, baseUrl))
    case 'anthropic':
      return toOptions(await listAnthropicModels(apiKey, baseUrl))
    case 'gemini':
      return toOptions(await listGeminiModels(apiKey, baseUrl))
    default:
      return []
  }
}

export async function listOpenAIModels(apiKey, baseUrl) {
  const root = normalizeBaseUrl(baseUrl, 'https://api.openai.com')
  const url = wrapUrlForDev(`${root}/v1/models`)
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const data = res.data?.data || []
  return data
    .map((m) => ({ id: m.id, displayName: m.owned_by ? m.owned_by : undefined }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function listAnthropicModels(apiKey, baseUrl) {
  const root = normalizeBaseUrl(baseUrl, 'https://api.anthropic.com')
  const url = wrapUrlForDev(`${root}/v1/models`)
  const res = await axios.get(url, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  })
  const arr = res.data?.data || res.data?.models || []
  return arr
    .map((m) => ({ id: m.id || m.slug || m.name, displayName: m.display_name || undefined }))
    .filter((m) => !!m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function listGeminiModels(apiKey, baseUrl) {
  const root = normalizeBaseUrl(baseUrl, 'https://generativelanguage.googleapis.com')
  const isGoogle = /generativelanguage\.googleapis\.com$/.test(root)
  // Gemini supports v1 and v1beta. Try v1 first then fallback to v1beta.
  const tryPaths = [`${root}/v1/models`, `${root}/v1beta/models`]
  let models = []
  for (const p of tryPaths) {
    try {
      const url = wrapUrlForDev(isGoogle ? `${p}?key=${encodeURIComponent(apiKey)}` : p)
      const res = await axios.get(url, { headers: isGoogle ? {} : { 'x-goog-api-key': apiKey } })
      const arr = res.data?.models || []
      models = arr.map((m) => ({ id: (m.name || '').replace(/^models\//, ''), displayName: m.displayName }))
      break
    } catch (e) {
      // try next
    }
  }
  return models.sort((a, b) => a.id.localeCompare(b.id))
}
