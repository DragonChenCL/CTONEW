import { defineStore } from 'pinia'
import { callAI } from '../api/callAI'
import { buildFullPrompt, formatHistoryForProvider } from '../utils/prompt'

export const useConsultStore = defineStore('consult', {
  state: () => ({
    settings: {
      globalSystemPrompt:
        '你是一位顶级的、经验丰富的临床诊断医生。你的任务是基于提供的患者病历进行分析和诊断。\n\n现在，你正在参与一个多方专家会诊。你会看到其他医生的诊断意见。请综合考虑他们的分析，这可能会启发你，但你必须保持自己独立的专业判断。\n\n你的发言必须遵循以下原则：\n1.  专业严谨: 你的分析必须基于医学知识和病历信息。\n2.  独立思考: 不要为了迎合他人而轻易改变自己的核心观点。如果其他医生的观点是正确的，你可以表示赞同并加以补充；如果观点有误或你持有不同看法，必须明确、有理有据地指出。\n3.  目标导向: 会诊的唯一目标是为患者找到最佳的解决方案。\n4.  简洁清晰: 直接陈述你的核心诊断、分析和建议。\n\n现在，请根据下面的病历和已有的讨论，发表你的看法。',
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
      turnQueue: []
    },
    discussionHistory: []
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
    resetVotes() {
      this.doctors = this.doctors.map((d) => ({ ...d, votes: 0 }))
    },
    startConsultation() {
      if (!this.patientCase.name || !this.patientCase.currentProblem) {
        throw new Error('请填写患者名称和本次问题')
      }
      this.workflow.phase = 'discussion'
      this.workflow.currentRound = 1
      this.workflow.roundsWithoutElimination = 0
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
        this.workflow.activeTurn = doctorId
        this.discussionHistory.push({ type: 'system', content: `${doctor.name} 正在输入...` })
        const systemPrompt = doctor.customPrompt || this.settings.globalSystemPrompt
        const fullPrompt = buildFullPrompt(systemPrompt, this.patientCase, this.discussionHistory)
        try {
          const providerHistory = formatHistoryForProvider(this.discussionHistory)
          const response = await callAI(doctor, fullPrompt, providerHistory)
          this.workflow.activeTurn = null
          this.discussionHistory.push({
            type: 'doctor',
            doctorId: doctor.id,
            doctorName: doctor.name,
            content: response
          })
        } catch (e) {
          this.workflow.activeTurn = null
          this.discussionHistory.push({
            type: 'doctor',
            doctorId: doctor.id,
            doctorName: doctor.name,
            content: `调用 ${doctor.name} 失败: ${e.message || e}`
          })
        }
      }
      this.workflow.phase = 'voting'
      this.discussionHistory.push({ type: 'system', content: '本轮发言结束，请投票选出最不合理的方案。' })
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
        return true
      }
      if (activeCount <= 1) {
        this.workflow.phase = 'finished'
        if (activeCount === 1) {
          const winner = this.doctors.find((d) => d.status === 'active')
          this.discussionHistory.push({ type: 'system', content: `会诊结束：${winner?.name || ''} 获胜。` })
        } else {
          this.discussionHistory.push({ type: 'system', content: '会诊结束：无存活医生。' })
        }
        return true
      }
      this.workflow.phase = 'voting'
      return false
    }
  }
})
