<template>
  <a-drawer v-model:open="open" title="问诊列表" width="940">
    <div style="margin-bottom: 12px; display:flex; gap:8px;">
      <a-button type="primary" @click="onCreate">新建问诊</a-button>
      <a-button type="dashed" @click="saveNow">保存当前</a-button>
      <a-popconfirm title="确认删除当前问诊？" @confirm="onDeleteCurrent">
        <a-button danger>删除当前</a-button>
      </a-popconfirm>
    </div>
    <a-table :data-source="rows" :columns="columns" :pagination="false" row-key="id" :row-class-name="rowClassName" />
  </a-drawer>
</template>

<script setup>
import { ref, computed, h, watch } from 'vue'
import { Button, Popconfirm, Tag, Tooltip } from 'ant-design-vue'
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

function onDeleteCurrent() {
  sessions.remove(sessions.currentId)
}

const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
    customRender: ({ record }) => {
      const text = record.name + (record.current ? '（当前）' : '')
      return h(
        Tooltip,
        { placement: 'topLeft', title: text },
        {
          default: () =>
            h(
              'span',
              {
                style: {
                  display: 'inline-block',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              },
              { default: () => text }
            )
        }
      )
    }
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }) => {
      const colorMap = { '配置/准备': 'blue', '讨论中': 'green', '评估中': 'orange', '已结束': 'default' }
      const color = colorMap[text] || 'default'
      return h(Tag, { color }, { default: () => text })
    }
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 170,
    customRender: ({ record }) => {
      const d = new Date(record.updatedAt)
      if (isNaN(d.getTime())) return record.updatedAt
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 350,
    customRender: ({ record }) => {
      const isCurrent = !!record.current
      return h(
        'div',
        { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        [
          h(
            Button,
            { type: 'primary', ghost: isCurrent, size: 'small', onClick: () => onOpen(record.id) },
            { default: () => '打开' }
          ),
          h(
            Button,
            { size: 'small', onClick: () => onRename(record.id) },
            { default: () => '重命名' }
          ),
          h(
            Button,
            { type: 'dashed', size: 'small', onClick: () => onExport(record.id) },
            { default: () => '导出 JSON' }
          ),
          h(
            Popconfirm,
            { title: '确认删除该问诊？', onConfirm: () => onDelete(record.id) },
            { default: () => h(Button, { danger: true, size: 'small' }, { default: () => '删除' }) }
          )
        ]
      )
    }
  }
]

function rowClassName(record) {
  return record.current ? 'current-row' : ''
}
</script>

<style scoped>
:deep(.current-row) td {
  background: #f6ffed !important;
}
</style>
