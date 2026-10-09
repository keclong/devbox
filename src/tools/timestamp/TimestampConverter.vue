<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ElButton,
  ElInput,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
} from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

type Unit = 's' | 'ms'

const input = ref('')
const unit = ref<Unit>('ms')
const dateTimeInput = ref('')
const zone = ref('Asia/Shanghai')

const zones = [
  { value: 'Asia/Shanghai', label: '北京 (UTC+8)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Tokyo', label: '东京 (UTC+9)' },
  { value: 'Europe/London', label: '伦敦' },
  { value: 'America/New_York', label: '纽约' },
  { value: 'America/Los_Angeles', label: '洛杉矶' },
]

/** null=空输入，'invalid'=格式非法，Date=解析成功 */
const parsed = computed<Date | 'invalid' | null>(() => {
  const text = input.value.trim()
  if (!text) return null
  if (!/^-?\d+$/.test(text)) return 'invalid'
  const ms = unit.value === 's' ? Number(text) * 1000 : Number(text)
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? 'invalid' : date
})

const localTime = computed(() =>
  parsed.value instanceof Date
    ? parsed.value.toLocaleString('zh-CN', { hour12: false })
    : '',
)

const isoTime = computed(() => (parsed.value instanceof Date ? parsed.value.toISOString() : ''))

const utcTime = computed(() => (parsed.value instanceof Date ? parsed.value.toUTCString() : ''))

const zoneTime = computed(() =>
  parsed.value instanceof Date
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: zone.value,
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(parsed.value)
    : '',
)

const relativeTime = computed(() => {
  if (!(parsed.value instanceof Date)) return ''
  const diff = Date.now() - parsed.value.getTime()
  const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000000],
    ['month', 2592000000],
    ['day', 86400000],
    ['hour', 3600000],
    ['minute', 60000],
    ['second', 1000],
  ]
  for (const [name, ms] of units) {
    if (Math.abs(diff) >= ms) return rtf.format(-Math.round(diff / ms), name)
  }
  return '刚刚'
})

/** 反查结果：null=空输入，'invalid'=无效日期，number=时间戳 */
const reverseResult = computed<number | 'invalid' | null>(() => {
  if (!dateTimeInput.value) return null
  const ms = new Date(dateTimeInput.value).getTime()
  if (Number.isNaN(ms)) return 'invalid'
  return unit.value === 's' ? Math.floor(ms / 1000) : ms
})

function fillNow() {
  const now = Date.now()
  input.value = unit.value === 's' ? String(Math.floor(now / 1000)) : String(now)
}

function clearAll() {
  input.value = ''
  dateTimeInput.value = ''
}
</script>

<template>
  <ToolLayout title="时间戳转换" description="Unix 时间戳与日期时间互转，支持秒 / 毫秒与多时区">
    <template #input-actions>
      <ElSelect v-model="zone" size="small" style="width: 140px">
        <ElOption v-for="z in zones" :key="z.value" :label="z.label" :value="z.value" />
      </ElSelect>
      <ElRadioGroup v-model="unit" size="small">
        <ElRadioButton value="s">秒</ElRadioButton>
        <ElRadioButton value="ms">毫秒</ElRadioButton>
      </ElRadioGroup>
      <ElButton size="small" type="primary" @click="fillNow">现在</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <ElInput v-model="input" class="fill" placeholder="输入时间戳，如 1728374400" />
      <ElInput v-model="dateTimeInput" type="datetime-local" class="fill" />
      <p class="hint">上方输入时间戳查看对应时间；下方选择日期时间可反查时间戳</p>
    </template>

    <template #output>
      <div v-if="parsed === 'invalid'" class="error-msg">时间戳格式不正确，请输入整数</div>
      <template v-else-if="parsed">
        <div class="result-row">
          <span class="label">本地时间</span>
          <span class="value">{{ localTime }}</span>
          <CopyButton :text="localTime" />
        </div>
        <div class="result-row">
          <span class="label">ISO 格式</span>
          <span class="value">{{ isoTime }}</span>
          <CopyButton :text="isoTime" />
        </div>
        <div class="result-row">
          <span class="label">UTC 时间</span>
          <span class="value">{{ utcTime }}</span>
          <CopyButton :text="utcTime" />
        </div>
        <div class="result-row">
          <span class="label">时区时间</span>
          <span class="value">{{ zoneTime }}</span>
          <CopyButton :text="zoneTime" />
        </div>
        <div class="result-row">
          <span class="label">相对时间</span>
          <span class="value">{{ relativeTime }}</span>
        </div>
      </template>
      <div v-if="reverseResult && reverseResult !== 'invalid'" class="result-row">
        <span class="label">反查结果</span>
        <span class="value">{{ reverseResult }}</span>
        <CopyButton :text="String(reverseResult)" />
      </div>
      <div v-else-if="reverseResult === 'invalid'" class="error-msg">日期时间无效</div>
    </template>
  </ToolLayout>
</template>
