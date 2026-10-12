<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElAlert, ElCheckbox, ElInput, ElMessage, ElOption, ElSelect } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder, preview } from '../../composables/useHistory'
import { convertRadix, MAX_RADIX, MIN_RADIX, type ConvertResult } from './radix'

const RADIX_LABELS: Record<number, string> = {
  2: '二进制',
  8: '八进制',
  10: '十进制',
  16: '十六进制',
}

const value = ref('')
const from = ref(10)
const to = ref(16)
const upper = ref(false)

const radixOptions = Array.from({ length: MAX_RADIX - MIN_RADIX + 1 }, (_, i) => MIN_RADIX + i)

const targets = computed(() => {
  const list: number[] = []
  for (const r of [2, 8, 10, 16, to.value]) {
    if (r !== from.value && !list.includes(r)) list.push(r)
  }
  return list
})

const results = computed<Record<number, ConvertResult>>(() => {
  const out: Record<number, ConvertResult> = {}
  for (const r of targets.value) out[r] = convertRadix(value.value, from.value, r, upper.value)
  return out
})

const error = computed(() => {
  if (!value.value.trim()) return ''
  const first = results.value[targets.value[0]]
  return first && !first.ok ? first.error ?? '转换失败' : ''
})

// 输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('radix')
watch([value, from, to, upper], () =>
  recorder.schedule(() =>
    value.value.trim()
      ? {
          label: `${preview(value.value, 20)} · ${from.value}→${to.value}`,
          data: { value: value.value, from: from.value, to: to.value, upper: upper.value },
        }
      : null,
  ),
)

function restore(data: unknown): void {
  const d = data as { value?: unknown; from?: unknown; to?: unknown; upper?: unknown }
  if (typeof d.value !== 'string') return
  value.value = d.value
  if (typeof d.from === 'number') from.value = d.from
  if (typeof d.to === 'number') to.value = d.to
  if (typeof d.upper === 'boolean') upper.value = d.upper
  ElMessage.success('已恢复历史记录')
}

function radixLabel(r: number): string {
  return `${RADIX_LABELS[r] ?? '进制'}（${r}）`
}
</script>

<template>
  <ToolLayout title="进制转换" description="2-36 进制互转，支持小数与大整数">
    <template #input>
      <span class="field-label">数值</span>
      <ElInput v-model="value" class="fill" placeholder="输入数值，如 255、0xff、3.14" />
      <div class="radix-row">
        <span class="field-label">源进制</span>
        <ElSelect v-model="from" class="radix-select">
          <ElOption v-for="r in radixOptions" :key="r" :value="r" :label="radixLabel(r)" />
        </ElSelect>
        <span class="field-label">目标进制</span>
        <ElSelect v-model="to" class="radix-select">
          <ElOption v-for="r in radixOptions" :key="r" :value="r" :label="radixLabel(r)" />
        </ElSelect>
      </div>
      <div class="flag-row">
        <ElCheckbox v-model="upper">字母大写（如 FF）</ElCheckbox>
      </div>
      <p class="hint">支持前缀 0x / 0b / 0o；小数除不尽时截断到 24 位；整数部分不限长度</p>
      <HistoryPanel tool-id="radix" @restore="restore" />
    </template>

    <template #input-actions>
      <span class="action-tip">输入即实时转换</span>
    </template>

    <template #output>
      <ElAlert v-if="error" :title="error" type="error" show-icon :closable="false" />
      <div v-for="r in targets" v-else :key="r" class="result-row-card">
        <div class="result-row-head">
          <span class="result-row-title">{{ radixLabel(r) }}</span>
          <CopyButton v-if="results[r].ok" :text="results[r].value" />
        </div>
        <div class="result-row-value">{{ results[r].ok ? results[r].value : results[r].error }}</div>
      </div>
      <p v-if="!value.trim() && !error" class="hint">在上方输入数值，这里会显示各进制结果</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.radix-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.radix-row .field-label {
  margin-bottom: 0;
}

.radix-select {
  width: 140px;
}

.result-row-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.result-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.result-row-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.result-row-value {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 14px;
  word-break: break-all;
  white-space: pre-wrap;
}

.action-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
