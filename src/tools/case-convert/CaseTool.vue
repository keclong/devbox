<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElInput, ElMessage, ElTag } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder, preview } from '../../composables/useHistory'
import { convertAll, detectStyle, tokenize, CASE_STYLES, type CaseStyle } from './case'

const text = ref('')

const tokens = computed(() => tokenize(text.value))
const all = computed(() => convertAll(text.value))
const detected = computed(() => detectStyle(text.value))

/** 多行输入时逐行转换 */
const lineCount = computed(() => (text.value ? text.value.split('\n').length : 0))

// 输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('case')
watch(text, () =>
  recorder.schedule(() =>
    text.value.trim()
      ? { label: preview(text.value, 24), data: { text: text.value } }
      : null,
  ),
)

function restore(data: unknown): void {
  const value = (data as { text?: unknown }).text
  if (typeof value !== 'string') return
  text.value = value
  ElMessage.success('已恢复历史输入')
}

function rowValue(style: CaseStyle): string {
  const v = all.value[style]
  if (lineCount.value <= 1) return v
  // 多行：按行分别转换
  return text.value
    .split('\n')
    .map((line) => (line.trim() ? convertAll(line)[style] : ''))
    .join('\n')
}
</script>

<template>
  <ToolLayout title="命名转换" description="camelCase、snake_case 等 8 种命名风格互转">
    <template #input>
      <span class="field-label">输入</span>
      <ElInput
        v-model="text"
        type="textarea"
        resize="none"
        class="fill"
        placeholder="输入变量名或句子，如 userName、user_name、用户 名称；多行时逐行转换"
      />
      <div v-if="tokens.length" class="token-row">
        <span class="field-label">分词结果</span>
        <ElTag v-for="(t, i) in tokens" :key="i" size="small" class="token-tag">{{ t }}</ElTag>
      </div>
      <HistoryPanel tool-id="case" @restore="restore" />
    </template>

    <template #output>
      <div v-for="s in CASE_STYLES" :key="s.value" class="case-row">
        <div class="case-row-head">
          <span class="case-row-title">
            {{ s.label }}
            <ElTag v-if="detected === s.value" type="success" size="small" class="detected-tag">
              当前风格
            </ElTag>
          </span>
          <CopyButton :text="rowValue(s.value)" />
        </div>
        <div class="case-row-value">{{ rowValue(s.value) || '（空）' }}</div>
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.token-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.token-row .field-label {
  margin-bottom: 0;
}

.token-tag {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.case-row {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.case-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.case-row-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.detected-tag {
  flex: none;
}

.case-row-value {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
