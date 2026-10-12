<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElInput, ElInputNumber, ElMessage, ElOption, ElSelect, ElTabPane, ElTabs } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import {
  addDuration,
  addWorkdays,
  diffBetween,
  formatDate,
  formatDateTime,
  parseLocalInput,
  toLocalInput,
  weekdayLabel,
  type TimeUnit,
} from './timecalc'

const now = new Date()

// 当前页签：0 时间差 / 1 日期推算 / 2 工作日推算（输出区按页签切换）
const activeTab = ref('0')

// ---------- 时间差 ----------
const fromInput = ref(toLocalInput(now))
const toInput = ref(toLocalInput(addDuration(now, 1, 'day')))
const fromDate = computed(() => parseLocalInput(fromInput.value))
const toDate = computed(() => parseLocalInput(toInput.value))
const diff = computed(() => {
  if (!fromDate.value || !toDate.value) return null
  return diffBetween(fromDate.value, toDate.value)
})

// ---------- 日期推算 ----------
const baseInput = ref(toLocalInput(now))
const amount = ref(7)
const unit = ref<TimeUnit>('day')
const baseDate = computed(() => parseLocalInput(baseInput.value))
const shifted = computed(() =>
  baseDate.value ? addDuration(baseDate.value, amount.value, unit.value) : null,
)

// ---------- 工作日推算 ----------
const workBaseInput = ref(toLocalInput(now))
const workCount = ref(5)
const workBase = computed(() => parseLocalInput(workBaseInput.value))
const workResult = computed(() =>
  workBase.value ? addWorkdays(workBase.value, workCount.value) : null,
)

const UNIT_LABELS: Record<TimeUnit, string> = { day: '天', week: '周', month: '月', year: '年' }

// 任一输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('timecalc')
watch(
  [fromInput, toInput, baseInput, amount, unit, workBaseInput, workCount],
  () =>
    recorder.schedule(() => ({
      label: `时间计算 · ${formatDate(now)}`,
      data: {
        fromInput: fromInput.value,
        toInput: toInput.value,
        baseInput: baseInput.value,
        amount: amount.value,
        unit: unit.value,
        workBaseInput: workBaseInput.value,
        workCount: workCount.value,
      },
    })),
)

function restore(data: unknown): void {
  const d = data as Record<string, unknown>
  if (typeof d.fromInput === 'string') fromInput.value = d.fromInput
  if (typeof d.toInput === 'string') toInput.value = d.toInput
  if (typeof d.baseInput === 'string') baseInput.value = d.baseInput
  if (typeof d.amount === 'number') amount.value = d.amount
  if (d.unit === 'day' || d.unit === 'week' || d.unit === 'month' || d.unit === 'year') {
    unit.value = d.unit
  }
  if (typeof d.workBaseInput === 'string') workBaseInput.value = d.workBaseInput
  if (typeof d.workCount === 'number') workCount.value = d.workCount
  ElMessage.success('已恢复历史记录')
}

function swapDiff() {
  const t = fromInput.value
  fromInput.value = toInput.value
  toInput.value = t
}

function fillNowFor(target: 'diff-from' | 'diff-to' | 'base' | 'work') {
  const v = toLocalInput(new Date())
  if (target === 'diff-from') fromInput.value = v
  else if (target === 'diff-to') toInput.value = v
  else if (target === 'base') baseInput.value = v
  else workBaseInput.value = v
}
</script>

