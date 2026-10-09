<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElCheckbox, ElInput } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import { md5, toHex } from './md5'

interface HashResult {
  name: string
  value: string
}

const input = ref('')
const upper = ref(false)
const results = ref<HashResult[]>([])
const byteLength = ref(0)

const SHA_ALGORITHMS = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']

/** MD5 走本地 RFC 1321 实现；SHA 系列走浏览器 Web Crypto API */
const ALGORITHMS: { name: string; run: (bytes: Uint8Array) => Promise<string> }[] = [
  { name: 'MD5', run: async (bytes) => toHex(md5(bytes)) },
  ...SHA_ALGORITHMS.map((name) => ({
    name,
    run: async (bytes: Uint8Array) =>
      toHex(new Uint8Array(await crypto.subtle.digest(name, bytes))),
  })),
]

// 异步计算防抖：连续输入时丢弃过期的计算结果
let requestId = 0

async function compute() {
  const id = ++requestId
  const text = input.value
  if (!text) {
    results.value = []
    byteLength.value = 0
    return
  }
  const bytes = new TextEncoder().encode(text)
  const entries = await Promise.all(
    ALGORITHMS.map(async (a) => ({ name: a.name, value: await a.run(bytes) })),
  )
  if (id !== requestId) return
  byteLength.value = bytes.length
  results.value = upper.value
    ? entries.map((e) => ({ ...e, value: e.value.toUpperCase() }))
    : entries
}

watch(input, compute)

// 仅切换大小写时本地转换，无需重算
watch(upper, () => {
  results.value = results.value.map((e) => ({
    ...e,
    value: upper.value ? e.value.toUpperCase() : e.value.toLowerCase(),
  }))
})
</script>

<template>
  <ToolLayout title="哈希计算" description="MD5 与 SHA-1/256/384/512，输入即算，全程本地处理">
    <template #input>
      <span class="field-label">原文</span>
      <ElInput
        v-model="input"
        type="textarea"
        resize="none"
        class="fill"
        placeholder="输入要计算哈希的文本"
      />
      <div class="flag-row">
        <ElCheckbox v-model="upper">大写输出</ElCheckbox>
      </div>
    </template>

    <template #output>
      <div v-if="!results.length" class="hint">输入文本后自动计算哈希</div>
      <template v-else>
        <div v-for="row in results" :key="row.name" class="result-row hash-row">
          <span class="label">{{ row.name }}</span>
          <span class="value">{{ row.value }}</span>
          <CopyButton :text="row.value" />
        </div>
      </template>
    </template>

    <template #output-actions>
      <span class="char-count">{{ byteLength }} 字节 · {{ input.length }} 字符</span>
    </template>
  </ToolLayout>
</template>
