<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElInput, ElMessage, ElRadio, ElRadioGroup } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { useHistory } from '../../composables/useHistory'
import { decryptText, encryptText } from './aes'

const mode = ref<'encrypt' | 'decrypt'>('encrypt')
const password = ref('')
const source = ref('')
const result = ref('')
const error = ref('')
const busy = ref(false)

const { add } = useHistory('aes')

async function run() {
  error.value = ''
  result.value = ''
  if (!source.value) {
    error.value = mode.value === 'encrypt' ? '请输入要加密的内容' : '请输入要解密的密文'
    return
  }
  busy.value = true
  try {
    result.value =
      mode.value === 'encrypt'
        ? await encryptText(source.value, password.value)
        : await decryptText(source.value, password.value)
    add(
      mode.value === 'encrypt'
        ? `AES 加密 · ${source.value.length} 字符`
        : `AES 解密 · ${result.value.length} 字符`,
      { mode: mode.value, source: source.value, password: password.value },
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : '操作失败，请重试'
  } finally {
    busy.value = false
  }
}

function restore(data: unknown): void {
  const d = data as { mode?: unknown; source?: unknown; password?: unknown }
  if (d.mode === 'encrypt' || d.mode === 'decrypt') mode.value = d.mode
  if (typeof d.source === 'string') source.value = d.source
  if (typeof d.password === 'string') password.value = d.password
  result.value = ''
  error.value = ''
  ElMessage.success('已恢复历史输入')
}

function swap() {
  // 切换方向时把结果搬运为新的输入，方便连贯操作
  if (result.value) {
    source.value = result.value
    result.value = ''
  }
  error.value = ''
}

function switchMode() {
  mode.value = mode.value === 'encrypt' ? 'decrypt' : 'encrypt'
  swap()
}
</script>

<template>
  <ToolLayout
    title="AES 加解密"
    description="AES-256-GCM 加密 + PBKDF2 密钥派生，随机盐与 IV，全程本地计算"
  >
    <template #input-actions>
      <ElButton
        size="small"
        type="primary"
        :loading="busy"
        @click="run"
      >
        {{ mode === 'encrypt' ? '加密' : '解密' }}
      </ElButton>
      <ElButton size="small" @click="switchMode">
        {{ mode === 'encrypt' ? '切换到解密' : '切换到加密' }}
      </ElButton>
    </template>

    <template #input>
      <ElRadioGroup v-model="mode" @change="swap">
        <ElRadio value="encrypt">加密</ElRadio>
        <ElRadio value="decrypt">解密</ElRadio>
      </ElRadioGroup>

      <span class="field-label">密码（用于 PBKDF2 派生密钥，20 万次迭代）</span>
      <ElInput
        v-model="password"
        type="password"
        show-password
        placeholder="输入密码，解密时需与加密一致"
      />

      <span class="field-label">{{ mode === 'encrypt' ? '明文' : '密文（devbox1: 开头的 base64）' }}</span>
      <textarea
        v-model="source"
        class="aes-input"
        :placeholder="mode === 'encrypt' ? '输入要加密的文本…' : '粘贴要解密的密文…'"
        rows="9"
        spellcheck="false"
      ></textarea>

      <div v-if="password && password.length < 8" class="warn-inline">
        密码少于 8 位，安全性不足，建议使用更长的密码
      </div>

      <HistoryPanel tool-id="aes" @restore="restore" />
    </template>

    <template #output>
      <div v-if="error" class="error-box">{{ error }}</div>
      <div v-else-if="!result" class="hint">
        点击「{{ mode === 'encrypt' ? '加密' : '解密' }}」后在此显示结果。密文格式为
        <code>devbox1:base64(盐|IV|密文)</code>，携带随机盐与 IV，相同明文每次加密结果均不同。
      </div>
      <textarea v-else v-model="result" class="aes-input" rows="9" readonly spellcheck="false"></textarea>
    </template>

    <template #output-actions>
      <CopyButton :text="result" />
      <span class="char-count">AES-256-GCM · PBKDF2-SHA256 ×200000</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.aes-input {
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

.aes-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.error-box {
  padding: 12px;
  border-radius: var(--radius);
  background: var(--color-error-bg);
  color: var(--color-error);
  font-size: 13px;
}

.warn-inline {
  margin-top: 8px;
  color: var(--color-error);
  font-size: 12px;
}
</style>
