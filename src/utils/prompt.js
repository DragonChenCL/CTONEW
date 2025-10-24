export function buildFullPrompt(systemPrompt, caseInfo, discussionHistory) {
  const caseText = formatCase(caseInfo)
  const historyText = discussionHistory
    .filter((m) => m.type === 'doctor' || m.type === 'patient')
    .map((m) => {
      if (m.type === 'doctor') return `${m.doctorName}: ${m.content}`
      const patientName = caseInfo?.name ? `患者（${caseInfo.name}）` : '患者'
      return `${patientName}: ${m.content}`
    })
    .join('\n')

  const user = `【患者病历】\n${caseText}\n\n【讨论与患者补充】\n${historyText || '（暂无）'}\n\n请基于上述信息，给出你的专业分析与建议。`

  return { system: systemPrompt, user }
}

export function buildVotePrompt(systemPrompt, caseInfo, discussionHistory, doctors, voter) {
  const caseText = formatCase(caseInfo)
  const historyText = discussionHistory
    .filter((m) => m.type === 'doctor' || m.type === 'patient')
    .map((m) => {
      if (m.type === 'doctor') return `${m.doctorName}: ${m.content}`
      const patientName = caseInfo?.name ? `患者（${caseInfo.name}）` : '患者'
      return `${patientName}: ${m.content}`
    })
    .join('\n')

  const doctorList = (doctors || [])
    .map((d) => `- ${d.name}（ID: ${d.id}）`)
    .join('\n')

  const voteInstruction =
    '你现在处于评估阶段，请根据上述讨论标注你认为本轮最不太准确的答案对应的医生（可选择自己）。请严格仅输出一个JSON对象，不要包含任何其它文字或标记。JSON格式如下：{"targetDoctorId":"<医生ID>","reason":"<简短理由>"}\n请确保 targetDoctorId 必须是下面医生列表中的ID之一。'

  const user = `【患者病历】\n${caseText}\n\n【讨论与患者补充】\n${historyText || '（暂无）'}\n\n【医生列表】\n${doctorList}\n\n你是 ${voter?.name || ''}（ID: ${voter?.id || ''}）。${voteInstruction}`
  const system = `${systemPrompt}\n\n重要：现在只需进行评估并输出结果。严格仅输出JSON对象，格式为 {"targetDoctorId":"<医生ID>","reason":"<简短理由>"}。不要输出解释、Markdown 或其他多余内容。`
  return { system, user }
}

export function buildFinalSummaryPrompt(systemPrompt, caseInfo, discussionHistory) {
  const caseText = formatCase(caseInfo)
  const historyText = discussionHistory
    .filter((m) => m.type === 'doctor' || m.type === 'patient')
    .map((m) => {
      if (m.type === 'doctor') return `${m.doctorName}: ${m.content}`
      const patientName = caseInfo?.name ? `患者（${caseInfo.name}）` : '患者'
      return `${patientName}: ${m.content}`
    })
    .join('\n')

  const user = `【患者病历】\n${caseText}\n\n【完整会诊纪要】\n${historyText || '（暂无）'}\n\n请用中文，以临床医生的口吻，给出最终总结。请至少包含：\n1) 核心诊断与分级（如无法明确请给出最可能诊断及概率）；\n2) 主要依据（条目式）；\n3) 鉴别诊断（按可能性排序）；\n4) 进一步检查与理由；\n5) 治疗与处置建议（药物剂量如适用）；\n6) 随访与复诊时机；\n7) 患者教育与风险提示。`
  return { system: systemPrompt, user }
}

export function formatHistoryForProvider(discussionHistory, caseInfo) {
  const msgs = []
  for (const item of discussionHistory) {
    if (item.type === 'doctor') {
      msgs.push({ role: 'assistant', content: `${item.doctorName}: ${item.content}` })
    } else if (item.type === 'patient') {
      const patientName = caseInfo?.name ? `患者（${caseInfo.name}）` : '患者'
      msgs.push({ role: 'user', content: `${patientName}: ${item.content}` })
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
  if (info.imageRecognitionResult) parts.push(`图片识别结果: ${info.imageRecognitionResult}`)
  return parts.join('\n')
}
