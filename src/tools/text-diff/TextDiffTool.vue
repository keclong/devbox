<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

interface DiffLine {
  type: 'equal' | 'add' | 'del'
  text: string
  leftNo?: number
  rightNo?: number
}

const leftText = ref('')
const rightText = ref('')
const diffResult = ref<DiffLine[] | null>(null)

const stats = computed(() => {
  if (!diffResult.value) return null
  return {
    add: diffResult.value.filter((line) => line.type === 'add').length,
    del: diffResult.value.filter((line) => line.type === 'del').length,
  }
})

/** 供复制的 unified 格式纯文本 */
const diffText = computed(() => {
  if (!diffResult.value) return ''
  return diffResult.value
    .map(
      (line) => `${line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '} ${line.text}`,
    )
    .join('\n')
})

// 输入发生变化后旧结果失效
watch([leftText, rightText], () => {
  diffResult.value = null
})

/** 基于 LCS 的行级 diff */
function diffLines(a: string[], b: string[]): DiffLine[] {
  const n = a.length
  const m = b.length
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', text: a[i], leftNo: i + 1, rightNo: j + 1 })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'del', text: a[i], leftNo: i + 1 })
      i++
    } else {
      result.push({ type: 'add', text: b[j], rightNo: j + 1 })
      j++
    }
  }
  while (i < n) {
    result.push({ type: 'del', text: a[i], leftNo: i + 1 })
    i++
  }
  while (j < m) {
    result.push({ type: 'add', text: b[j], rightNo: j + 1 })
    j++
  }
  return result
}

function runDiff() {
  if (!leftText.value && !rightText.value) {
    ElMessage.info('请先在两侧输入要对比的文本')
    return
  }
  diffResult.value = diffLines(leftText.value.split('\n'), rightText.value.split('\n'))
}

function clearAll() {
  leftText.value = ''
  rightText.value = ''
  diffResult.value = null
}
</script>

<template>
  <ToolLayout title="文本 Diff" description="行级文本对比，高亮显示新增与删除，全程本地处理">
    <template #input-actions>
      <ElButton size="small" type="primary" @click="runDiff">对比</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <span class="field-label">原文</span>
      <ElInput
        v-model="leftText"
        type="textarea"
        resize="none"
        class="fill diff-input"
        placeholder="原始文本"
      />
      <span class="field-label">修改后</span>
      <ElInput
        v-model="rightText"
        type="textarea"
        resize="none"
        class="fill diff-input"
        placeholder="修改后的文本"
      />
    </template>

    <template #output>
      <div v-if="!diffResult" class="hint">点击「对比」按钮查看差异结果</div>
      <template v-else-if="stats && (stats.add > 0 || stats.del > 0)">
        <div class="diff-view">
          <div
            v-for="(line, index) in diffResult"
            :key="index"
            class="diff-line"
            :class="line.type"
          >
            <span class="diff-no">{{ line.leftNo ?? '' }}</span>
            <span class="diff-no">{{ line.rightNo ?? '' }}</span>
            <span class="diff-mark">{{
              line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '
            }}</span>
            <span class="diff-text">{{ line.text || '\u00A0' }}</span>
          </div>
        </div>
      </template>
      <div v-else class="hint">两个文本完全一致</div>
    </template>

    <template #output-actions>
      <CopyButton :text="diffText" />
      <span v-if="stats" class="diff-stats">
        <span class="add-count">+{{ stats.add }}</span>
        <span class="del-count">-{{ stats.del }}</span>
      </span>
    </template>
  </ToolLayout>
</template>
