<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="background:#fff; display:flex; align-items:center; justify-content:space-between; padding: 0 16px; border-bottom:1px solid #f0f0f0;">
      <div style="font-size:18px; font-weight:600;">AI 医疗会诊面板</div>
      <div style="display:flex; gap:8px;">
        <a-button @click="openSessions">问诊列表</a-button>
        <a-button type="primary" @click="openSettings">设置</a-button>
      </div>
    </a-layout-header>
    <a-layout>
      <a-layout-content style="padding: 16px;">
        <a-row :gutter="16">
          <a-col :span="16">
            <DiscussionPanel />
          </a-col>
          <a-col :span="8">
            <StatusPanel @open-settings="openSettings" />
          </a-col>
        </a-row>
      </a-layout-content>
    </a-layout>
  </a-layout>
  <SettingsModal v-model:open="settingsOpen" />
  <SessionListDrawer v-model:open="sessionsOpen" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import DiscussionPanel from './components/DiscussionPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import SessionListDrawer from './components/SessionListDrawer.vue'
import { useConsultStore } from './store'
import { useSessionsStore } from './store/sessions'

const settingsOpen = ref(false)
const sessionsOpen = ref(false)

const openSettings = () => {
  settingsOpen.value = true
}
const openSessions = () => {
  sessionsOpen.value = true
}

function handleOpenSettings() {
  settingsOpen.value = true
}

const consult = useConsultStore()
const sessions = useSessionsStore()
let saveTimer = null

onMounted(() => {
  window.addEventListener('open-settings', handleOpenSettings)
  // 初始化问诊列表并切换到当前问诊
  sessions.init()
  // 监听咨询状态变更并自动保存到本地
  watch(
    () => consult.$state,
    () => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => sessions.saveSnapshotFromConsult(), 500)
    },
    { deep: true }
  )
})

onBeforeUnmount(() => {
  window.removeEventListener('open-settings', handleOpenSettings)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style>
html, body, #app { height: 100%; }
</style>
