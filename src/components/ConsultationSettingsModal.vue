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
      <a-tab-pane key="linkedConsultations" tab="关联问诊">
        <a-space direction="vertical" style="width: 100%">
          <a-alert type="info" show-icon message="关联问诊" description="可以从已结束的问诊中选择关联问诊，作为医生诊断的参考上下文。多选的问诊必须具有相同的患者名称、性别、年龄。" />
          <div style="display:flex; gap: 8px;">
            <a-select 
              v-model:value="selectedLinkedIds" 
              mode="multiple"
              :options="finishedConsultationOptions" 
              style="flex:1;" 
              placeholder="选择已结束的问诊（可多选）"
              :filter-option="filterLinkedOption"
              @change="handleLinkedChange"
            />
            <a-popconfirm title="确认清空关联问诊？" @confirm="clearLinkedConsultations">
              <a-button danger>清空</a-button>
            </a-popconfirm>
          </div>
          <div v-if="linkedConsultations.length > 0" style="margin-top: 12px;">
            <a-list :data-source="linkedConsultations" :renderItem="renderLinkedConsultation" />
          </div>
          <div v-else style="color: #8c8c8c; text-align: center; padding: 20px;">
            暂无关联问诊
          </div>
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
const linkedConsultations = ref(JSON.parse(JSON.stringify(store.linkedConsultations || [])))
const selectedToAdd = ref(null)
const selectedLinkedIds = ref((store.linkedConsultations || []).map((item) => item.sourceId || item.id?.replace(/^linked-/, '') || item.id))
const previousValidLinkedIds = ref([...selectedLinkedIds.value])