<template>
  <ToolLayout title="时间计算器" description="时间差、日期推算、工作日推算">
    <template #input>
      <ElTabs v-model="activeTab">
        <ElTabPane label="时间差">
          <span class="field-label">开始时间</span>
          <ElInput v-model="fromInput" type="datetime-local" class="fill" />
          <div class="mini-actions">
            <ElButton size="small" @click="fillNowFor('diff-from')">此刻</ElButton>
            <ElButton size="small" @click="swapDiff">交换</ElButton>
          </div>
          <span class="field-label">结束时间</span>
          <ElInput v-model="toInput" type="datetime-local" class="fill" />
          <div class="mini-actions">
            <ElButton size="small" @click="fillNowFor('diff-to')">此刻</ElButton>
          </div>
        </ElTabPane>

        <ElTabPane label="日期推算">
          <span class="field-label">基准时间</span>
          <ElInput v-model="baseInput" type="datetime-local" class="fill" />
          <div class="mini-actions">
            <ElButton size="small" @click="fillNowFor('base')">此刻</ElButton>
          </div>
          <span class="field-label">加减数量</span>
          <div class="amount-row">
            <ElInputNumber v-model="amount" :min="-100000" :max="100000" />
            <ElSelect v-model="unit" class="unit-select">
              <ElOption v-for="(label, u) in UNIT_LABELS" :key="u" :value="u" :label="label" />
            </ElSelect>
          </div>
        </ElTabPane>

        <ElTabPane label="工作日推算">
          <span class="field-label">基准日期</span>
          <ElInput v-model="workBaseInput" type="datetime-local" class="fill" />
          <div class="mini-actions">
            <ElButton size="small" @click="fillNowFor('work')">此刻</ElButton>
          </div>
          <span class="field-label">工作日数量（负数向前推）</span>
          <ElInputNumber v-model="workCount" :min="-1000" :max="1000" />
        </ElTabPane>
      </ElTabs>
      <p class="hint">工作日推算仅跳过周六周日，不含法定节假日</p>
      <HistoryPanel tool-id="timecalc" @restore="restore" />
    </template>

    <template #output>
      <template v-if="activeTab === '0' && diff">
        <div class="result-row-card">
          <div class="result-row-title">时间差（按时长）</div>
          <div class="result-big">
            {{ diff.days }} 天 {{ diff.hours }} 小时 {{ diff.minutes }} 分 {{ diff.seconds }} 秒
          </div>
          <div class="result-sub">共 {{ diff.totalMs.toLocaleString() }} 毫秒</div>
        </div>
        <div class="result-row-card">
          <div class="result-row-title">按自然日</div>
          <div class="result-big">{{ diff.calendarDays }} 天</div>
          <div class="result-sub">
            {{ formatDate(fromDate!) }}（{{ weekdayLabel(fromDate!) }}） 至
            {{ formatDate(toDate!) }}（{{ weekdayLabel(toDate!) }}）
          </div>
        </div>
        <div class="result-row-card">
          <div class="result-row-title">工作日（周一至周五）</div>
          <div class="result-big">{{ diff.workdays }} 天</div>
          <div class="result-sub">不含法定节假日</div>
        </div>
      </template>

      <template v-else-if="activeTab === '1' && shifted">
        <div class="result-row-card">
          <div class="result-row-title">推算结果</div>
          <div class="result-big">{{ formatDateTime(shifted) }}</div>
          <div class="result-sub">
            {{ weekdayLabel(shifted) }} ·
            {{ formatDateTime(baseDate!) }} {{ amount >= 0 ? '+' : '' }}{{ amount }}
            {{ UNIT_LABELS[unit] }}
          </div>
        </div>
      </template>

      <template v-else-if="activeTab === '2' && workResult">
        <div class="result-row-card">
          <div class="result-row-title">工作日推算结果</div>
          <div class="result-big">{{ formatDate(workResult) }}（{{ weekdayLabel(workResult) }}）</div>
          <div class="result-sub">
            {{ formatDate(workBase!) }} 起 {{ workCount >= 0 ? '+' : '' }}{{ workCount }} 个工作日
          </div>
        </div>
      </template>
    </template>
  </ToolLayout>
</template>

<style scoped>
.mini-actions {
  display: flex;
  gap: 8px;
  margin: 6px 0 10px;
}

.amount-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.unit-select {
  width: 90px;
}

.result-row-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.result-row-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.result-big {
  font-size: 18px;
  font-weight: 600;
}

.result-sub {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
