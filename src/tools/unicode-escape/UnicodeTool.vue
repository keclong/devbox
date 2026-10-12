<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  ElAlert,
  ElCheckbox,
  ElInput,
  ElMessage,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder, preview } from '../../composables/useHistory'
import {
  analyzeChars,
  escapeText,
  unescapeText,
  ESCAPE_STYLES,
  type EscapeStyle,
} from './unicode'

type Mode = 'escape' | 'unescape'

const mode = ref<Mode>('escape')
const text = ref('')
const style = ref<EscapeStyle>('u')
const onlyNonAscii = ref(true)

const escaped = computed(() => escapeText(text.value, style.value, onlyNonAscii.value))
const unescaped = computed(() => unescapeText(text.value))
const output = computed(() => (mode.value === 'escape' ? escaped.value : unescaped.value.value))

const charInfos = computed(() => analyzeChars(text.value).slice(0, 50))

// 输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('unicode')
watch([text, mode, style, onlyNonAscii], () =>
  recorder.schedule(() =>
    text.value
      ? {
          label: `${preview(text.value, 20)} · ${mode.value === 'escape' ? '转义' : '反转义'}`,
          data: {
            text: text.value,
            mode: mode.value,
            style: style.value,
            onlyNonAscii: onlyNonAscii.value,
          },
        }
      : null,
  ),
)

function restore(data: unknown): void {
  const d = data as {
    text?: unknown
    mode?: unknown
    style?: unknown
    onlyNonAscii?: unknown
  }
  if (typeof d.text !== 'string') return
  text.value = d.text
  if (d.mode === 'escape' || d.mode === 'unescape') mode.value = d.mode
  if (ESCAPE_STYLES.some((s) => s.value === d.style)) style.value = d.style as EscapeStyle
  if (typeof d.onlyNonAscii === 'boolean') onlyNonAscii.value = d.onlyNonAscii
  ElMessage.success('已恢复历史记录')
}
</script>

<template>
  <ToolLayout title="Unicode 转义" description="中文与 Emoji 转 \uXXXX、HTML 实体等，可反转义">
    <template #input>
      <ElRadioGroup v-model="mode">
        <ElRadio value="escape">转义</ElRadio>
        <ElRadio value="unescape">反转义</ElRadio>
      </ElRadioGroup>
      <span class="field-label">原文</span>
      <ElInput
        v-model="text"
        type="textarea"
        resize="none"
        class="fill"
        :placeholder="
          mode === 'escape' ? '输入要转义的文本，如：你好 😀' : '输入转义序列，如：\\u4f60\\u597d 或 &#x4F60;'
        "
      />
      <template v-if="mode === 'escape'">
        <span class="field-label">转义风格</span>
        <ElSelect v-model="style" class="fill">
          <ElOption v-for="s in ESCAPE_STYLES" :key="s.value" :value="s.value" :label="s.label" />
        </ElSelect>
        <div class="flag-row">
          <ElCheckbox v-model="onlyNonAscii">仅转义非 ASCII 字符</ElCheckbox>
        </div>
      </template>
      <p class="hint">反转义自动识别 \u{...}、\uXXXX、\xXX、&#x..;、&#..;、U+XXXX 等写法</p>
      <HistoryPanel tool-id="unicode" @restore="restore" />
    </template>

    <template #output>
      <ElAlert
        v-if="mode === 'unescape' && !unescaped.ok"
        :title="unescaped.error ?? '反转义失败'"
        type="error"
        show-icon
        :closable="false"
      />
      <template v-else>
        <div class="result-area">
          <div class="result-text">{{ output || '（空）' }}</div>
        </div>
        <div class="output-actions">
          <CopyButton :text="output" />
          <span v-if="mode === 'unescape' && unescaped.count" class="action-tip">
            已替换 {{ unescaped.count }} 处
          </span>
        </div>
      </template>
      <div v-if="charInfos.length" class="char-table-wrap">
        <div class="char-table-title">字符码点明细（前 {{ charInfos.length }} 个字符）</div>
        <ElTable :data="charInfos" size="small" border max-height="260">
          <ElTableColumn label="字符" prop="display" width="90" />
          <ElTableColumn label="十进制" prop="codePoint" width="90" />
          <ElTableColumn label="十六进制">
            <template #default="{ row }">
              <span class="mono">U+{{ row.hex }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="UTF-8" width="150">
            <template #default="{ row }">
              <span class="mono">{{ row.utf8.map((b: number) => b.toString(16).padStart(2, '0')).join(' ') }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="UTF-16 码元" prop="utf16Units" width="100" />
        </ElTable>
      </div>
    </template>
  </ToolLayout>
</template>

<style scoped>
.result-area {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px;
  min-height: 120px;
  max-height: 220px;
  overflow-y: auto;
}

.result-text {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 13px;
  word-break: break-all;
  white-space: pre-wrap;
}

.output-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.action-tip {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.char-table-wrap {
  margin-top: 16px;
}

.char-table-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 8px;
}

.mono {
  font-family: 'SFMono-Regular', Consolas, Menlo, monospace;
  font-size: 12px;
}
</style>
