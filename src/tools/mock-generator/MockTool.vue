<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ElButton,
  ElCheckbox,
  ElInputNumber,
  ElRadio,
  ElRadioGroup,
  ElTable,
  ElTableColumn,
} from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import { FIELDS, generateRows, toCsv, type FieldKey } from './mock'

const count = ref(10)
const selected = reactive<Record<FieldKey, boolean>>({
  name: true,
  phone: true,
  email: true,
  idcard: false,
  city: true,
  address: false,
  company: false,
  ip: false,
  url: false,
  date: true,
  uuid: false,
  number: true,
  boolean: false,
})
const numberRange = reactive({ min: 1, max: 1000 })
const format = ref<'json' | 'csv'>('json')
const rows = ref<Record<string, string>[]>([])

const activeFields = computed(() => FIELDS.filter((f) => selected[f.key]))
const labelMap = computed<Record<string, string>>(() =>
  Object.fromEntries(activeFields.value.map((f) => [f.key, f.label])),
)

const copyText = computed(() => {
  if (!rows.value.length) return ''
  return format.value === 'json'
    ? JSON.stringify(rows.value, null, 2)
    : toCsv(rows.value, labelMap.value)
})

function generate(): void {
  const keys = activeFields.value.map((f) => f.key)
  rows.value = keys.length ? generateRows(keys, count.value, numberRange) : []
}

watch(selected, generate)
watch(count, generate)
watch(numberRange, generate)
onMounted(generate)
</script>

<template>
  <ToolLayout
    title="Mock 数据生成"
    description="生成姓名、手机号、邮箱等测试假数据，支持 JSON / CSV，全程本地处理"
  >
    <template #input-actions>
      <ElButton size="small" type="primary" @click="generate">重新生成</ElButton>
    </template>

    <template #input>
      <span class="field-label">数量（1-500）</span>
      <ElInputNumber v-model="count" :min="1" :max="500" />

      <span class="field-label">字段（{{ activeFields.length }} / {{ FIELDS.length }}）</span>
      <div class="flag-row">
        <ElCheckbox v-for="f in FIELDS" :key="f.key" v-model="selected[f.key]">
          {{ f.label }}
        </ElCheckbox>
      </div>

      <template v-if="selected.number">
        <span class="field-label">数字范围</span>
        <div class="mock-range">
          <ElInputNumber v-model="numberRange.min" size="small" :min="-999999" :max="999999" />
          <span>-</span>
          <ElInputNumber v-model="numberRange.max" size="small" :min="-999999" :max="999999" />
        </div>
      </template>

      <p class="panel-hint">身份证号为随机生成的假数据（含有效校验位），仅用于测试。</p>
    </template>

    <template #output>
      <div v-if="!rows.length" class="hint">请至少选择一个字段</div>
      <div v-else class="mock-table-wrap">
        <ElTable :data="rows" size="small" border show-overflow-tooltip>
          <ElTableColumn
            v-for="f in activeFields"
            :key="f.key"
            :prop="f.key"
            :label="f.label"
            min-width="96"
          />
        </ElTable>
      </div>
    </template>

    <template #output-actions>
      <ElRadioGroup v-model="format" size="small">
        <ElRadio value="json">JSON</ElRadio>
        <ElRadio value="csv">CSV</ElRadio>
      </ElRadioGroup>
      <CopyButton :text="copyText" :disabled="!copyText" />
      <span class="char-count">{{ rows.length }} 条 · {{ activeFields.length }} 字段</span>
    </template>
  </ToolLayout>
</template>
