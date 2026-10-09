<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElButton, ElTag } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

interface JwtInfo {
  header: Record<string, unknown>
  payload: Record<string, unknown>
}

/** jwt.io 官方示例 Token，用于默认展示 */
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const token = ref(SAMPLE)
const decoded = ref<JwtInfo | null>(null)
const error = ref('')

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/')
  const withPad = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')
  const binary = atob(withPad)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function decode() {
  error.value = ''
  const text = token.value.trim()
  if (!text) {
    decoded.value = null
    return
  }
  const parts = text.split('.')
  if (parts.length !== 3) {
    decoded.value = null
    error.value = 'JWT 格式错误：应由 header.payload.signature 三段组成'
    return
  }
  try {
    decoded.value = {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
    }
  } catch {
    decoded.value = null
    error.value = '解码失败：header 或 payload 不是合法的 Base64Url 编码 JSON'
  }
}

watch(token, decode, { immediate: true })

function formatTs(v: unknown): string {
  return typeof v === 'number'
    ? new Date(v * 1000).toLocaleString('zh-CN', { hour12: false })
    : '-'
}

const timeInfo = computed(() => {
  if (!decoded.value) return null
  const p = decoded.value.payload
  const exp = typeof p.exp === 'number' ? p.exp : null
  const status: 'expired' | 'valid' | 'none' =
    exp === null ? 'none' : Date.now() / 1000 > exp ? 'expired' : 'valid'
  return {
    issuedAt: formatTs(p.iat),
    notBefore: formatTs(p.nbf),
    expiresAt: formatTs(p.exp),
    status,
  }
})

const statusText = computed(() =>
  timeInfo.value?.status === 'expired'
    ? '已过期'
    : timeInfo.value?.status === 'valid'
      ? '有效'
      : '未设置过期时间',
)

const statusType = computed<'success' | 'danger' | 'info'>(() =>
  timeInfo.value?.status === 'expired'
    ? 'danger'
    : timeInfo.value?.status === 'valid'
      ? 'success'
      : 'info',
)

const headerJson = computed(() => JSON.stringify(decoded.value?.header ?? {}, null, 2))
const payloadJson = computed(() => JSON.stringify(decoded.value?.payload ?? {}, null, 2))

function clearAll() {
  token.value = ''
  decoded.value = null
  error.value = ''
}
</script>

<template>
  <ToolLayout
    title="JWT 解析"
    description="解码 JWT 的 Header 与 Payload，检查过期时间；签名验证需要密钥，不在浏览器端进行"
  >
    <template #input-actions>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <span class="field-label">JWT</span>
      <ElInput
        v-model="token"
        type="textarea"
        resize="none"
        class="fill mono"
        placeholder="粘贴 JWT，格式为 xxxxxx.yyyyyy.zzzzzz"
      />
      <p v-if="error" class="error-msg">{{ error }}</p>
      <template v-if="decoded">
        <span class="field-label">摘要</span>
        <div class="result-row">
          <span class="label">算法</span>
          <span class="value">{{ decoded.header.alg ?? '-' }}</span>
        </div>
        <div class="result-row">
          <span class="label">类型</span>
          <span class="value">{{ decoded.header.typ ?? '-' }}</span>
        </div>
      </template>
    </template>

    <template #output>
      <div v-if="!decoded" class="hint">在左侧粘贴 JWT 后自动解析</div>
      <template v-else>
        <div class="jwt-card">
          <div class="jwt-card-head">
            <span class="jwt-card-title">Header</span>
            <CopyButton :text="headerJson" />
          </div>
          <pre class="json-view">{{ headerJson }}</pre>
        </div>
        <div class="jwt-card">
          <div class="jwt-card-head">
            <span class="jwt-card-title">Payload</span>
            <CopyButton :text="payloadJson" />
          </div>
          <pre class="json-view">{{ payloadJson }}</pre>
        </div>
        <div v-if="timeInfo" class="jwt-card">
          <div class="jwt-card-head">
            <span class="jwt-card-title">时间声明</span>
            <ElTag :type="statusType" size="small">{{ statusText }}</ElTag>
          </div>
          <div class="result-row">
            <span class="label">签发时间</span>
            <span class="value">{{ timeInfo.issuedAt }}</span>
          </div>
          <div class="result-row">
            <span class="label">生效时间</span>
            <span class="value">{{ timeInfo.notBefore }}</span>
          </div>
          <div class="result-row">
            <span class="label">过期时间</span>
            <span class="value">{{ timeInfo.expiresAt }}</span>
          </div>
        </div>
      </template>
    </template>
  </ToolLayout>
</template>
