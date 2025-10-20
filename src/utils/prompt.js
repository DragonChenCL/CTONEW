export function buildFullPrompt(systemPrompt, caseInfo, discussionHistory) {
  const caseText = formatCase(caseInfo)
  const historyText = discussionHistory
    .filter((m) => m.type === 'doctor')
    .map((m) => `${m.doctorName}: ${m.content}`)
    .join('\n')

  const user = `【患者病历】\n${caseText}\n\n【已有讨论】\n${historyText || '（暂无）'}\n\n请基于上述信息，给出你的专业分析与建议。`

  return { system: systemPrompt, user }
}

export function formatHistoryForProvider(discussionHistory) {
  const msgs = []
  for (const item of discussionHistory) {
    if (item.type === 'doctor') {
      msgs.push({ role: 'assistant', content: `${item.doctorName}: ${item.content}` })
    } else if (item.type === 'system') {
      // skip or convert if needed
    }
  }
  return msgs
}

function formatCase(info) {
  const parts = []
  if (info.name) parts.push(`姓名: ${info.name}`)
  if (info.age !== null && info.age !== undefined) parts.push(`年龄: ${info.age}`)
  if (info.pastHistory) parts.push(`既往史: ${info.pastHistory}`)
  if (info.currentProblem) parts.push(`主诉: ${info.currentProblem}`)
  return parts.join('\n')
}
