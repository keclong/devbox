<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import { useHistory } from '../composables/useHistory'

const props = defineProps<{ toolId: string }>()
const emit = defineEmits<{
  restore: [data: unknown]
}>()

const { items, remove, clear } = useHistory(props.toolId)
const expanded = ref(true)

function rel(time: number): string {
  const diff = Date.now() - time
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return `${Math.floor(diff / 86400000)} 天前`
}

function onClear(): void {
  clear()
  ElMessage.success('已清空历史记录')
}
</script>

<template>
  <div v-if="items.length" class="history-panel">
    <div class="history-head" @click="expanded = !expanded">
      <span class="history-title">最近记录 · {{ items.length }}</span>
      <span class="history-caret">{{ expanded ? '收起 ▲' : '展开 ▼' }}</span>
      <ElButton link type="danger" size="small" @click.stop="onClear">清空</ElButton>
    </div>
    <div v-show="expanded" class="history-list">
      <div
        v-for="item in items"
        :key="item.id"
        class="history-item"
        @click="emit('restore', item.data)"
      >
        <span class="history-label" :title="item.label">{{ item.label }}</span>
        <span class="history-time">{{ rel(item.time) }}</span>
        <span class="history-del" title="删除这条记录" @click.stop="remove(item.id)">✕</span>
      </div>
    </div>
  </div>
</template>
