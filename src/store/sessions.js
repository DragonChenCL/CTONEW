import { defineStore } from 'pinia'
import { useConsultStore } from './index'

function nowISOString() {
  return new Date().toISOString()
}

function statusText(phase) {
  switch (phase) {
    case 'setup':
      return '配置/准备'
    case 'discussion':
      return '讨论中'
    case 'voting':
      return '评估中'
    case 'finished':
      return '已结束'
    default:
      return String(phase || '未知')
  }
}

const META_KEY = 'consult_sessions_meta'
const CURRENT_KEY = 'consult_sessions_current'

function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr
    return []
  } catch (e) {
    return []
  }
}

function saveMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

function saveCurrentId(id) {
  localStorage.setItem(CURRENT_KEY, id || '')
}

function loadCurrentId() {
  return localStorage.getItem(CURRENT_KEY) || ''
}

function dataKey(id) {
  return `consult_session_data_${id}`
}

function loadData(id) {
  try {
    const raw = localStorage.getItem(dataKey(id))
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

function saveData(id, data) {
  localStorage.setItem(dataKey(id), JSON.stringify(data))
}

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [], // [{id, name, status, createdAt, updatedAt}]
    currentId: ''
  }),
  getters: {
    current(state) {
      return state.sessions.find((s) => s.id === state.currentId) || null
    }
  },
  actions: {
    init() {
      this.sessions = loadMeta()
      this.currentId = loadCurrentId()
      if (!this.sessions.length) {
        const id = this.createNew('新建问诊')
        this.switchTo(id)
      } else if (!this.currentId || !this.sessions.find((s) => s.id === this.currentId)) {
        this.switchTo(this.sessions[0].id)
      } else {
        this.switchTo(this.currentId)
      }
    },
    createNew(name) {
      const id = `consult-${Date.now()}`
      const ts = nowISOString()
      const meta = { id, name: name || '未命名问诊', status: '配置/准备', createdAt: ts, updatedAt: ts }
      this.sessions.unshift(meta)
      saveMeta(this.sessions)
      saveData(id, {
        settings: undefined,
        doctors: undefined,
        patientCase: { name: '', age: null, pastHistory: '', currentProblem: '', imageRecognitionResult: '' },
        workflow: { phase: 'setup', currentRound: 0, roundsWithoutElimination: 0, activeTurn: null, turnQueue: [], paused: false },
        discussionHistory: [],
        finalSummary: { status: 'idle', doctorId: null, doctorName: '', content: '', usedPrompt: '' }
      })
      return id
    },
    rename(id, newName) {
      this.sessions = this.sessions.map((s) => (s.id === id ? { ...s, name: newName, updatedAt: nowISOString() } : s))
      saveMeta(this.sessions)
    },
    remove(id) {
      this.sessions = this.sessions.filter((s) => s.id !== id)
      saveMeta(this.sessions)
      try {
        localStorage.removeItem(dataKey(id))
      } catch (e) {}
      if (this.currentId === id) {
        const next = this.sessions[0]
        if (next) {
          this.switchTo(next.id)
        } else {
          const nid = this.createNew('新建问诊')
          this.switchTo(nid)
        }
      }
    },
    switchTo(id) {
      const meta = this.sessions.find((s) => s.id === id)
      if (!meta) return
      this.currentId = id
      saveCurrentId(id)
      const payload = loadData(id)
      const consult = useConsultStore()
      if (payload && typeof payload === 'object') {
        if (payload.settings) consult.settings = payload.settings
        if (payload.doctors) consult.doctors = payload.doctors
        if (payload.patientCase) consult.setPatientCase(payload.patientCase)
        if (payload.workflow) consult.workflow = payload.workflow
        if (payload.discussionHistory) consult.discussionHistory = payload.discussionHistory
        if (payload.finalSummary) consult.finalSummary = payload.finalSummary
      } else {
        consult.settings = consult.settings // keep defaults
        consult.doctors = consult.doctors // keep defaults
        consult.setPatientCase({ name: '', age: null, pastHistory: '', currentProblem: '', imageRecognitionResult: '' })
        consult.workflow = { phase: 'setup', currentRound: 0, roundsWithoutElimination: 0, activeTurn: null, turnQueue: [], paused: false }
        consult.discussionHistory = []
        consult.finalSummary = { status: 'idle', doctorId: null, doctorName: '', content: '', usedPrompt: '' }
      }
    },
    saveSnapshotFromConsult() {
      if (!this.currentId) return
      const consult = useConsultStore()
      const snapshot = JSON.parse(JSON.stringify(consult.$state))
      saveData(this.currentId, snapshot)
      const status = statusText(consult.workflow?.phase)
      this.sessions = this.sessions.map((s) => (s.id === this.currentId ? { ...s, status, updatedAt: nowISOString() } : s))
      saveMeta(this.sessions)
    },
    exportJSON(id) {
      const payload = loadData(id)
      const meta = this.sessions.find((s) => s.id === id)
      return JSON.stringify({ meta, data: payload }, null, 2)
    }
  }
})
