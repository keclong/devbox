<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElAlert, ElButton, ElInput, ElTable, ElTableColumn, ElTag } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import { parseCron, nextRuns, type ParseResult } from './cron'

const expr = ref('0 9 * * 1-5')
const parsed = ref<ParseResult>({ ok: false, error: '' })
const runs = ref<Date[]>([])
const now = ref(new Date())

const PRESETS: { label: string; value: string }[] = [
  { label: '每分钟', value: '* * * * *' },
  { label: '每 5 分钟', value: '*/5 * * * *' },
  { label: '每小时', value: '0 * * * *' },
  { label: '每天 0 点', value: '0 0 * * *' },
  { label: '工作日 9 点', value: '0 9 * * 1-5' },
  { label: '每周一 9:30', value: '30 9 * * 1' },
  { label: '每月 1 号', value: '0 0 1 * *' },
  { label: '白天每 15 分钟', value: '*/15 8-18 * * *' },
]

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function formatTime(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )} 周${WEEK_CN[d.getDay()]}`
}

function relative(d: Date): string {
  const diff = d.getTime() - now.value.getTime()
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `${Math.max(minutes, 1)} 分钟后`
  const hours = Math.round(diff / 3600000)
  if (hours < 24) return `${hours} 小时后`
  const days = Math.round(diff / 86400000)
  return days < 30 ? `${days} 天后` : `${Math.round(days / 30)} 个月后`
}

function valuesText(values: number[]): string {
  const shown = values.slice(0, 12).join('、')
  return values.length > 12 ? `${shown} …（共 ${values.length} 个）` : shown
}

function runsText(): string {
  return runs.value.map(formatTime).join('\n')
}

function update(): void {
  const result = parseCron(expr.value)
  parsed.value = result
  now.value = new Date()
  runs.value = result.ok ? nextRuns(result.fields, now.value, 10) : []
}

watch(expr, update)
update()
</script>

<template>
  <ToolLayout
    title="Cron 表达式解析"
    description="解析 Cron 表达式，推算未来 10 次执行时间，全程本地处理"
  >
    <template #input>
      <span class="field-label">Cron 表达式（分 时 日 月 周）</span>
      <ElInput v-model="expr" class="cron-input" placeholder="例如：*/5 * * * *" />

      <span class="field-label">快捷填充</span>
      <div class="preset-row">
        <ElButton v-for="p in PRESETS" :key="p.value" size="small" @click="expr = p.value">
          {{ p.label }}
        </ElButton>
      </div>

      <p class="cron-hint">
        支持 *、列表（1,15）、范围（1-5）、步长（*/5、1-30/2）、月份与星期名称（JAN、MON），以及
        @daily、@hourly 等宏。
      </p>
    </template>

    <template #output>
      <div v-if="!expr.trim()" class="hint">输入 Cron 表达式后显示解析结果</div>
      <template v-else-if="parsed.ok">
        <div class="cron-desc">
          <ElTag type="success" size="small">含义</ElTag>
          <span>{{ parsed.description }}</span>
        </div>

        <div class="section-title">接下来 10 次执行</div>
        <div v-if="!runs.length" class="hint">该表达式在 5 年内没有匹配的时间（如 2 月 30 日）</div>
        <div v-else class="cron-runs">
          <div v-for="(run, index) in runs" :key="index" class="cron-run-row">
            <span class="cron-run-index">{{ index + 1 }}</span>
            <span class="cron-run-time">{{ formatTime(run) }}</span>
            <span class="cron-run-rel">{{ relative(run) }}</span>
          </div>
        </div>

        <div class="section-title">字段拆解</div>
        <ElTable :data="parsed.infos" size="small" border>
          <ElTableColumn prop="name" label="字段" width="52" />
          <ElTableColumn prop="raw" label="表达式" width="76" />
          <ElTableColumn prop="range" label="范围" width="128" />
          <ElTableColumn label="展开值">
            <template #default="{ row }">{{ valuesText(row.values) }}</template>
          </ElTableColumn>
        </ElTable>
      </template>
      <ElAlert v-else :title="parsed.error" type="error" :closable="false" show-icon />
    </template>

    <template #output-actions>
      <CopyButton :text="runsText()" :disabled="!runs.length" />
      <span class="char-count">{{ runs.length }} 次待执行</span>
    </template>
  </ToolLayout>
</template>
