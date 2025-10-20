import { defineStore } from 'pinia'
import { callAI } from '../api/callAI'
import { buildFullPrompt, buildVotePrompt, buildFinalSummaryPrompt, formatHistoryForProvider } from '../utils/prompt'

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms))
}

export const useConsultStore = defineStore('consult', {
  state: () => ({
    settings: {
      globalSystemPrompt:
        '你是一位顶级的、经验丰富的临床诊断医生。你的任务是基于提供的患者病历进行分析和诊断。\n\n现在，你正在参与一个多方专家会诊。你会看到其他医生的诊断意见。请综合考虑他们的分析，这可能会启发你，但你必须保持自己独立的专业判断。\n\n你的发言必须遵循以下原则：\n1.  专业严谨: 你的分析必须基于医学知识和病历信息。\n2.  独立思考: 不要为了迎合他人而轻易改变自己的核心观点。如果其他医生的观点是正确的，你可以表示赞同并加以补充；如果观点有误或你持有不同看法，必须明确、有理有据地指出。\n3.  目标导向: 会诊的唯一目标是为患者找到最佳的解决方案。\n4.  简洁清晰: 直接陈述你的核心诊断、分析和建议。\n\n现在，请根据下面的病历和已有的讨论，发表你的看法。',
      summaryPrompt: '请根据完整会诊内容，以临床医生口吻输出最终总结：包含核心诊断、依据、鉴别诊断、检查建议、治疗建议、随访计划和风险提示。',
      turnOrder: 'random',
      maxRoundsWithoutElimination: 3
    },
    doctors: [
      {
        id: 'doc-1',
        name: 'Dr. GPT-4',
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '',
        baseUrl: '',
        customPrompt: '',
        status: 'active',
        votes: 0
      },
      {
        id: 'doc-2',
        name: 'Dr. Claude 3',
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: '',
        baseUrl: '',
        customPrompt: '',
        status: 'active',
        votes: 0
      },
      {
        id: 'doc-3',
        name: 'Dr. Gemini',
        provider: 'gemini',
        model: 'gemini-1.5-flash',
        apiKey: '',
        baseUrl: '',
        customPrompt: '',
        status: 'active',
        votes: 0
      }
    ],
    patientCase: {
      name: '',
      age: null,
      pastHistory: '',
      currentProblem: ''
    },
    workflow: {
      phase: 'setup',
      currentRound: 0,
      roundsWithoutElimination: 0,
      activeTurn: null,
      turnQueue: [],
      paused: false
    },
    discussionHistory: [],
    lastRoundVotes: [],
    finalSummary: { status: 'idle', doctorId: null, doctorName: '', content: '', usedPrompt: '' }
  }),
  getters: {
    activeDoctors(state) {
      return state.doctors.filter((d) => d.status === 'active')
    },
    anyApiKeys(state) {
      return state.doctors.some((d) => d.apiKey)
    }
  },
  actions: {
    setSettings(newSettings) {
      this.settings = { ...this.settings, ...newSettings }
    },
    setDoctors(newDoctors) {
      this.doctors = newDoctors
    },
    setPatientCase(caseInfo) {
      this.patientCase = { ...this.patientCase, ...caseInfo }
    },
    addPatientMessage(text) {
      const content = String(text || '').trim()
      if (!content) return
      const name = this.patientCase?.name ? `患者（${this.patientCase.name}）` : '患者'
      this.discussionHistory.push({ type: 'patient', author: name, content })
    },
    resetVotes() {
      this.doctors = this.doctors.map((d) => ({ ...d, votes: 0 }))
    },
    startConsultation() {
      if (!this.patientCase.name || !this.patientCase.currentProblem) {
        throw new Error('请填写患者名称和本次问题')
      }
      // 新的问诊开始时，所有医生恢复为在席状态，清空票数，并取消暂停
      this.doctors = this.doctors.map((d) => ({ ...d, status: 'active', votes: 0 }))
      this.workflow.phase = 'discussion'
      this.workflow.currentRound = 1
      this.workflow.roundsWithoutElimination = 0
      this.workflow.paused = false
      this.finalSummary = { status: 'idle', doctorId: null, doctorName: '', content: '', usedPrompt: '' }
      this.discussionHistory.push({ type: 'system', content: `第 ${this.workflow.currentRound} 轮会诊开始` })
      this.generateTurnQueue()
      this.runDiscussionRound()
    },
    generateTurnQueue() {
      const actives = this.doctors.filter((d) => d.status === 'active').map((d) => d.id)
      if (this.settings.turnOrder === 'random') {
        this.workflow.turnQueue = actives
          .map((id) => ({ id, r: Math.random() }))
          .sort((a, b) => a.r - b.r)
          .map((x) => x.id)
      } else {
        this.workflow.turnQueue = this.doctors.filter((d) => d.status === 'active').map((d) => d.id)
      }
    },
    async runDiscussionRound() {
      for (const doctorId of this.workflow.turnQueue) {
        const doctor = this.doctors.find((d) => d.id === doctorId)
        if (!doctor || doctor.status !== 'active') continue

        // 如被暂停，等待恢复
        await this.waitWhilePaused()

        this.workflow.activeTurn = doctorId
        // 提示“正在输入...”，随后在得到回复后移除
        const typingIndex = this.discussionHistory.push({ type: 'system', content: `${doctor.name} 正在输入...` }) - 1
        const systemPrompt = doctor.customPrompt || this.settings.globalSystemPrompt
        const fullPrompt = buildFullPrompt(systemPrompt, this.patientCase, this.discussionHistory)
        try {
          const providerHistory = formatHistoryForProvider(this.discussionHistory, this.patientCase)
          const response = await callAI(doctor, fullPrompt, providerHistory)

          // 移除“正在输入...”提示
          this.discussionHistory.splice(typingIndex, 1)

          // 先插入空内容的医生气泡，然后打字机式填充
          const msg = { type: 'doctor', doctorId: doctor.id, doctorName: doctor.name, content: '' }
          this.discussionHistory.push(msg)
          const messageIndex = this.discussionHistory.length - 1

          for (let i = 0; i < response.length; i++) {
            await this.waitWhilePaused()
            this.discussionHistory[messageIndex].content += response[i]
            await delay(15)
          }

          this.workflow.activeTurn = null
        } catch (e) {
          this.workflow.activeTurn = null
          // 确保提示被移除
          try { this.discussionHistory.splice(typingIndex, 1) } catch (err) {}
          this.discussionHistory.push({
            type: 'doctor',
            doctorId: doctor.id,
            doctorName: doctor.name,
            content: `调用 ${doctor.name} 失败: ${e.message || e}`
          })
        }
      }
      this.workflow.phase = 'voting'
      this.discussionHistory.push({ type: 'system', content: '本轮发言结束，医生团队正在投票...' })
      await this.autoVoteAndProceed()
    },
    // 控制暂停/恢复
    pause() { this.workflow.paused = true },
    resume() { this.workflow.paused = false },
    togglePause() { this.workflow.paused = !this.workflow.paused },

    async waitWhilePaused() {
      while (this.workflow.paused) {
        await delay(100)
      }
    },

    async autoVoteAndProceed() {
      // 使用模型驱动的自动投票（允许投自己）
      this.resetVotes()
      this.lastRoundVotes = []

      function parseVoteJSON(text) {
        if (!text || typeof text !== 'string') return null
        // 尝试截取第一个 { 到最后一个 }
        const start = text.indexOf('{')
        const end = text.lastIndexOf('}')
        if (start !== -1 && end !== -1 && end > start) {
          const candidate = text.slice(start, end + 1)
          try {
            return JSON.parse(candidate)
          } catch (e) {
            // 尝试简单修复：将单引号替换为双引号
            try {
              const fixed = candidate.replace(/'/g, '"')
              return JSON.parse(fixed)
            } catch (e2) {
              return null
            }
          }
        }
        return null
      }

      const activeDocs = this.doctors.filter((d) => d.status === 'active')
      const activeIds = activeDocs.map((d) => d.id)

      for (const voterDoc of activeDocs) {
        await this.waitWhilePaused()
        let targetId = null
        let reason = ''

        try {
          // 如果无 API Key，则使用确定性的回退策略：自投
          if (!voterDoc.apiKey) {
            targetId = voterDoc.id
            reason = '模拟模式：自评其方案需进一步论证，投给自己。'
          } else {
            const systemPrompt = voterDoc.customPrompt || this.settings.globalSystemPrompt
            const fullPrompt = buildVotePrompt(systemPrompt, this.patientCase, this.discussionHistory, activeDocs, voterDoc)
            const providerHistory = formatHistoryForProvider(this.discussionHistory, this.patientCase)
            const response = await callAI(voterDoc, fullPrompt, providerHistory)
            const parsed = parseVoteJSON(response)
            if (parsed && typeof parsed.targetDoctorId === 'string') {
              targetId = parsed.targetDoctorId
              reason = String(parsed.reason || '').trim() || '综合讨论后做出的判断。'
            }
          }
        } catch (e) {
          // 忽略错误，使用回退
        }

        if (!targetId || !activeIds.includes(targetId)) {
          // 若解析失败或模型选择了不在列表中的ID，回退为自投
          targetId = voterDoc.id
          if (!reason) reason = '解析失败：默认投给自己。'
        }

        const targetDoc = this.doctors.find((d) => d.id === targetId)

        this.lastRoundVotes.push({
          round: this.workflow.currentRound,
          voterId: voterDoc?.id,
          voterName: voterDoc?.name,
          targetId: targetDoc?.id,
          targetName: targetDoc?.name,
          reason
        })

        this.discussionHistory.push({
          type: 'vote_detail',
          voterId: voterDoc?.id,
          voterName: voterDoc?.name,
          targetId: targetDoc?.id,
          targetName: targetDoc?.name,
          reason
        })

        this.voteForDoctor(targetId)
        await delay(50)
      }
      await delay(200)
      await this.confirmVote()
    },

    voteForDoctor(doctorId) {
      this.doctors = this.doctors.map((d) => (d.id === doctorId ? { ...d, votes: d.votes + 1 } : d))
    },
    async confirmVote() {
      const result = this.tallyVotes()
      this.discussionHistory.push({ type: 'vote_result', content: result.message })
      const ended = this.checkEndConditions(result.eliminated)
      if (!ended) {
        this.resetVotes()
        this.workflow.currentRound += 1
        this.discussionHistory.push({ type: 'system', content: `第 ${this.workflow.currentRound} 轮会诊开始` })
        this.workflow.phase = 'discussion'
        this.generateTurnQueue()
        await this.runDiscussionRound()
      }
    },
    async generateFinalSummary(preferredDoctorId) {
      try {
        const activeDocs = this.doctors.filter((d) => d.status === 'active')
        const summarizer = preferredDoctorId ? this.doctors.find((d) => d.id === preferredDoctorId) : (activeDocs[0] || this.doctors[0] || null)
        if (!summarizer) return
        const usedPrompt = this.settings.summaryPrompt || '请根据完整会诊内容，以临床医生口吻输出最终总结：包含核心诊断、依据、鉴别诊断、检查建议、治疗建议、随访计划和风险提示。'
        this.finalSummary = { status: 'pending', doctorId: summarizer.id, doctorName: summarizer.name, content: '', usedPrompt }
        const fullPrompt = buildFinalSummaryPrompt(usedPrompt, this.patientCase, this.discussionHistory)
        const providerHistory = formatHistoryForProvider(this.discussionHistory, this.patientCase)
        const response = await callAI(summarizer, fullPrompt, providerHistory)
        this.finalSummary = { status: 'ready', doctorId: summarizer.id, doctorName: summarizer.name, content: response, usedPrompt }
      } catch (e) {
        this.finalSummary = { ...(this.finalSummary || {}), status: 'error', content: `生成总结失败：${e?.message || e}` }
      }
    },
    tallyVotes() {
      const activeOrElim = this.doctors.filter((d) => d.status === 'active')
      const maxVotes = Math.max(0, ...activeOrElim.map((d) => d.votes))
      const top = activeOrElim.filter((d) => d.votes === maxVotes)
      if (top.length !== 1 || maxVotes === 0) {
        this.workflow.roundsWithoutElimination += 1
        return { eliminated: null, message: '投票结束：因平票或无人投票，本轮无人淘汰。' }
      }
      const target = top[0]
      this.doctors = this.doctors.map((d) => (d.id === target.id ? { ...d, status: 'eliminated' } : d))
      this.workflow.roundsWithoutElimination = 0
      return { eliminated: target, message: `投票结束：${target.name} 被淘汰。` }
    },
    checkEndConditions(eliminated) {
      const activeCount = this.doctors.filter((d) => d.status === 'active').length
      if (this.workflow.roundsWithoutElimination >= this.settings.maxRoundsWithoutElimination) {
        this.workflow.phase = 'finished'
        this.discussionHistory.push({ type: 'system', content: '达到无淘汰轮数上限，会诊结束。' })
        // 无单一胜者时也需要输出最终总结，默认由首位在席医生生成
        this.generateFinalSummary()
        return true
      }
      if (activeCount <= 1) {
        this.workflow.phase = 'finished'
        if (activeCount === 1) {
          const winner = this.doctors.find((d) => d.status === 'active')
          this.discussionHistory.push({ type: 'system', content: `会诊结束：${winner?.name || ''} 获胜。` })
          this.generateFinalSummary(winner?.id)
        } else {
          this.discussionHistory.push({ type: 'system', content: '会诊结束：无存活医生。' })
          this.generateFinalSummary()
        }
        return true
      }
      this.workflow.phase = 'voting'
      return false
    }
  }
})
