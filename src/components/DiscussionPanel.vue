<template>
  <div>
    <CaseInputForm v-if="store.workflow.phase === 'setup'" />
    <div v-else class="chat-wrapper">
      <div class="controls">
        <div style="display:flex; justify-content: space-between; align-items:center;">
          <div style="color:#8c8c8c; font-size:12px;">
            当前阶段：{{ store.workflow.phase === 'discussion' ? '讨论中' : (store.workflow.phase === 'voting' ? '评估中' : (store.workflow.phase === 'finished' ? '已结束' : store.workflow.phase)) }}
          </div>
          <div>
            <a-button size="small" v-if="store.workflow.phase === 'discussion'" @click="togglePause">{{ store.workflow.paused ? '继续' : '暂停' }}</a-button>
          </div>
        </div>
      </div>
      <ChatDisplay :history="store.discussionHistory" :active-id="store.workflow.activeTurn" />
      <div class="chat-input">
        <a-input-search
          v-model:value="input"
          placeholder="我想补充一些情况，按回车发送..."
          enter-button="发送"
          :disabled="!canInput"
          @search="onSend"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useConsultStore } from '../store'
import CaseInputForm from './CaseInputForm.vue'
import ChatDisplay from './ChatDisplay.vue'

const store = useConsultStore()
const input = ref('')
const canInput = computed(() => store.workflow.phase !== 'setup')

function togglePause() {
  store.togglePause()
}

function onSend() {
  const text = input.value.trim()
  if (!text) return
  store.addPatientMessage(text)
  input.value = ''
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
.chat-input {
  border-top: 1px solid #f0f0f0;
  padding: 8px;
  background: #fff;
  border-radius: 0 0 8px 8px;
}
</style>
