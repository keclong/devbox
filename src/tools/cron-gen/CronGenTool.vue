<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  ElAlert,
  ElButton,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTag,
} from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { nextRuns, parseCron } from '../cron-parser/cron'
import {
  buildExpr,
  DEFAULT_SELECTION,
  PRESETS,
  valueLabel,
  type FieldKey,
  type GenSelection,
} from './crongen'

interface UiField {
  key: FieldKey
  name: string
  /** 每一X 的单位 */
  unit: string
  min: number
  max: number
  options: number[]
}

function span(min: number, max: number): number[] {
  return Array.from({ length: max - min + 1 }, (_, i) => min + i)
}

const UI_FIELDS: UiField[] = [
  { key: 'minute', name: '分钟', unit: '分', min: 0, max: 59, options: span(0, 59) },
  { key: 'hour', name: '小时', unit: '点', min: 0, max: 23, options: span(0, 23) },
  { key: 'dayOfMonth', name: '日', unit: '日', min: 1, max: 31, options: span(1, 31) },
  { key: 'month', name: '月', unit: '月', min: 1, max: 12, options: span(1, 12) },
  { key: 'dayOfWeek', name: '周', unit: '天', min: 0, max: 6, options: span(0, 6) },
]

// 深拷贝默认值，避免预设对象被就地修改
const selection = reactive<GenSelection>(JSON.parse(JSON.stringify(DEFAULT_SELECTION)))

const expr = computed(() => buildExpr(selection))
const parsed = computed(() => parseCron(expr.value))
const runs = computed(() => {
  if (!parsed.value.ok) return []
  return nextRuns(parsed.value.fields, new Date(), 5)
})

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatRun(d: Date): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())} 周${week}`
  )
}

function applyPreset(index: number): void {
  const preset = PRESETS[index]
  for (const f of UI_FIELDS) {
    selection[f.key] = JSON.parse(JSON.stringify(preset.selection[f.key]))
  }
}

// 任一选择停止变化 1.2 秒后自动记录，避免调参时刷屏
const recorder = createRecorder('crongen')
watch(
  () => JSON.stringify(selection),
  () => recorder.schedule(() => ({ label: expr.value, data: JSON.parse(JSON.stringify(selection)) })),
)

function restore(data: unknown): void {
  const d = data as Partial<GenSelection> | null
  if (!d || typeof d !== 'object') return
  for (const f of UI_FIELDS) {
    const sel = d[f.key]
    if (!sel || typeof sel.kind !== 'string') continue
    selection[f.key] = {
      kind: sel.kind,
      values: Array.isArray(sel.values) ? sel.values : [],
      start: typeof sel.start === 'number' ? sel.start : f.min,
      end: typeof sel.end === 'number' ? sel.end : f.max,
      step: typeof sel.step === 'number' ? sel.step : 1,
    }
  }
  ElMessage.success('已恢复历史记录')
}
</script>

<template>
  <ToolLayout title="Cron 生成器" description="可视化选择执行规则，生成标准 5 段 Cron 表达式">
    <template #input>
      <div class="preset-row">
        <span class="field-label">常用预设</span>
        <ElButton v-for="(p, i) in PRESETS" :key="p.name" size="small" @click="applyPreset(i)">
          {{ p.name }}
        </ElButton>
      </div>

      <div v-for="f in UI_FIELDS" :key="f.key" class="gen-row">
        <div class="gen-row-head">
          <span class="gen-field-name">{{ f.name }}</span>
          <span class="gen-range">{{ f.min }}-{{ f.max }}</span>
          <ElRadioGroup v-model="selection[f.key].kind" size="small">
            <ElRadioButton value="every">每一{{ f.unit }}</ElRadioButton>
            <ElRadioButton value="list">列表</ElRadioButton>
            <ElRadioButton value="range">范围</ElRadioButton>
          </ElRadioGroup>
        </div>
        <div class="gen-row-controls">
          <template v-if="selection[f.key].kind === 'every'">
            <span class="ctl-label">步长</span>
            <ElInputNumber v-model="selection[f.key].step" :min="1" :max="f.max - f.min + 1" size="small" />
            <span class="ctl-hint">每 {{ selection[f.key].step }}{{ f.unit }}一次</span>
          </template>
          <template v-else-if="selection[f.key].kind === 'list'">
            <ElSelect
              v-model="selection[f.key].values"
              multiple
              filterable
              collapse-tags
              size="small"
              class="fill"
              :placeholder="`选择${f.name}值`"
            >
              <ElOption v-for="v in f.options" :key="v" :value="v" :label="valueLabel(f.key, v)" />
            </ElSelect>
          </template>
          <template v-else>
            <span class="ctl-label">从</span>
            <ElSelect v-model="selection[f.key].start" size="small" class="mini-select">
              <ElOption v-for="v in f.options" :key="v" :value="v" :label="valueLabel(f.key, v)" />
            </ElSelect>
            <span class="ctl-label">到</span>
            <ElSelect v-model="selection[f.key].end" size="small" class="mini-select">
              <ElOption v-for="v in f.options" :key="v" :value="v" :label="valueLabel(f.key, v)" />
            </ElSelect>
            <span class="ctl-label">步长</span>
            <ElInputNumber v-model="selection[f.key].step" :min="1" size="small" class="step-input" />
          </template>
        </div>
      </div>

      <HistoryPanel tool-id="crongen" @restore="restore" />
    </template>

    <template #output>
      <div class="expr-box">
        <div class="expr-text">{{ expr }}</div>
        <CopyButton :text="expr" />
      </div>
      <ElAlert
        v-if="!parsed.ok"
        :title="parsed.error"
        type="error"
        show-icon
        :closable="false"
      />
      <template v-else>
        <div class="desc-row">
          <span class="field-label">含义</span>
          <ElTag type="success">{{ parsed.description }}</ElTag>
        </div>
        <div class="field-label">未来 5 次执行</div>
        <div v-for="(r, i) in runs" :key="i" class="run-row">
          <span class="run-index">{{ i + 1 }}</span>
          <span class="run-time">{{ formatRun(r) }}</span>
        </div>
      </template>
    </template>
  </ToolLayout>
</template>

<style scoped>
.preset-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}

.preset-row .field-label {
  margin-bottom: 0;
}

.gen-row {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.gen-row-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.gen-field-name {
  font-size: 13px;
  font-weight: 600;
}

.gen-range {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}

.gen-row-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ctl-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.ctl-hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.mini-select {
  width: 110px;
}

.step-input {
  width: 90px;
}

.expr-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 14px 16px;
  background: var(--color-surface-secondary);
  margin-bottom: 14px;
}

.expr-text {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 18px;
  font-weight: 600;
  word-break: break-all;
}

.desc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.desc-row .field-label {
  margin-bottom: 0;
}

.run-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 0;
  font-size: 13px;
}

.run-index {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.run-time {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
}
</style>
