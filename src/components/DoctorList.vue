<template>
  <div>
    <div style="font-weight: 600; margin-bottom: 8px;">医生列表</div>
    <a-list :data-source="doctors" :renderItem="renderItem" />
  </div>
</template>

<script setup>
import { h } from 'vue'

const props = defineProps({
  doctors: { type: Array, default: () => [] }
})

const providerLabelMap = {
  openai: 'OpenAI规范',
  anthropic: 'Anthropic规范',
  gemini: 'Gemini规范',
  siliconflow: '硅基流动',
  modelscope: '魔搭社区'
}

function resolveProviderLabel(value) {
  return providerLabelMap[value] || value
}

function renderItem({ item }) {
  const color = item.status === 'active' ? 'green' : 'gray'
  const nameNode = h(
    'span',
    { style: { color, textDecoration: item.status === 'eliminated' ? 'line-through' : 'none' } },
    item.name
  )
  const desc = `${resolveProviderLabel(item.provider)} • ${item.model}`
  return h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' } },
    [
      h('div', [nameNode, h('div', { style: { color: '#8c8c8c', fontSize: '12px' } }, desc)]),
      h(
        'div',
        { style: { color: '#8c8c8c', fontSize: '12px' } },
        item.status === 'active' ? '在席' : '不太准确'
      )
    ]
  )
}
</script>
