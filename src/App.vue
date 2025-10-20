<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="background:#fff; display:flex; align-items:center; justify-content:space-between; padding: 0 16px; border-bottom:1px solid #f0f0f0;">
      <div style="font-size:18px; font-weight:600;">AI 医疗会诊面板</div>
      <div>
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
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import DiscussionPanel from './components/DiscussionPanel.vue'
import StatusPanel from './components/StatusPanel.vue'
import SettingsModal from './components/SettingsModal.vue'

const settingsOpen = ref(false)
const openSettings = () => {
  settingsOpen.value = true
}

function handleOpenSettings() {
  settingsOpen.value = true
}

onMounted(() => {
  window.addEventListener('open-settings', handleOpenSettings)
})

onBeforeUnmount(() => {
  window.removeEventListener('open-settings', handleOpenSettings)
})
</script>

<style>
html, body, #app { height: 100%; }
</style>
