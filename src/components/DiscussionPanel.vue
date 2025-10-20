<template>
  <div>
    <CaseInputForm v-if="store.workflow.phase === 'setup'" />
    <div v-else class="chat-wrapper">
      <div class="controls" v-if="store.workflow.phase === 'discussion'">
        <a-button @click="togglePause">{{ store.workflow.paused ? '继续' : '暂停' }}</a-button>
      </div>
      <ChatDisplay :history="store.discussionHistory" :active-id="store.workflow.activeTurn" />
    </div>
  </div>
</template>

<script setup>
import { useConsultStore } from '../store'
import CaseInputForm from './CaseInputForm.vue'
import ChatDisplay from './ChatDisplay.vue'

const store = useConsultStore()

function togglePause() {
  store.togglePause()
}
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 128px);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}
.controls {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px;
  background: #fff;
  border-radius: 8px 8px 0 0;
}
</style>
