<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElColorPicker, ElInput } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'

interface Rgb {
  r: number
  g: number
  b: number
}

const PRESETS = [
  '#f56c6c',
  '#e6a23c',
  '#f7ba2a',
  '#67c23a',
  '#3eaf7c',
  '#409eff',
  '#909399',
  '#303133',
]

const inputText = ref('#3eaf7c')
const pickerColor = ref('#3eaf7c')
const error = ref('')

function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  h = ((h % 360) + 360) % 360
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = ln - c / 2
  let rgb: [number, number, number]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  }
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** 支持 #rgb / #rrggbb / rgb(r,g,b) / hsl(h,s%,l%) */
function parseColor(text: string): Rgb | null {
  const t = text.trim().toLowerCase()
  let m = t.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/)
  if (m) {
    const hex = m[1]
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }
  m = t.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/)
  if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  m = t.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*[\d.]+\s*)?\)$/)
  if (m) return hslToRgb(+m[1], +m[2], +m[3])
  return null
}

const rgb = computed<Rgb | null>(() => {
  const c = parseColor(inputText.value)
  error.value = c ? '' : '无法解析：支持 #hex / #rgb / rgb(r,g,b) / hsl(h,s%,l%)'
  return c
})

const hex = computed(() => (rgb.value ? rgbToHex(rgb.value) : ''))

const rgbStr = computed(() =>
  rgb.value ? `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})` : '',
)

const hslStr = computed(() => {
  if (!rgb.value) return ''
  const { h, s, l } = rgbToHsl(rgb.value)
  return `hsl(${h}, ${s}%, ${l}%)`
})

const rows = computed(() => [
  { label: 'HEX', value: hex.value },
  { label: 'RGB', value: rgbStr.value },
  { label: 'HSL', value: hslStr.value },
])

// 文本输入合法时同步取色器显示
watch(inputText, (v) => {
  const c = parseColor(v)
  if (c) pickerColor.value = rgbToHex(c)
})

function onPick(value: string | null) {
  if (value) inputText.value = value
}
</script>

<template>
  <ToolLayout title="颜色转换" description="HEX / RGB / HSL 互转，带实时预览与取色器，全程本地处理">
    <template #input>
      <span class="field-label">颜色值</span>
      <ElInput
        v-model="inputText"
        class="fill mono"
        placeholder="#3eaf7c / rgb(62,175,124) / hsl(149,46%,46%)"
      />
      <span class="field-label">取色器</span>
      <div class="picker-row">
        <ElColorPicker v-model="pickerColor" @change="onPick" />
        <span class="picker-hex">{{ pickerColor }}</span>
      </div>
      <span class="field-label">快捷颜色</span>
      <div class="preset-row">
        <span
          v-for="color in PRESETS"
          :key="color"
          class="preset-dot"
          :style="{ background: color }"
          :title="color"
          @click="inputText = color"
        />
      </div>
      <p v-if="error" class="error-msg">{{ error }}</p>
    </template>

    <template #output>
      <div class="color-preview" :style="{ background: rgb ? hex : 'transparent' }">
        <span v-if="!rgb" class="preview-empty">无效颜色</span>
      </div>
      <div v-for="row in rows" :key="row.label" class="result-row">
        <span class="label">{{ row.label }}</span>
        <span class="value">{{ row.value || '-' }}</span>
        <CopyButton :text="row.value" />
      </div>
    </template>
  </ToolLayout>
</template>
