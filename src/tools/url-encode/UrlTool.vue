<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

const input = ref('')
const output = ref('')
const errorMsg = ref('')

function encode() {
  errorMsg.value = ''
  if (!input.value) {
    ElMessage.info('请输入要编码的内容')
    return
  }
  output.value = encodeURIComponent(input.value)
}

function decode() {
  errorMsg.value = ''
  const text = input.value.trim()
  if (!text) {
    ElMessage.info('请输入要解码的内容')
    return
  }
  try {
    output.value = decodeURIComponent(text)
  } catch {
    errorMsg.value = 'URL 解码失败：输入包含非法转义序列（如 % 后缺少两位十六进制数）'
  }
}

function clearAll() {
  input.value = ''
  output.value = ''
  errorMsg.value = ''
}
</script>

<template>
  <ToolLayout title="URL 编解码" description="URL 组件编解码，处理查询参数中的特殊字符，全程本地处理">
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
        placeholder='输入要编码的文本，如：name=张三&city=北京，或粘贴 %E5%BC%A0%E4%B8%89 进行解码'
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
