<template>
  <div class="voting">
    <div class="title">请选择本轮你认为不太准确的答案：</div>
    <div class="btns">
      <a-button
        v-for="doc in store.doctors"
        :key="doc.id"
        :type="selected === doc.id ? 'primary' : 'default'"
        :disabled="selected !== null"
        @click="vote(doc.id)"
        :ghost="doc.status === 'eliminated'"
      >
        {{ doc.name }}
      </a-button>
    </div>
    <div v-if="selected" style="margin-top:8px; color:#8c8c8c;">您已标注为不太准确：{{ doctorName(selected) }}</div>
    <div style="margin-top:12px;">
      <a-button type="primary" :disabled="!selected" @click="confirm">确认并进入下一轮</a-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useConsultStore } from '../store'

const store = useConsultStore()
const selected = ref(null)

function vote(id) {
  if (selected.value) return
  selected.value = id
  store.voteForDoctor(id)
}

function confirm() {
  store.confirmVote()
  selected.value = null
}

function doctorName(id) {
  return store.doctors.find((d) => d.id === id)?.name || ''
}
</script>

<style scoped>
.voting {
  background: #fff;
  padding: 8px;
  border-radius: 0 0 8px 8px;
}
.title { margin-bottom: 8px; }
.btns { display: flex; gap: 8px; flex-wrap: wrap; }
</style>
