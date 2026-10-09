<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElMessage, ElOption, ElSelect } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

const input = ref('')
const output = ref('')
const indent = ref<number | string>(4)
const errorMsg = ref('')

function tryParse(): { ok: boolean; value?: unknown } {
  errorMsg.value = ''
  const text = input.value.trim()
  if (!text) {
    output.value = ''
    ElMessage.info('请输入 JSON 内容')
    return { ok: false }
  }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch (e) {
    errorMsg.value = `解析失败：${(e as Error).message}`
    return { ok: false }
  }
}

function format() {
  const result = tryParse()
  if (!result.ok) return
  output.value = JSON.stringify(result.value, null, indent.value)
}

function minify() {
  const result = tryParse()
  if (!result.ok) return
  output.value = JSON.stringify(result.value)
}

function escapeJson() {
  errorMsg.value = ''
  if (!input.value) {
    ElMessage.info('请输入内容')
    return
  }
  output.value = JSON.stringify(input.value)
}

function unescapeJson() {
  errorMsg.value = ''
  const text = input.value.trim()
  if (!text) {
    ElMessage.info('请输入内容')
    return
  }
  try {
    const value = JSON.parse(text)
    if (typeof value !== 'string') {
      errorMsg.value = '输入不是 JSON 字符串（缺少引号包裹），无法反转义'
      return
    }
    output.value = value
  } catch (e) {
    errorMsg.value = `反转义失败：${(e as Error).message}`
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <ToolLayout title="JSON 工具箱" description="格式化 / 压缩 / 转义 / 反转义，全程本地处理">
    <template #input-actions>
      <ElSelect v-model="indent" size="small" style="width: 120px">
        <ElOption label="缩进 2 空格" :value="2" />
        <ElOption label="缩进 4 空格" :value="4" />
        <ElOption label="缩进 Tab" :value="'\t'" />
      </ElSelect>
      <ElButton size="small" type="primary" @click="format">格式化</ElButton>
      <ElButton size="small" @click="minify">压缩</ElButton>
      <ElButton size="small" @click="escapeJson">转义</ElButton>
      <ElButton size="small" @click="unescapeJson">反转义</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <ElInput
        v-model="input"
        type="textarea"
        resize="none"
        class="fill"
        placeholder='请输入 JSON，例如：{"name":"devbox","stars":100}'
      />
    </template>

    <template #output>
      <ElInput
        v-model="output"
        type="textarea"
        resize="none"
        readonly
        class="fill"
        placeholder="处理结果将显示在这里"
      />
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </template>

    <template #output-actions>
      <CopyButton :text="output" />
      <span class="char-count">{{ output.length }} 字符</span>
    </template>
  </ToolLayout>
</template>
