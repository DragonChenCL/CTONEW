<template>
  <a-card title="状态面板" :bordered="false">
    <a-descriptions
      size="small"
      bordered
      :column="1"
      style="margin-bottom: 12px"
    >
      <a-descriptions-item label="阶段">{{ phaseText }}</a-descriptions-item>

      <a-descriptions-item label="当前轮次">{{
        store.workflow.currentRound
      }}</a-descriptions-item>
      <a-descriptions-item label="连续未标注不太准确轮数">{{
        store.workflow.roundsWithoutElimination
      }}</a-descriptions-item>
    </a-descriptions>

    <a-descriptions
      size="small"
      bordered
      :column="1"
      style="margin-bottom: 12px"
    >
      <a-descriptions-item label="患者姓名">{{
        store.patientCase.name || "—"
      }}</a-descriptions-item>
      <a-descriptions-item label="年龄">{{
        store.patientCase.age ?? "—"
      }}</a-descriptions-item>
      <a-descriptions-item label="既往疾病">{{
        store.patientCase.pastHistory || "—"
      }}</a-descriptions-item>
      <a-descriptions-item label="本次问题">{{
        store.patientCase.currentProblem || "—"
      }}</a-descriptions-item>
    </a-descriptions>

    <DoctorList :doctors="store.doctors" />

    <template v-if="store.workflow.phase === 'voting'">
      <div style="margin-top: 16px">
        <VoteTally :doctors="store.doctors" :votes="store.lastRoundVotes" />
      </div>
    </template>

    <template v-if="store.workflow.phase === 'finished'">
      <div style="margin-top: 16px">
        <a-alert
          type="success"
          show-icon
          message="会诊已结束"
          :description="winnerText"
        />
        <div
          style="margin-top: 12px; display: flex; align-items: center; gap: 8px"
        >
          <a-button
            type="primary"
            :disabled="store.finalSummary.status !== 'ready'"
            @click="summaryOpen = true"
            >查看最终答案</a-button
          >
          <a-tag
            v-if="store.finalSummary.status === 'pending'"
            color="processing"
            >最终答案生成中...</a-tag
          >
          <a-tag
            v-else-if="store.finalSummary.status === 'ready'"
            color="success"
            >最终答案已生成 · {{ store.finalSummary.doctorName }}</a-tag
          >
          <a-tag v-else-if="store.finalSummary.status === 'error'" color="error"
            >最终答案生成失败</a-tag
          >
        </div>
      </div>
    </template>

    <div style="margin-top: 16px; display: flex; gap: 8px">
      <a-button @click="$emit('open-settings')">配置</a-button>
      <a-popconfirm title="确认重置流程？" @confirm="resetAll">
        <a-button danger>重置</a-button>
      </a-popconfirm>
    </div>
  </a-card>
  <a-modal
    v-model:open="summaryOpen"
    title="最终答案"
    width="900px"
    :footer="null"
  >
    <div v-if="store.finalSummary.status === 'ready'">
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px">
        <a-button type="dashed" size="small" @click="exportSummaryImage"
          >导出图片</a-button
        >
      </div>
      <div ref="exportRef" class="final-card">
        <div class="final-card-header">
          <div class="final-title">🎯 最终答案</div>
          <div class="final-sub">
            由 {{ store.finalSummary.doctorName }} 生成
          </div>
        </div>
        <div class="case-brief">
          <div>患者姓名：{{ store.patientCase.name || "—" }}</div>
          <div>年龄：{{ store.patientCase.age ?? "—" }}</div>
          <div>既往疾病：{{ store.patientCase.pastHistory || "—" }}</div>
          <div>本次问题：{{ store.patientCase.currentProblem || "—" }}</div>
        </div>
        <div
          v-html="renderMarkdown(store.finalSummary.content)"
          class="final-summary-md"
        ></div>
      </div>
    </div>
    <div v-else-if="store.finalSummary.status === 'pending'">
      <a-spin tip="最终答案生成中..." />
    </div>
    <div v-else-if="store.finalSummary.status === 'error'">
      <a-alert type="error" :message="store.finalSummary.content" />
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from "vue";
import { marked } from "marked";

import { useConsultStore } from "../store";
import DoctorList from "./DoctorList.vue";
import VoteTally from "./VoteTally.vue";

const store = useConsultStore();
const summaryOpen = ref(false);
const exportRef = ref(null);

const phaseText = computed(() => {
  switch (store.workflow.phase) {
    case "setup":
      return "配置/准备";
    case "discussion":
      return "讨论中";
    case "voting":
      return "评估中";
    case "finished":
      return "已结束";
    default:
      return store.workflow.phase;
  }
});

const winnerText = computed(() => {
  const actives = store.doctors.filter((d) => d.status === "active");
  if (actives.length === 1) return `更优答案来自：${actives[0].name}`;
  return "已达到未标注不太准确轮数上限";
});

function renderMarkdown(text) {
  try {
    return marked.parse(text || "");
  } catch (e) {
    return text;
  }
}

async function exportSummaryImage() {
  const node = exportRef.value;
  if (!node) return;
  try {
    const dataUrl = await window.htmlToImage.toPng(node, { pixelRatio: 2, cacheBust: true });
    const a = document.createElement("a");
    const fileBase = store.patientCase?.name
      ? `${store.patientCase.name}-最终答案`
      : "最终答案";
    a.href = dataUrl;
    a.download = `${fileBase}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    // ignore
    console.error(e);
  }
}

function resetAll() {
  // 重置流程并恢复所有医生为在席
  store.workflow = {
    phase: "setup",
    currentRound: 0,
    roundsWithoutElimination: 0,
    activeTurn: null,
    turnQueue: [],
    paused: false,
  };
  store.doctors = store.doctors.map((d) => ({
    ...d,
    status: "active",
    votes: 0,
  }));
  store.discussionHistory = [];
  store.finalSummary = {
    status: "idle",
    doctorId: null,
    doctorName: "",
    content: "",
    usedPrompt: "",
  };
}
</script>

<style scoped>
.final-summary-md :deep(h1),
.final-summary-md :deep(h2),
.final-summary-md :deep(h3) {
  margin: 12px 0 8px;
}
.final-summary-md :deep(p) {
  margin: 0 0 8px;
}
.final-summary-md :deep(ul),
.final-summary-md :deep(ol) {
  padding-left: 20px;
  margin: 0 0 8px;
}

.final-card {
  background: #ffffff;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04);
}
.final-card-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}
.final-title {
  font-size: 20px;
  font-weight: 700;
  color: #0958d9;
}
.final-sub {
  color: #8c8c8c;
  font-size: 12px;
}
.case-brief {
  background: #f5f5f5;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  color: #595959;
  font-size: 13px;
}
</style>
