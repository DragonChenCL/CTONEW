<template>
  <a-modal v-model:open="open" title="问诊设置" width="900px" @ok="onSave" ok-text="保存">
    <a-tabs>
      <a-tab-pane key="consultSettings" tab="问诊参数">
        <a-form layout="vertical">
          <a-alert type="info" show-icon message="问诊参数" description="配置当前问诊的名称与提示词。" style="margin-bottom: 16px;" />
          <a-form-item label="问诊名称">
            <a-input v-model:value="localConsultationName" placeholder="请输入问诊名称" />
          </a-form-item>
          <a-form-item label="当前会诊系统提示词">
            <a-textarea v-model:value="localSettings.globalSystemPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="最终总结提示词">
            <a-textarea v-model:value="localSettings.summaryPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="发言顺序">
            <a-radio-group v-model:value="localSettings.turnOrder">
              <a-radio value="random">随机</a-radio>
              <a-radio value="custom">自定义（按医生列表顺序）</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="连续未标注不太准确的最大轮数">
            <a-input-number v-model:value="localSettings.maxRoundsWithoutElimination" :min="1" />
          </a-form-item>
        </a-form>
      </a-tab-pane>
      <a-tab-pane key="consultDoctors" tab="问诊医生">
        <a-space direction="vertical" style="width: 100%">
          <a-alert type="info" show-icon message="当前问诊医生" description="从全局配置中选择医生加入本次问诊。“在席/不太准确”状态仅属于当前问诊。" />
          <div style="display:flex; gap: 8px;">
            <a-select v-model:value="selectedToAdd" :options="globalDoctorOptions" style="flex:1;" placeholder="选择要添加的医生" />
            <a-button type="primary" @click="addToConsult">添加</a-button>
            <a-button @click="addAllToConsult">添加全部</a-button>
            <a-popconfirm title="确认清空当前问诊医生？" @confirm="clearConsultDoctors">
              <a-button danger>清空</a-button>
            </a-popconfirm>
          </div>
          <a-list :data-source="consultDoctors" :renderItem="renderConsultDoctor" />
        </a-space>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup>
import { ref, watch, h, resolveComponent, computed } from 'vue'
import { useConsultStore } from '../store'
import { useGlobalStore } from '../store/global'
import { useSessionsStore } from '../store/sessions'
import { message } from 'ant-design-vue'

const store = useConsultStore()
const global = useGlobalStore()
const sessions = useSessionsStore()

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])

const open = ref(props.open)
watch(
  () => props.open,
  (v) => (open.value = v)
)
watch(open, (v) => emit('update:open', v))

const localConsultationName = ref(store.consultationName || '')
const localSettings = ref(JSON.parse(JSON.stringify(store.settings)))
const consultDoctors = ref(JSON.parse(JSON.stringify(store.doctors)))
const selectedToAdd = ref(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      localConsultationName.value = store.consultationName || ''
      localSettings.value = JSON.parse(JSON.stringify(store.settings))
      consultDoctors.value = JSON.parse(JSON.stringify(store.doctors))
      selectedToAdd.value = null
    }
  }
)

const providerOptionsMap = computed(() => {
  const map = {}
  const options = [
    { label: 'OpenAI规范', value: 'openai' },
    { label: 'Anthropic规范', value: 'anthropic' },
    { label: 'Gemini规范', value: 'gemini' },
    { label: '硅基流动', value: 'siliconflow' },
    { label: '魔搭社区', value: 'modelscope' }
  ]
  options.forEach((item) => {
    map[item.value] = item.label
  })
  return map
})

const globalDoctorOptions = computed(() => {
  const included = new Set((consultDoctors.value || []).map((d) => d.id))
  return (global.doctors || [])
    .filter((d) => !included.has(d.id))
    .map((d) => ({ label: `${d.name}（${providerOptionsMap.value[d.provider] || d.provider}•${d.model}）`, value: d.id }))
})

function addToConsult() {
  const targetId = selectedToAdd.value
  if (!targetId) return
  const d = (global.doctors || []).find((x) => x.id === targetId)
  if (!d) return
  consultDoctors.value.push({ ...d, status: 'active', votes: 0 })
  selectedToAdd.value = null
}

function addAllToConsult() {
  const included = new Set((consultDoctors.value || []).map((d) => d.id))
  const toAdd = (global.doctors || []).filter((d) => !included.has(d.id))
  consultDoctors.value = consultDoctors.value.concat(toAdd.map((d) => ({ ...d, status: 'active', votes: 0 })))
}

function clearConsultDoctors() {
  consultDoctors.value = []
}

function removeConsultDoctor(id) {
  consultDoctors.value = consultDoctors.value.filter((d) => d.id !== id)
}

function renderConsultDoctor({ item }) {
  const AButton = resolveComponent('a-button')
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' } },
    [
      h('div', [
        h('div', { style: { fontWeight: '600' } }, item.name),
        h('div', { style: { color: '#8c8c8c', fontSize: '12px' } }, `${resolveProviderLabel(item.provider)} • ${item.model}`)
      ]),
      h(
        AButton,
        { type: 'link', danger: true, onClick: () => removeConsultDoctor(item.id) },
        { default: () => '移除' }
      )
    ]
  )
}

function resolveProviderLabel(value) {
  return providerOptionsMap.value[value] || value
}

function onSave() {
  store.setConsultationName(localConsultationName.value)
  store.setSettings(localSettings.value)
  store.setDoctors(consultDoctors.value)
  if (localConsultationName.value.trim() && sessions.currentId) {
    sessions.rename(sessions.currentId, localConsultationName.value.trim())
  }
  message.success('已保存问诊设置')
  open.value = false
}
</script>
