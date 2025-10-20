<template>
  <div>
    <CaseInputForm v-if="store.workflow.phase === 'setup'" />
    <div v-else class="chat-wrapper">
      <ChatDisplay :history="store.discussionHistory" :active-id="store.workflow.activeTurn" />
      <div v-if="store.workflow.phase === 'voting'" class="voting-wrapper">
        <VotingControls />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useConsultStore } from '../store'
import CaseInputForm from './CaseInputForm.vue'
import ChatDisplay from './ChatDisplay.vue'
import VotingControls from './VotingControls.vue'

const store = useConsultStore()
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 128px);
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}
.voting-wrapper {
  border-top: 1px solid #f0f0f0;
  padding: 8px;
}
</style>
