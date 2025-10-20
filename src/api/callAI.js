import axios from 'axios'

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

export async function callAI(doctor, fullPrompt, historyForProvider) {
  const { provider, model, apiKey } = doctor

  if (!apiKey) {
    await sleep(600)
    return `【模拟回复 - ${doctor.name}】\n根据提供的病历与讨论历史，我认为需要进一步完善体格检查与辅助检查以明确诊断。`
  }

  switch (provider) {
    case 'openai':
      return callOpenAI({ apiKey, model, fullPrompt, history: historyForProvider })
    case 'anthropic':
      return callAnthropic({ apiKey, model, fullPrompt, history: historyForProvider })
    case 'gemini':
      return callGemini({ apiKey, model, fullPrompt, history: historyForProvider })
    default:
      throw new Error('Unsupported AI provider')
  }
}

async function callOpenAI({ apiKey, model, fullPrompt, history }) {
  const messages = [
    { role: 'system', content: fullPrompt.system },
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const url = 'https://api.openai.com/v1/chat/completions'
  const res = await axios.post(
    url,
    { model, messages, temperature: 0.7 },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  return res.data.choices?.[0]?.message?.content?.trim() || ''
}

async function callAnthropic({ apiKey, model, fullPrompt, history }) {
  const url = 'https://api.anthropic.com/v1/messages'
  const messages = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: fullPrompt.user }
  ]
  const res = await axios.post(
    url,
    {
      model,
      max_tokens: 1024,
      system: fullPrompt.system,
      messages
    },
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  )
  return res.data?.content?.[0]?.text?.trim() || ''
}

async function callGemini({ apiKey, model, fullPrompt, history }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`

  const contents = [
    ...history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: fullPrompt.user }] }
  ]

  const res = await axios.post(
    url,
    {
      systemInstruction: { role: 'system', parts: [{ text: fullPrompt.system }] },
      contents
    },
    { headers: { 'Content-Type': 'application/json' } }
  )

  return (
    res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    res.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n') ||
    ''
  )
}
