<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElCheckbox, ElMessage, ElOption, ElSelect } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { preview, useHistory } from '../../composables/useHistory'
import { formatSql } from './sql'

const input = ref('')
const output = ref('')
const indent = ref<number | string>(4)
const uppercase = ref(true)

const { add } = useHistory('sql-formatter')

function recordInput(): void {
  if (!input.value.trim()) return
  add(preview(input.value), { input: input.value })
}

function restore(data: unknown): void {
  const value = (data as { input?: unknown }).input
  if (typeof value === 'string') {
    input.value = value
    ElMessage.success('已恢复历史输入')
  }
}

function doFormat() {
  if (!input.value.trim()) {
    ElMessage.info('请输入 SQL 语句')
    return
  }
  output.value = formatSql(input.value, { indent: indent.value, uppercase: uppercase.value })
  recordInput()
}

function clearAll() {
  input.value = ''
  output.value = ''
}

const SAMPLE = `select u.id, u.name, count(o.id) as order_count, sum(o.amount) total from users u left join orders o on o.user_id = u.id and o.status = 'paid' where u.created_at >= '2024-01-01' and u.active = true group by u.id, u.name having count(o.id) > 3 order by total desc limit 20;`

function loadSample() {
  input.value = SAMPLE
}
</script>

<template>
  <ToolLayout title="SQL 格式化" description="美化 SQL 语句：子句换行缩进、关键字大写、字段列表对齐，全程本地处理">
    <template #input-actions>
      <ElSelect v-model="indent" size="small" style="width: 130px">
        <ElOption label="缩进 2 空格" :value="2" />
        <ElOption label="缩进 4 空格" :value="4" />
        <ElOption label="缩进 Tab" :value="'\t'" />
      </ElSelect>
      <ElCheckbox v-model="uppercase" size="small">关键字大写</ElCheckbox>
      <ElButton size="small" type="primary" @click="doFormat">格式化</ElButton>
      <ElButton size="small" @click="loadSample">示例</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <textarea
        v-model="input"
        class="sql-input"
        placeholder="粘贴 SQL 语句，如：select id, name from users where active = true order by id desc"
        spellcheck="false"
      ></textarea>
      <HistoryPanel tool-id="sql-formatter" @restore="restore" />
    </template>

    <template #output>
      <div v-if="!output" class="hint">格式化结果将显示在这里</div>
      <pre v-else class="sql-output"><code>{{ output }}</code></pre>
    </template>

    <template #output-actions>
      <CopyButton :text="output" />
      <span class="char-count">{{ output.length }} 字符</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.sql-input {
  width: 100%;
  min-height: 240px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.sql-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.sql-output {
  margin: 0;
  min-height: 240px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-code-bg);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre;
  overflow-x: auto;
}
</style>