<template>
  <a-drawer v-model:open="open" title="问诊列表" width="720">
    <div style="margin-bottom: 12px; display:flex; gap:8px;">
      <a-button type="primary" @click="onCreate">新建问诊</a-button>
      <a-button @click="saveNow">保存当前</a-button>
    </div>
    <a-table :data-source="rows" :columns="columns" :pagination="false" row-key="id" />
  </a-drawer>
</template>

<script setup>
import { ref, computed, h, watch } from 'vue'
import { useSessionsStore } from '../store/sessions'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])
const open = ref(props.open)
watch(
  () => props.open,
  (v) => (open.value = v)
)
watch(open, (v) => emit('update:open', v))

const sessions = useSessionsStore()

const rows = computed(() => {
  return sessions.sessions.map((s) => ({
    ...s,
    current: sessions.currentId === s.id
  }))
})

function onCreate() {
  const id = sessions.createNew('新建问诊')
  sessions.switchTo(id)
}

function saveNow() {
  sessions.saveSnapshotFromConsult()
}

function onOpen(id) {
  sessions.switchTo(id)
}

function onRename(id) {
  const name = prompt('请输入新的问诊名称：')
  if (name && name.trim()) sessions.rename(id, name.trim())
}

function onDelete(id) {
  sessions.remove(id)
}

function onExport(id) {
  const json = sessions.exportJSON(id)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const columns = [
  { title: '名称', dataIndex: 'name', key: 'name', customRender: ({ record }) => record.name + (record.current ? '（当前）' : '') },
  { title: '状态', dataIndex: 'status', key: 'status', width: 120 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 200 },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    customRender: ({ record }) => {
      return h(
        'div',
        { style: { display: 'flex', gap: '8px' } },
        [
          h(
            'a-button',
            { type: 'link', onClick: () => onOpen(record.id) },
            { default: () => '打开' }
          ),
          h(
            'a-button',
            { type: 'link', onClick: () => onRename(record.id) },
            { default: () => '重命名' }
          ),
          h(
            'a-button',
            { type: 'link', onClick: () => onExport(record.id) },
            { default: () => '导出 JSON' }
          ),
          h(
            'a-popconfirm',
            { title: '确认删除该问诊？', onConfirm: () => onDelete(record.id) },
            { default: () => h('a-button', { type: 'link', danger: true }, { default: () => '删除' }) }
          )
        ]
      )
    }
  }
]
</script>
