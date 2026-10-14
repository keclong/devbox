<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { JSONPATH_EXAMPLES, queryJsonPath } from './jsonpath'

const jsonText = ref('')
const pathText = ref('$.store.book[*].author')

const SAMPLE_JSON = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 },
      { "category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99 }
    ],
    "bicycle": { "color": "red", "price": 19.95 }
  }
}`

const parsed = computed<{ ok: true; data: unknown } | { ok: false; error: string }>(() => {
  if (!jsonText.value.trim()) return { ok: false, error: '请先在左侧粘贴 JSON 数据' }
  try {
    return { ok: true, data: JSON.parse(jsonText.value) }
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${e instanceof Error ? e.message : '格式错误'}` }
  }
})

const result = computed(() => {
  if (!parsed.value.ok) return { ok: false as const, error: parsed.value.error }
  return queryJsonPath(parsed.value.data, pathText.value)
})

const resultText = computed(() => {
  if (!result.value.ok) return ''
  return result.value.nodes.map((node) => JSON.stringify(node.value, null, 2)).join('\n')
})

const recorder = createRecorder('jsonpath')
watch([jsonText, pathText], () => {
  recorder.schedule(() =>
    jsonText.value.trim() && pathText.value.trim()
      ? {
          label: `JSONPath · ${pathText.value}`,
          data: { json: jsonText.value, path: pathText.value },
        }
      : null,
  )
})

function restore(data: unknown): void {
  const d = data as { json?: unknown; path?: unknown }
  if (typeof d.json === 'string') jsonText.value = d.json
  if (typeof d.path === 'string') pathText.value = d.path
  ElMessage.success('已恢复历史输入')
}

function loadSample() {
  jsonText.value = SAMPLE_JSON
}

function useExample(path: string) {
  pathText.value = path
}
</script>

<template>
  <ToolLayout
    title="JSONPath 查询"
    description="自研 JSONPath 引擎：递归下降、通配符、切片、过滤表达式，提取 JSON 数据"
  >
    <template #input-actions>
      <ElButton size="small" @click="loadSample">示例数据</ElButton>
    </template>

    <template #input>
      <span class="field-label">JSON 数据</span>
      <textarea
        v-model="jsonText"
        class="json-input"
        placeholder="粘贴 JSON 数据…"
        rows="10"
        spellcheck="false"
      ></textarea>

      <span class="field-label">JSONPath 表达式</span>
      <input v-model="pathText" class="path-input" placeholder="如 $.store.book[*].author" spellcheck="false" />

      <div class="example-row">
        <span class="example-label">示例：</span>
        <ElButton
          v-for="example in JSONPATH_EXAMPLES"
          :key="example.path"
          size="small"
          text
          type="primary"
          :title="example.path"
          @click="useExample(example.path)"
        >
          {{ example.label }}
        </ElButton>
      </div>

      <div v-if="!parsed.ok && jsonText.trim()" class="error-box">{{ parsed.error }}</div>

      <HistoryPanel tool-id="jsonpath" @restore="restore" />
    </template>

    <template #output>
      <div v-if="!parsed.ok" class="hint">{{ parsed.error }}</div>
      <template v-else-if="result.ok">
        <div class="match-count">匹配 {{ result.nodes.length }} 个节点</div>
        <div v-if="!result.nodes.length" class="hint">没有匹配的节点，请调整表达式</div>
        <div v-else class="result-list">
          <div v-for="(node, index) in result.nodes" :key="index" class="result-item">
            <div class="result-path">{{ node.path }}</div>
            <pre class="result-value">{{ JSON.stringify(node.value, null, 2) }}</pre>
          </div>
        </div>
      </template>
      <div v-else class="error-box">{{ result.error }}</div>
    </template>

    <template #output-actions>
      <CopyButton :text="resultText" />
      <span class="char-count">{{ result.ok ? result.nodes.length : 0 }} 个节点 · 点击复制全部值</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.json-input {
  width: 100%;
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

.json-input:focus,
.path-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.path-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-code-bg);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
}

.example-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.example-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.match-count {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
}

.result-path {
  padding: 6px 12px;
  background: var(--color-surface-secondary);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
}

.result-value {
  margin: 0;
  padding: 10px 12px;
  background: var(--color-code-bg);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-box {
  padding: 12px;
  border-radius: var(--radius);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: 13px;
}
</style>
