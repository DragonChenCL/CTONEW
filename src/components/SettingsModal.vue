<template>
  <a-modal v-model:open="open" title="设置" width="900px" @ok="onSave" ok-text="保存">
    <a-tabs>
      <a-tab-pane key="doctors" tab="医生配置">
        <a-space direction="vertical" style="width: 100%">
          <a-alert type="info" show-icon message="提示" description="可添加多个由不同 LLM 驱动的医生。未填写 API Key 将使用模拟回复。" />
          <draggable v-model="localDoctors" item-key="id" handle=".drag-handle">
            <template #item="{ element, index }">
              <a-card :title="element.name || '未命名医生'" size="small" :extra="extraActions(index)" style="margin-bottom: 8px;">
                <a-row :gutter="8">
                  <a-col :span="6">
                    <a-form-item label="医生名称">
                      <a-input v-model:value="element.name" placeholder="Dr. GPT-4" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="供应商">
                      <a-select v-model:value="element.provider" style="width: 200px" :options="providerOptions" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="API Key">
                      <a-input-password v-model:value="element.apiKey" placeholder="sk-..." />
                    </a-form-item>
                  </a-col>
                  <a-col :span="6">
                    <a-form-item label="自定义 Base URL">
                      <a-input v-model:value="element.baseUrl" placeholder="留空使用默认" />
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-row :gutter="8">
                  <a-col :span="12">
                    <a-form-item label="模型名称（可手动输入）">
                      <a-input v-model:value="element.model" placeholder="gpt-4o-mini / claude-3-haiku-20240307 / gemini-1.5-flash" />
                    </a-form-item>
                  </a-col>
                  <a-col :span="12">
                    <a-form-item label="从站点选择模型">
                      <div style="display:flex; gap:8px;">
                        <a-select
                          style="flex:1;"
                          v-model:value="element.model"
                          :options="modelOptions[element.id] || []"
                          show-search
                          :loading="loadingModel[element.id]"
                          placeholder="点击右侧按钮加载模型列表"
                        />
                        <a-button :loading="loadingModel[element.id]" @click="() => loadModels(element)">加载模型</a-button>
                      </div>
                    </a-form-item>
                  </a-col>
                </a-row>
                <a-form-item label="自定义提示词（可选）">
                  <a-textarea v-model:value="element.customPrompt" rows="2" />
                </a-form-item>
                <a-form-item label="状态">
                  <a-segmented v-model:value="element.status" :options="statusOptions" />
                </a-form-item>
              </a-card>
            </template>
          </draggable>
          <a-button type="dashed" block @click="addDoctor">+ 添加医生</a-button>
        </a-space>
      </a-tab-pane>
      <a-tab-pane key="global" tab="全局设置">
        <a-form layout="vertical">
          <a-form-item label="全局系统提示词">
            <a-textarea v-model:value="localSettings.globalSystemPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="最终总结提示词（默认）">
            <a-textarea v-model:value="localSettings.summaryPrompt" rows="6" />
          </a-form-item>
          <a-form-item label="发言顺序">
            <a-radio-group v-model:value="localSettings.turnOrder">
              <a-radio value="random">随机</a-radio>
              <a-radio value="custom">自定义（按医生列表顺序）</a-radio>
            </a-radio-group>
          </a-form-item>
          <a-form-item label="无人出局的最大轮数">
            <a-input-number v-model:value="localSettings.maxRoundsWithoutElimination" :min="1" />
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script setup>
import { ref, watch, h, resolveComponent } from 'vue'
import draggable from 'vuedraggable'
import { useConsultStore } from '../store'
import { message } from 'ant-design-vue'
import { listModels } from '../api/models'

const store = useConsultStore()

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])

const open = ref(props.open)
watch(
  () => props.open,
  (v) => (open.value = v)
)
watch(open, (v) => emit('update:open', v))

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  { label: 'Gemini', value: 'gemini' }
]
const statusOptions = [
  { label: '在席', value: 'active' },
  { label: '淘汰', value: 'eliminated' }
]

const localDoctors = ref(JSON.parse(JSON.stringify(store.doctors)))
const localSettings = ref(JSON.parse(JSON.stringify(store.settings)))
const modelOptions = ref({})
const loadingModel = ref({})

watch(
  () => props.open,
  (v) => {
    if (v) {
      localDoctors.value = JSON.parse(JSON.stringify(store.doctors))
      localSettings.value = JSON.parse(JSON.stringify(store.settings))
    }
  }
)

function addDoctor() {
  const id = `doc-${Date.now()}`
  localDoctors.value.push({ id, name: '', provider: 'openai', model: 'gpt-4o-mini', apiKey: '', baseUrl: '', customPrompt: '', status: 'active', votes: 0 })
}

function removeDoctor(idx) {
  localDoctors.value.splice(idx, 1)
}

async function loadModels(element) {
  const id = element.id
  loadingModel.value = { ...loadingModel.value, [id]: true }
  try {
    const options = await listModels(element.provider, element.apiKey, element.baseUrl)
    modelOptions.value = { ...modelOptions.value, [id]: options }
    if (!options.find((o) => o.value === element.model) && options.length) {
      // keep current value; do not override automatically
    }
    message.success('模型列表已加载')
  } catch (e) {
    message.error(`加载模型失败：${e?.message || e}`)
  } finally {
    loadingModel.value = { ...loadingModel.value, [id]: false }
  }
}

function extraActions(idx) {
  const AButton = resolveComponent('a-button')
  return h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    [
      h('span', { class: 'drag-handle', style: { cursor: 'move' }, title: '拖动排序' }, '⋮⋮'),
      h(
        AButton,
        { type: 'link', danger: true, onClick: () => removeDoctor(idx) },
        { default: () => '删除' }
      )
    ]
  )
}

function onSave() {
  if (!localDoctors.value.length) {
    message.error('请至少添加一位医生')
    return
  }
  store.setDoctors(localDoctors.value)
  store.setSettings(localSettings.value)
  message.success('已保存设置')
  open.value = false
}
</script>
