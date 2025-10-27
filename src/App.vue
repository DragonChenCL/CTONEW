<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="background:#fff; display:flex; align-items:center; justify-content:space-between; padding: 0 16px; border-bottom:1px solid #f0f0f0;">
      <div style="display:flex; align-items:center; gap:8px;">
        <img :src="logoUrl" alt="AI 医疗会诊面板 Logo" style="width:28px; height:28px;" />
        <span style="font-size:18px; font-weight:600;">AI 医疗会诊面板</span>
        <span style="font-size:18px; font-weight:600;color:#ff4d4f;">【本内容仅供参考，身体不适尽早就医】</span>
      </div>
      <div style="display:flex; gap:8px;">
        <a-button @click="openSessions">问诊列表</a-button>
        <a-button @click="openGlobalSettings">全局设置</a-button>
        <a-button type="primary" @click="openConsultationSettings">问诊设置</a-button>
      </div>
    </a-layout-header>
    <a-layout>
      <a-layout-content style="padding: 16px; height: calc(100vh - 64px); overflow: hidden;">
        <!-- <a-alert
          type="warning"
          show-icon
          message="【本内容仅供参考，身体不适尽早就医】"
          style="margin-bottom: 12px;"
        /> -->
        <a-row :gutter="16" align="stretch" style="height: 100%;">
          <a-col :span="16" style="height: 100%;">
            <DiscussionPanel class="discussion-panel-host" />
          </a-col>
          <a-col :span="8" style="height: 100%;">
            <StatusPanel class="status-panel-host" @open-settings="openConsultationSettings" />
          </a-col>
        </a-row>
      </a-layout-content>
    </a-layout>
  </a-layout>
  <GlobalSettingsModal v-model:open="globalSettingsOpen" />
  <ConsultationSettingsModal v-model:open="consultationSettingsOpen" />
  <SessionListDrawer v-model:open="sessionsOpen" />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import DiscussionPanel from './components/DiscussionPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import GlobalSettingsModal from './components/GlobalSettingsModal.vue'
import ConsultationSettingsModal from './components/ConsultationSettingsModal.vue'
import SessionListDrawer from './components/SessionListDrawer.vue'
import { useConsultStore } from './store'
import { useSessionsStore } from './store/sessions'
import logoUrl from './assets/logo.svg'

const globalSettingsOpen = ref(false)
const consultationSettingsOpen = ref(false)
const sessionsOpen = ref(false)

const openGlobalSettings = () => {
  globalSettingsOpen.value = true
}
const openConsultationSettings = () => {
  consultationSettingsOpen.value = true
}
const openSessions = () => {
  sessionsOpen.value = true
}

function handleOpenConsultationSettings() {
  consultationSettingsOpen.value = true
}

function handleOpenGlobalSettings() {
  globalSettingsOpen.value = true
}

const consult = useConsultStore()
const sessions = useSessionsStore()
let saveTimer = null

onMounted(() => {
  window.addEventListener('open-settings', handleOpenConsultationSettings)
  window.addEventListener('open-global-settings', handleOpenGlobalSettings)
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
  window.removeEventListener('open-settings', handleOpenConsultationSettings)
  window.removeEventListener('open-global-settings', handleOpenGlobalSettings)
  if (saveTimer) clearTimeout(saveTimer)
})
</script>

<style>
html, body, #app { height: 100%; }

.discussion-panel-host,
.status-panel-host {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Custom scrollbar styles */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #bfbfbf;
  border-radius: 3px;
  transition: background 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #8c8c8c;
}
</style>
