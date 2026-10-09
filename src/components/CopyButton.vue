<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'

const props = defineProps<{
  text: string
  disabled?: boolean
}>()

const copied = ref(false)

async function handleCopy() {
  if (!props.text) return
  try {
    await navigator.clipboard.writeText(props.text)
    copied.value = true
    ElMessage.success('已复制到剪贴板')
    window.setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <ElButton size="small" :disabled="disabled || !text" @click="handleCopy">
    {{ copied ? '已复制' : '复制' }}
  </ElButton>
</template>
