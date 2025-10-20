<template>
  <a-card title="病例输入" :bordered="false">
    <a-form :model="form" layout="vertical" @finish="onSubmit">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="患者名称" name="name" :rules="[{ required: true, message: '请输入患者名称' }]">
            <a-input v-model:value="form.name" placeholder="张三" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="年龄" name="age">
            <a-input-number v-model:value="form.age" :min="0" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="既往疾病" name="pastHistory">
        <a-textarea v-model:value="form.pastHistory" rows="3" placeholder="既往疾病、手术史、用药史等" />
      </a-form-item>
      <a-form-item label="本次问题" name="currentProblem" :rules="[{ required: true, message: '请输入本次问题' }]">
        <a-textarea v-model:value="form.currentProblem" rows="4" placeholder="主诉与现病史" />
      </a-form-item>
      <div style="display:flex; gap: 8px;">
        <a-button type="primary" html-type="submit">开始会诊</a-button>
        <a-button @click="openSettings">配置医生/提示词</a-button>
      </div>
    </a-form>
  </a-card>
</template>

<script setup>
import { reactive } from 'vue'
import { useConsultStore } from '../store'
import { message } from 'ant-design-vue'

const store = useConsultStore()

const form = reactive({
  name: store.patientCase.name,
  age: store.patientCase.age,
  pastHistory: store.patientCase.pastHistory,
  currentProblem: store.patientCase.currentProblem
})

function onSubmit() {
  try {
    store.setPatientCase(form)
    store.startConsultation()
  } catch (e) {
    message.error(e.message || String(e))
  }
}

function openSettings() {
  const event = new CustomEvent('open-settings')
  window.dispatchEvent(event)
}
</script>
