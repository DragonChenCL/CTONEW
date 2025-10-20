<template>
  <div>
    <div style="font-weight: 600; margin-bottom: 8px;">票数统计</div>
    <a-table :pagination="false" :data-source="data" :columns="columns" size="small" row-key="id" />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ doctors: { type: Array, default: () => [] } })

const data = computed(() => props.doctors)

const columns = [
  { title: '医生', dataIndex: 'name', key: 'name' },
  { title: '票数', dataIndex: 'votes', key: 'votes', width: 80 }
]
</script>
