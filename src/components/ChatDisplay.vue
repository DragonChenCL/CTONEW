<template>
  <div ref="containerRef" class="chat-display">
    <div v-for="(item, idx) in history" :key="idx" class="chat-item fade-in">
      <template v-if="item.type === 'system'">
        <div class="system-msg">{{ item.content }}</div>
      </template>
      <template v-else-if="item.type === 'doctor'">
        <div class="doctor-msg">
          <div class="avatar">{{ initials(item.doctorName) }}</div>
          <div class="bubble doctor">
            <div class="name">{{ item.doctorName }}</div>
            <div class="content" v-html="renderMarkdown(item.content)"></div>
          </div>
        </div>
      </template>
      <template v-else-if="item.type === 'patient'">
        <div class="patient-msg">
          <div class="bubble patient">
            <div class="name">{{ item.author || '患者' }}</div>
            <div class="content" v-html="renderMarkdown(item.content)" />
          </div>
          <div class="avatar patient">患</div>
        </div>
      </template>
      <template v-else-if="item.type === 'vote_detail'">
        <div class="vote-detail">
          <span class="badge">投票</span>
          <span class="text">
            {{ item.voterName }} 投票淘汰 {{ item.targetName }}：{{ item.reason }}
          </span>
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

// 打字机模式下，内容长度变化也应滚动到底部
watch(
  () => props.history.map((i) => (i && i.type === 'doctor' ? (i.content || '').length : 0)).join(','),
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
  background: #fafafa;
  border-radius: 8px 8px 0 0;
}
.chat-item {
  animation: fadeInUp 0.25s ease;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
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
.patient-msg {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  justify-content: flex-end;
}
.avatar {
  background: #1677ff;
  color: #fff;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}
.avatar.patient { background: #13c2c2; }
.bubble {
  padding: 8px 12px;
  border-radius: 10px;
  max-width: 70%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.bubble.doctor { background: #f6ffed; border: 1px solid #b7eb8f; }
.bubble.patient { background: #e6f7ff; border: 1px solid #91d5ff; }
.name {
  font-weight: 600;
  color: #555;
  margin-bottom: 4px;
}
.content :deep(p) {
  margin: 0;
}
.vote-detail {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff7e6;
  color: #ad6800;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 6px 10px;
  margin: 8px auto;
  width: fit-content;
}
.badge {
  background: #fa8c16;
  color: #fff;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
}
</style>
