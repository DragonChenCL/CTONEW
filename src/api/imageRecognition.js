import axios from 'axios'
import { wrapUrlForDev } from './http'

function normalizeBaseUrl(baseUrl, fallback) {
  const url = (baseUrl || fallback || '').trim()
  if (!url) return ''
  return url.endsWith('/') ? url.slice(0, -1) : url
}

function extractTextFromChoice(choice) {
  if (!choice) return ''
  const { message, text } = choice
  if (text) return String(text).trim()
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => {
        if (!part) return ''
        if (typeof part === 'string') return part
        return part.text || part.content || ''
      })
      .join('\n')
      .trim()
  }
  if (typeof message?.content === 'string') return message.content.trim()
  return ''
}

export async function recognizeImageWithSiliconFlow({ apiKey, baseUrl, model, prompt, imageBase64 }) {
  if (!apiKey) {
    throw new Error('未配置图像识别 API Key')
  }
  if (!model) {
    throw new Error('请选择图像识别模型')
  }
  if (!imageBase64) {
    throw new Error('请提供要识别的图片')
  }
  const root = normalizeBaseUrl(baseUrl, 'https://api.siliconflow.cn')
  const url = wrapUrlForDev(`${root}/v1/chat/completions`)
  const payload = {
    model,
    messages: [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: prompt ||
              '识别当前病灶相关的图片内容。请仔细观察图片中的所有细节，用专业医学术语描述图片中的病灶特征、位置、形态、颜色、大小等关键信息。如果图片中没有明显的病灶相关内容或与医疗诊断无关，请明确说明"图片内容与病灶无关"。请使用专业、严谨的语气进行描述。'
          }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请根据上述要求分析以下图片，并返回详细的医学描述。' },
          { type: 'image_url', image_url: `data:image/jpeg;base64,${imageBase64}` }
        ]
      }
    ],
    temperature: 0.1
  }

  const res = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  })

  const choice = res.data?.choices?.[0]
  const content = extractTextFromChoice(choice) || res.data?.output_text
  return (content || '').trim()
}