watch(
  () => props.open,
  (v) => {
    if (v) {
      localConsultationName.value = store.consultationName || ''
      localSettings.value = JSON.parse(JSON.stringify(store.settings))
      consultDoctors.value = JSON.parse(JSON.stringify(store.doctors))
      linkedConsultations.value = JSON.parse(JSON.stringify(store.linkedConsultations || []))
      selectedToAdd.value = null
      selectedLinkedIds.value = (store.linkedConsultations || []).map((item) => item.sourceId || item.id?.replace(/^linked-/, '') || item.id)
      previousValidLinkedIds.value = [...selectedLinkedIds.value]
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

function formatDateTime(value) {
  if (!value) return '未知时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function previewText(text, maxLength = 80) {
  if (!text) return '无'
  const normalized = String(text).replace(/\s+/g, ' ').trim()
  if (!normalized) return '无'
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}…` : normalized
}

const finishedConsultationOptions = computed(() => {
  const currentId = sessions.currentId
  return sessions.sessions
    .filter((s) => s.status === '已结束' && s.id !== currentId)
    .map((s) => ({
      label: `${s.name}（${formatDateTime(s.updatedAt)}）`,
      value: s.id
    }))
})

function filterLinkedOption(input, option) {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

function handleLinkedChange(selectedIds) {
  if (!selectedIds || !selectedIds.length) {
    linkedConsultations.value = []
    previousValidLinkedIds.value = []
    return
  }

  const ids = Array.isArray(selectedIds) ? [...selectedIds] : []
  const newLinked = []
  const genderMap = { male: '男', female: '女', other: '其他' }
  
  for (const id of ids) {
    const data = sessions.getSessionData(id)
    if (!data) {
      message.error('读取关联问诊数据失败，请确认该问诊已保存。')
      selectedLinkedIds.value = [...previousValidLinkedIds.value]
      return
    }

    const sessionMeta = sessions.sessions.find((s) => s.id === id)
    const consultName = sessionMeta?.name || data?.consultationName || '未命名问诊'
    const patientCase = data?.patientCase || {}
    const patientName = patientCase.name || ''
    const patientGender = patientCase.gender || ''
    const patientAge = patientCase.age
    const pastHistory = patientCase.pastHistory || ''
    const currentProblem = patientCase.currentProblem || ''
    const imageRecognitionResult = patientCase.imageRecognitionResult || ''
    const finalSummary = data?.finalSummary?.content || ''
    const finishedAt = sessionMeta?.updatedAt || ''
    
    newLinked.push({
      id: `linked-${id}`,
      sourceId: id,
      consultationName: consultName,
      patientName,
      patientGender,
      patientAge,
      pastHistory,
      currentProblem,
      imageRecognitionResult,
      finalSummary,
      finishedAt,
      metadata: { sessionMeta, patientCase }
    })
  }

  if (newLinked.length === 0) {
    linkedConsultations.value = []
    previousValidLinkedIds.value = []
    return
  }

  const firstPatient = newLinked[0]
  const firstName = firstPatient.patientName || ''
  const firstGender = firstPatient.patientGender || ''
  const firstAge = firstPatient.patientAge

  for (let i = 1; i < newLinked.length; i++) {
    const item = newLinked[i]
    const name = item.patientName || ''
    const gender = item.patientGender || ''
    const age = item.patientAge

    if (name !== firstName || gender !== firstGender || age !== firstAge) {
      const firstAgeStr = firstAge !== null && firstAge !== undefined ? `${firstAge}岁` : '未知'
      const itemAgeStr = age !== null && age !== undefined ? `${age}岁` : '未知'
      message.error(`无法添加：多选的问诊必须具有相同的患者名称、性别、年龄。\n第1个：${firstName || '未知'}，${genderMap[firstGender] || firstGender || '未知'}，${firstAgeStr}\n第${i + 1}个：${name || '未知'}，${genderMap[gender] || gender || '未知'}，${itemAgeStr}`)
      selectedLinkedIds.value = [...previousValidLinkedIds.value]
      return
    }
  }

  linkedConsultations.value = newLinked
  previousValidLinkedIds.value = [...ids]
}

function clearLinkedConsultations() {
  linkedConsultations.value = []
  selectedLinkedIds.value = []
  previousValidLinkedIds.value = []
}

function removeLinkedConsultation(id) {
  const target = linkedConsultations.value.find((item) => item.id === id)
  linkedConsultations.value = linkedConsultations.value.filter((item) => item.id !== id)
  const sourceId = target?.sourceId || id.replace(/^linked-/, '')
  selectedLinkedIds.value = selectedLinkedIds.value.filter((sid) => sid !== sourceId)
  handleLinkedChange([...selectedLinkedIds.value])
}

function renderLinkedConsultation({ item }) {
  const AButton = resolveComponent('a-button')
  const genderMap = { male: '男', female: '女', other: '其他' }
  const patientInfo = [
    item.patientName || '未知',
    genderMap[item.patientGender] || item.patientGender || '未知',
    item.patientAge !== null && item.patientAge !== undefined ? `${item.patientAge}岁` : '年龄未知'
  ].join('，')

  const details = []
  if (item.pastHistory) details.push(`既往疾病: ${previewText(item.pastHistory, 50)}`)
  if (item.currentProblem) details.push(`本次问题: ${previewText(item.currentProblem, 50)}`)
  if (item.imageRecognitionResult) details.push(`图片识别: ${previewText(item.imageRecognitionResult, 50)}`)
  if (item.finalSummary) details.push(`最终答案: ${previewText(item.finalSummary, 50)}`)
  
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f0f0f0' } },
    [
      h('div', { style: { flex: 1, minWidth: 0 } }, [
        h('div', { style: { fontWeight: '600', marginBottom: '4px', fontSize: '14px' } }, item.consultationName),
        h('div', { style: { color: '#595959', fontSize: '12px', marginBottom: '4px' } }, `患者：${patientInfo}`),
        h('div', { style: { color: '#8c8c8c', fontSize: '11px' } }, `既往疾病：${previewText(item.pastHistory, 60)}`),
        h('div', { style: { color: '#8c8c8c', fontSize: '11px' } }, `本次问题：${previewText(item.currentProblem, 60)}`),
        h('div', { style: { color: '#8c8c8c', fontSize: '11px' } }, `图片识别：${previewText(item.imageRecognitionResult, 60)}`),
        h('div', { style: { color: '#8c8c8c', fontSize: '11px' } }, `最终答案：${previewText(item.finalSummary, 80)}`),
        item.finishedAt ? h('div', { style: { color: '#bfbfbf', fontSize: '11px', marginTop: '4px' } }, `完成：${formatDateTime(item.finishedAt)}`) : null
      ]),
      h(
        AButton,
        { type: 'link', danger: true, size: 'small', onClick: () => removeLinkedConsultation(item.id) },
        { default: () => '移除' }
      )
    ]
  )
}

function onSave() {
  store.setConsultationName(localConsultationName.value)
  store.setSettings(localSettings.value)
  store.setDoctors(consultDoctors.value)
  store.setLinkedConsultations(linkedConsultations.value)
  if (localConsultationName.value.trim() && sessions.currentId) {
    sessions.rename(sessions.currentId, localConsultationName.value.trim())
  }
  message.success('已保存问诊设置')
  open.value = false
}
</script>
