<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { preview, useHistory } from '../../composables/useHistory'

const input = ref('')
const output = ref('')
const errorMsg = ref('')

const { add } = useHistory('base64')

/** 动作成功时记录输入，便于之后一键恢复 */
function recordInput(): void {
  if (!input.value.trim()) return
  add(preview(input.value), { input: input.value })
}

function restore(data: unknown): void {
  const value = (data as { input?: unknown }).input
  if (typeof value !== 'string') return
  input.value = value
  ElMessage.success('已恢复历史输入')
}

/** UTF-8 安全的 Base64 编码（原生 btoa 不支持非拉丁字符） */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

/** UTF-8 安全的 Base64 解码 */
function fromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encode() {
  errorMsg.value = ''
  if (!input.value) {
    ElMessage.info('请输入要编码的内容')
    return
  }
  output.value = toBase64(input.value)
  recordInput()
}

function decode() {
  errorMsg.value = ''
  const text = input.value.trim()
  if (!text) {
    ElMessage.info('请输入要解码的 Base64 内容')
    return
  }
  try {
    output.value = fromBase64(text)
    recordInput()
  } catch {
    errorMsg.value = 'Base64 解码失败：输入包含非法字符'
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <ToolLayout title="Base64 编解码" description="文本与 Base64 互转，完整支持 UTF-8 中文，全程本地处理">
    <template #input-actions>
      <ElButton size="small" type="primary" @click="encode">编码</ElButton>
      <ElButton size="small" @click="decode">解码</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <ElInput
        v-model="input"
        type="textarea"
        resize="none"
        class="fill"
        placeholder="输入要编码的文本，或粘贴 Base64 进行解码"
      />
      <HistoryPanel tool-id="base64" @restore="restore" />
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
