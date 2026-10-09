<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { ElButton, ElCheckbox, ElInputNumber, ElMessage, ElRadio, ElRadioGroup } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

type Mode = 'uuid' | 'string'

const mode = ref<Mode>('uuid')
const count = ref(5)
const uuidOpts = reactive({ upper: false, noHyphen: false, braces: false })
const strOpts = reactive({ length: 16, digits: true, lower: true, upper: true, symbols: false })
const results = ref<string[]>([])

const CHARSETS = {
  digits: '0123456789',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
}

/** 拒绝采样，避免取模偏差 */
function randomInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}

function uuidV4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // 回退：基于 getRandomValues 手动构造 v4
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function generate() {
  if (mode.value === 'uuid') {
    results.value = Array.from({ length: count.value }, () => {
      let id = uuidV4()
      if (uuidOpts.noHyphen) id = id.replace(/-/g, '')
      if (uuidOpts.upper) id = id.toUpperCase()
      if (uuidOpts.braces) id = `{${id}}`
      return id
    })
    return
  }
  const charset =
    (strOpts.digits ? CHARSETS.digits : '') +
    (strOpts.lower ? CHARSETS.lower : '') +
    (strOpts.upper ? CHARSETS.upper : '') +
    (strOpts.symbols ? CHARSETS.symbols : '')
  if (!charset) {
    results.value = []
    return
  }
  results.value = Array.from({ length: count.value }, () =>
    Array.from({ length: strOpts.length }, () => charset[randomInt(charset.length)]).join(''),
  )
}

async function copyOne(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

onMounted(generate)

// 选项变化时自动重新生成
watch(mode, generate)
watch(count, generate)
watch(uuidOpts, generate)
watch(strOpts, generate)
</script>

<template>
  <ToolLayout
    title="UUID / 随机字符串生成"
    description="批量生成 UUID v4 与加密安全随机字符串，全程本地处理"
  >
    <template #input-actions>
      <ElButton size="small" type="primary" @click="generate">重新生成</ElButton>
    </template>

    <template #input>
      <span class="field-label">类型</span>
      <ElRadioGroup v-model="mode">
        <ElRadio value="uuid">UUID v4</ElRadio>
        <ElRadio value="string">随机字符串</ElRadio>
      </ElRadioGroup>

      <span class="field-label">数量（1-100）</span>
      <ElInputNumber v-model="count" :min="1" :max="100" />

      <template v-if="mode === 'uuid'">
        <span class="field-label">格式选项</span>
        <div class="flag-row">
          <ElCheckbox v-model="uuidOpts.upper">大写</ElCheckbox>
          <ElCheckbox v-model="uuidOpts.noHyphen">去连字符</ElCheckbox>
          <ElCheckbox v-model="uuidOpts.braces">花括号</ElCheckbox>
        </div>
      </template>
      <template v-else>
        <span class="field-label">长度（1-128）</span>
        <ElInputNumber v-model="strOpts.length" :min="1" :max="128" />
        <span class="field-label">字符集</span>
        <div class="flag-row">
          <ElCheckbox v-model="strOpts.digits">数字 0-9</ElCheckbox>
          <ElCheckbox v-model="strOpts.lower">小写 a-z</ElCheckbox>
          <ElCheckbox v-model="strOpts.upper">大写 A-Z</ElCheckbox>
          <ElCheckbox v-model="strOpts.symbols">符号</ElCheckbox>
        </div>
      </template>
    </template>

    <template #output>
      <div v-if="!results.length" class="hint">请在左侧至少选择一种字符集</div>
      <div v-else class="gen-list">
        <div
          v-for="(item, index) in results"
          :key="index"
          class="gen-row"
          title="点击复制"
          @click="copyOne(item)"
        >
          <span class="gen-index">{{ index + 1 }}</span>
          <span class="gen-text">{{ item }}</span>
        </div>
      </div>
    </template>

    <template #output-actions>
      <CopyButton :text="results.join('\n')" />
      <span class="char-count">{{ results.length }} 条 · 点击单行复制</span>
    </template>
  </ToolLayout>
</template>
