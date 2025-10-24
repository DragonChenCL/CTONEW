<template>
  <div ref="containerRef" class="chat-display">
    <div v-for="(item, idx) in history" :key="idx" class="chat-item fade-in">
      <template v-if="item.type === 'system'">
        <div class="system-msg">{{ item.content }}</div>
      </template>
      <template v-else-if="item.type === 'doctor'">
        <div class="doctor-msg">
          <div class="avatar" :style="{ background: getDoctorColor(item.doctorId) }">{{ initials(item.doctorName) }}</div>
          <div class="bubble doctor" :style="{ 
            background: getDoctorBubbleColor(item.doctorId),
            borderColor: getDoctorBorderColor(item.doctorId)
          }">
            <div class="name" :style="{ color: getDoctorNameColor(item.doctorId) }">{{ item.doctorName }}</div>
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
          <span class="badge">评估</span>
          <span class="text">
            {{ item.voterName }} 标注 {{ item.targetName }} 为不太准确：{{ item.reason }}
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

const doctorPalette = [
  { avatar: '#2f54eb', bubble: '#f0f5ff', border: '#adc6ff', name: '#1d39c4' },
  { avatar: '#08979c', bubble: '#e6fffb', border: '#87e8de', name: '#006d75' },
  { avatar: '#d46b08', bubble: '#fff7e6', border: '#ffd591', name: '#ad4e00' },
  { avatar: '#531dab', bubble: '#f9f0ff', border: '#d3adf7', name: '#391085' },
  { avatar: '#237804', bubble: '#f6ffed', border: '#b7eb8f', name: '#1a4f08' },
  { avatar: '#a8071a', bubble: '#fff1f0', border: '#ffccc7', name: '#820014' }
]

function paletteIndex(doctorId) {
  const str = doctorId || ''
  if (!str) return 0
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % doctorPalette.length
}

function getDoctorTheme(doctorId) {
  return doctorPalette[paletteIndex(doctorId)]
}

function getDoctorColor(doctorId) {
  return getDoctorTheme(doctorId).avatar
}

function getDoctorBubbleColor(doctorId) {
  return getDoctorTheme(doctorId).bubble
}

function getDoctorBorderColor(doctorId) {
  return getDoctorTheme(doctorId).border
}

function getDoctorNameColor(doctorId) {
  return getDoctorTheme(doctorId).name
}

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
  height: 100%;
  overflow-y: auto;
  padding: 12px;
  background: linear-gradient(180deg, #f9fbff 0%, #f6f9ff 100%);
  border-radius: 8px 8px 0 0;
  scrollbar-width: thin;
}

.chat-display::-webkit-scrollbar {
  width: 6px;
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
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border-width: 1.5px;
  border-style: solid;
  transition: all 0.2s ease;
}
.bubble:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.bubble.patient { background: #e6f7ff; border-color: #91d5ff; }
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
