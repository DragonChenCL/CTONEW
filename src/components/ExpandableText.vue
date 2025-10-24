<template>
  <div class="expandable-text">
    <div class="expandable-text__content">
      <div v-if="!renderAsHtml" class="expandable-text__plain">{{ renderSource }}</div>
      <div v-else v-html="html" />
    </div>
    <div v-if="needsCollapse" class="expandable-text__actions">
      <a-button type="link" size="small" @click="toggle">
        {{ expanded ? '收起' : '展开更多' }}
      </a-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'

const props = defineProps({
  text: { type: String, default: '' },
  maxLines: { type: Number, default: 10 }
})

const expanded = ref(false)

const normalizedText = computed(() => (props.text || '').trim())
const maxLines = computed(() => (props.maxLines && props.maxLines > 0 ? props.maxLines : 10))
const lines = computed(() => (normalizedText.value ? normalizedText.value.split(/\r?\n/) : []))
const needsCollapse = computed(() => lines.value.length > maxLines.value)
const collapsedSource = computed(() => {
  if (!needsCollapse.value) return normalizedText.value
  return lines.value.slice(0, maxLines.value).join('\n')
})
const renderSource = computed(() => {
  if (!normalizedText.value) return '—'
  if (normalizedText.value === '—') return '—'
  return expanded.value || !needsCollapse.value ? normalizedText.value : collapsedSource.value
})
const renderAsHtml = computed(() => renderSource.value !== '—')
const html = computed(() => {
  if (!renderAsHtml.value) return ''
  try {
    return marked.parse(renderSource.value)
  } catch (e) {
    return renderSource.value
  }
})

watch(
  () => props.text,
  () => {
    expanded.value = false
  }
)

function toggle() {
  expanded.value = !expanded.value
}
</script>

<style scoped>
.expandable-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.expandable-text__content {
  position: relative;
  word-break: break-word;
}

.expandable-text__plain {
  white-space: pre-wrap;
}

.expandable-text__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
