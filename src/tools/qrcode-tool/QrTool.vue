<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElAlert, ElButton, ElColorPicker, ElInput, ElRadio, ElRadioGroup, ElSlider } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import QRCode from 'qrcode'

type Level = 'L' | 'M' | 'Q' | 'H'

const text = ref('https://keclong.github.io/devbox/')
const size = ref(256)
const level = ref<Level>('M')
const margin = ref(2)
const dark = ref('#000000')
const light = ref('#ffffff')
const qrUrl = ref('')
const error = ref('')

// 连续调整参数时丢弃过期的生成结果
let requestId = 0

async function generate(): Promise<void> {
  const id = ++requestId
  error.value = ''
  if (!text.value) {
    qrUrl.value = ''
    return
  }
  try {
    const url = await QRCode.toDataURL(text.value, {
      errorCorrectionLevel: level.value,
      margin: margin.value,
      width: size.value,
      color: { dark: dark.value, light: light.value },
    })
    if (id !== requestId) return
    qrUrl.value = url
  } catch (e) {
    if (id !== requestId) return
    qrUrl.value = ''
    const message = e instanceof Error ? e.message : String(e)
    error.value = message.includes('too big')
      ? '内容过长，超出二维码容量：请提高容错级别或缩短内容'
      : `生成失败：${message}`
  }
}

watch([text, size, level, margin, dark, light], generate, { immediate: true })

function download(): void {
  if (!qrUrl.value) return
  const a = document.createElement('a')
  a.href = qrUrl.value
  a.download = 'qrcode.png'
  a.click()
}
</script>

<template>
  <ToolLayout
    title="二维码生成"
    description="把文本或网址编码为二维码图片，可调尺寸、容错与颜色，全程本地处理"
  >
    <template #input>
      <span class="field-label">内容</span>
      <ElInput
        v-model="text"
        type="textarea"
        resize="none"
        class="fill"
        placeholder="输入要生成二维码的文本或网址"
      />

      <span class="field-label">尺寸（{{ size }} px）</span>
      <ElSlider v-model="size" :min="128" :max="512" :step="32" show-input />

      <span class="field-label">静区宽度（{{ margin }} 模块）</span>
      <ElSlider v-model="margin" :min="0" :max="8" :step="1" show-input />

      <span class="field-label">容错级别</span>
      <ElRadioGroup v-model="level">
        <ElRadio value="L">L（7%）</ElRadio>
        <ElRadio value="M">M（15%）</ElRadio>
        <ElRadio value="Q">Q（25%）</ElRadio>
        <ElRadio value="H">H（30%）</ElRadio>
      </ElRadioGroup>

      <span class="field-label">颜色</span>
      <div class="picker-row">
        <ElColorPicker v-model="dark" />
        <span class="picker-hex">前景 {{ dark }}</span>
        <ElColorPicker v-model="light" />
        <span class="picker-hex">背景 {{ light }}</span>
      </div>
    </template>

    <template #output>
      <div v-if="!text.trim()" class="hint">输入内容后自动生成二维码</div>
      <template v-else-if="qrUrl">
        <div class="qr-preview">
          <img :src="qrUrl" alt="二维码" />
        </div>
        <p class="panel-hint">右键图片可复制或另存，也可点击下方按钮下载 PNG。</p>
      </template>
      <ElAlert v-else-if="error" :title="error" type="error" :closable="false" show-icon />
      <div v-else class="hint">生成中…</div>
    </template>

    <template #output-actions>
      <ElButton size="small" :disabled="!qrUrl" @click="download">下载 PNG</ElButton>
      <span class="char-count">{{ text.length }} 字符 · {{ size }}px · 容错 {{ level }}</span>
    </template>
  </ToolLayout>
</template>
