<template>
  <div>
    <div style="font-weight: 600; margin-bottom: 8px;">标记统计</div>
    <a-table :pagination="false" :data-source="data" :columns="columns" size="small" row-key="id" />

    <div v-if="votes && votes.length" style="margin-top: 12px;">
      <div style="font-weight: 600; margin-bottom: 6px;">标记详情</div>
      <a-list :data-source="votes" :renderItem="renderVote" size="small" />
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({ doctors: { type: Array, default: () => [] }, votes: { type: Array, default: () => [] } })

const data = computed(() => props.doctors)
const votes = computed(() => props.votes)

const columns = [
  { title: '医生', dataIndex: 'name', key: 'name' },
  { title: '标记数', dataIndex: 'votes', key: 'votes', width: 80 }
]

function renderVote({ item }) {
  return h('div', { style: { fontSize: '12px', color: '#8c8c8c' } }, `${item.voterName} → ${item.targetName}：${item.reason}`)
}
</script>
