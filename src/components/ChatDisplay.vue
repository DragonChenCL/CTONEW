<template>
  <div ref="containerRef" class="chat-display">
    <div v-for="(item, idx) in history" :key="idx" class="chat-item">
      <template v-if="item.type === 'system'">
        <div class="system-msg">{{ item.content }}</div>
      </template>
      <template v-else-if="item.type === 'doctor'">
        <div class="doctor-msg">
          <div class="avatar">{{ initials(item.doctorName) }}</div>
          <div class="bubble">
            <div class="name">{{ item.doctorName }}</div>
            <div class="content" v-html="renderMarkdown(item.content)"></div>
          </div>
        </div>
      </template>
      <template v-else-if="item.type === 'vote_result'">
        <div class="system-msg vote">{{ item.content }}</div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  history: { type: Array, default: () => [] },
  activeId: { type: String, default: null }
})

const containerRef = ref(null)

watch(
  () => props.history.length,
  async () => {
    await nextTick()
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  }
)

function renderMarkdown(text) {
  try {
    return marked.parse(text || '')
  } catch (e) {
    return text
  }
}

function initials(name) {
  if (!name) return 'Dr'
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}
</script>

<style scoped>
.chat-display {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
  border-radius: 8px 8px 0 0;
}
.system-msg {
  text-align: center;
  color: #8c8c8c;
  margin: 12px 0;
}
.system-msg.vote {
  color: #fa8c16;
}
.doctor-msg {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.avatar {
  background: #1890ff;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.bubble {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 100%;
}
.name {
  font-weight: 600;
  margin-bottom: 4px;
}
.content :deep(p) {
  margin: 0;
}
</style>
