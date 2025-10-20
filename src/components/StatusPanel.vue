<template>
  <a-card title="状态面板" :bordered="false">
    <a-descriptions size="small" bordered :column="1" style="margin-bottom: 12px;">
      <a-descriptions-item label="阶段">{{ phaseText }}</a-descriptions-item>
      <a-descriptions-item label="当前轮次">{{ store.workflow.currentRound }}</a-descriptions-item>
      <a-descriptions-item label="无淘汰轮数">{{ store.workflow.roundsWithoutElimination }}</a-descriptions-item>
    </a-descriptions>

    <DoctorList :doctors="store.doctors" />

    <template v-if="store.workflow.phase === 'voting'">
      <div style="margin-top: 16px;">
        <VoteTally :doctors="store.doctors" />
      </div>
    </template>

    <div style="margin-top: 16px; display:flex; gap: 8px;">
      <a-button @click="$emit('open-settings')">配置</a-button>
      <a-popconfirm title="确认重置流程？" @confirm="resetAll">
        <a-button danger>重置</a-button>
      </a-popconfirm>
    </div>
  </a-card>
</template>

<script setup>
import { computed } from 'vue'
import { useConsultStore } from '../store'
import DoctorList from './DoctorList.vue'
import VoteTally from './VoteTally.vue'

const store = useConsultStore()

const phaseText = computed(() => {
  switch (store.workflow.phase) {
    case 'setup':
      return '配置/准备'
    case 'discussion':
      return '讨论中'
    case 'voting':
      return '投票中'
    case 'finished':
      return '已结束'
    default:
      return store.workflow.phase
  }
})

function resetAll() {
  // 重置流程并恢复所有医生为在席
  store.workflow = { phase: 'setup', currentRound: 0, roundsWithoutElimination: 0, activeTurn: null, turnQueue: [], paused: false }
  store.doctors = store.doctors.map((d) => ({ ...d, status: 'active', votes: 0 }))
  store.discussionHistory = []
}
</script>
