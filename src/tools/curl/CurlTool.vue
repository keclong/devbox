<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElMessage, ElOption, ElSelect } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { parseCurl } from './curl'
import { generateCode, LANGUAGES } from './codegen'

const input = ref('')
const lang = ref('python')

const parsed = computed(() => parseCurl(input.value))

const code = computed(() => {
  if (!parsed.value.ok) return ''
  return generateCode(parsed.value.request, lang.value)
})

const SAMPLE = `curl 'https://api.example.com/v1/users' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer your-token' \\
  --data-raw '{"name":"张三","email":"zhangsan@example.com","active":true}'`

function loadSample() {
  input.value = SAMPLE
}

function clearAll() {
  input.value = ''
}

// 输入停止 1.2 秒后自动记录，便于一键恢复常用命令
const recorder = createRecorder('curl')
watch(input, () => {
  recorder.schedule(() =>
    input.value.trim() ? { label: previewCmd(input.value), data: { curl: input.value } } : null,
  )
})

function previewCmd(cmd: string): string {
  const flat = cmd.replace(/\s+/g, ' ').trim()
  return flat.length > 40 ? `${flat.slice(0, 40)}…` : flat
}

function restore(data: unknown): void {
  const value = (data as { curl?: unknown }).curl
  if (typeof value === 'string') {
    input.value = value
    ElMessage.success('已恢复历史命令')
  }
}
</script>

<template>
  <ToolLayout
    title="cURL 转代码"
    description="解析 cURL 命令，生成各主流语言等价请求代码，全程本地处理"
  >
    <template #input-actions>
      <ElButton size="small" @click="loadSample">示例命令</ElButton>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <textarea
        v-model="input"
        class="curl-input"
        placeholder="粘贴 cURL 命令，如：curl 'https://api.example.com' -H 'Content-Type: application/json' -d '...'"
        spellcheck="false"
      ></textarea>
      <p v-if="parsed.ok && parsed.warnings.length" class="warn-msg">
        {{ parsed.warnings.join('；') }}
      </p>
      <p v-if="!parsed.ok && input.trim()" class="error-msg">{{ parsed.error }}</p>
      <HistoryPanel tool-id="curl" @restore="restore" />
    </template>

    <template #output>
      <div class="lang-row">
        <span class="field-label">目标语言</span>
        <ElSelect v-model="lang" size="small" style="width: 220px">
          <ElOption
            v-for="l in LANGUAGES"
            :key="l.id"
            :value="l.id"
            :label="l.label"
          />
        </ElSelect>
      </div>

      <div v-if="!code" class="hint">在左侧粘贴 cURL 命令后，此处生成对应语言代码</div>
      <pre v-else class="code-output"><code>{{ code }}</code></pre>
    </template>

    <template #output-actions>
      <CopyButton :text="code" />
      <span class="char-count">{{ code.length }} 字符 · {{ LANGUAGES.find((l) => l.id === lang)?.label }}</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.curl-input {
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

.curl-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.lang-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.field-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}

.code-output {
  margin: 0;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-code-bg);
  color: var(--color-text);
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}

.warn-msg {
  margin-top: 8px;
  color: #e6a23c;
  font-size: 12px;
}

.error-msg {
  margin-top: 8px;
  color: var(--color-error);
  font-size: 12px;
}
</style>