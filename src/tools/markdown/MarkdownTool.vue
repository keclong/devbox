<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { renderMarkdown } from './markdown'

const source = ref('')

const html = computed(() => renderMarkdown(source.value))

const recorder = createRecorder('markdown')
watch(source, () => {
  recorder.schedule(() =>
    source.value.trim()
      ? { label: `Markdown · ${source.value.length} 字符`, data: source.value }
      : null,
  )
})

function restore(data: unknown): void {
  if (typeof data === 'string') {
    source.value = data
    ElMessage.success('已恢复历史输入')
  }
}

const SAMPLE = `# DevBox Markdown 编辑器

支持 **粗体**、*斜体*、~~删除线~~、\`行内代码\` 与 [链接](https://github.com)。

## 列表示例

- 无序列表项
- 支持 *嵌套*
  1. 有序子列表
  2. 第二项
- [x] 任务列表（已完成）
- [ ] 任务列表（未完成）

## 代码块

\`\`\`js
function hello(name) {
  return \`Hello, \${name}!\`
}
\`\`\`

## 表格

| 工具 | 分类 | 状态 |
|------|:----:|-----:|
| JSON | 格式 | 完成 |
| Diff | 格式 | 完成 |

## 引用与分割线

> 支持嵌套引用与分割线。

---

1. 第一项
2. 第二项
`

function loadSample() {
  source.value = SAMPLE
}

function clearAll() {
  source.value = ''
}
</script>

<template>
  <ToolLayout
    title="Markdown 编辑器"
    description="实时渲染 Markdown，自研解析器零依赖，输出经 XSS 转义防护"
  >
    <template #input-actions>
      <ElButton size="small" @click="loadSample">示例文档</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
      <CopyButton :text="source" />
    </template>

    <template #input>
      <textarea
        v-model="source"
        class="md-input"
        placeholder="在此输入 Markdown 源码，右侧实时预览…"
        spellcheck="false"
      ></textarea>
      <HistoryPanel tool-id="markdown" @restore="restore" />
    </template>

    <template #output>
      <div v-if="!source.trim()" class="hint">预览区域：输入 Markdown 后实时渲染</div>
      <div v-else class="md-preview" v-html="html"></div>
    </template>

    <template #output-actions>
      <CopyButton :text="html" />
      <span class="char-count">{{ source.length }} 字符 · 可复制渲染后的 HTML</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.md-input {
  width: 100%;
  min-height: 480px;
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

.md-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.md-preview {
  min-height: 480px;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  line-height: 1.7;
  word-break: break-word;
}

.md-preview :deep(h1),
.md-preview :deep(h2) {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 6px;
}

.md-preview :deep(h1) { font-size: 22px; }
.md-preview :deep(h2) { font-size: 18px; }
.md-preview :deep(h3) { font-size: 16px; }
.md-preview :deep(h1),
.md-preview :deep(h2),
.md-preview :deep(h3),
.md-preview :deep(h4) {
  margin: 16px 0 8px;
}

.md-preview :deep(p) {
  margin: 8px 0;
}

.md-preview :deep(a) {
  color: var(--color-primary);
}

.md-preview :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 14px;
  border-left: 3px solid var(--color-primary);
  background: var(--color-code-bg);
  color: var(--color-text-secondary);
}

.md-preview :deep(code) {
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-hl-bg);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 0.92em;
}

.md-preview :deep(pre) {
  margin: 10px 0;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--color-code-bg);
  overflow-x: auto;
}

.md-preview :deep(pre code) {
  padding: 0;
  background: none;
  font-size: 12.5px;
  line-height: 1.6;
}

.md-preview :deep(table) {
  margin: 10px 0;
  border-collapse: collapse;
  font-size: 13px;
}

.md-preview :deep(th),
.md-preview :deep(td) {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
}

.md-preview :deep(th) {
  background: var(--color-code-bg);
}

.md-preview :deep(img) {
  max-width: 100%;
}

.md-preview :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--color-border);
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.md-preview :deep(li) {
  margin: 3px 0;
}

.md-preview :deep(input[type='checkbox']) {
  margin-right: 6px;
}
</style>
