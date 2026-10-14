<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElButton, ElCheckbox, ElInputNumber, ElMessage, ElProgress, ElSwitch } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import CopyButton from '../../components/CopyButton.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder } from '../../composables/useHistory'
import { entropyBits, generatePassword, strengthOf, type PasswordOptions } from './password'

const options = reactive<PasswordOptions>({
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: true,
  guaranteeEach: true,
})
const count = ref(5)
const results = ref<string[]>([])

const strength = computed(() => strengthOf(options))
const bits = computed(() => Math.round(entropyBits(options)))

function generate() {
  if (options.length < 1) {
    results.value = []
    return
  }
  results.value = Array.from({ length: count.value }, () => generatePassword(options))
}

onMounted(generate)
watch(options, generate)
watch(count, generate)

async function copyOne(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

const configSig = computed(() => JSON.stringify({ o: options, c: count.value }))
const recorder = createRecorder('password')
watch(configSig, () =>
  recorder.schedule(() => ({
    label: `密码 · ${count.value} 个 · ${options.length} 位`,
    data: { options: { ...options }, count: count.value },
  })),
)

function restore(data: unknown): void {
  const d = data as { options?: Partial<PasswordOptions>; count?: unknown }
  if (d.options) Object.assign(options, d.options)
  if (typeof d.count === 'number') count.value = d.count
  generate()
  ElMessage.success('已恢复历史配置')
}
</script>

<template>
  <ToolLayout
    title="密码生成器"
    description="加密安全随机密码（crypto.getRandomValues），支持强度评估与易混字符排除"
  >
    <template #input-actions>
      <ElButton size="small" type="primary" @click="generate">重新生成</ElButton>
    </template>

    <template #input>
      <span class="field-label">长度（{{ options.length }} 位，熵值约 {{ bits }} bits）</span>
      <ElInputNumber v-model="options.length" :min="1" :max="128" />

      <span class="field-label">字符集</span>
      <div class="flag-row">
        <ElCheckbox v-model="options.lower">小写 a-z</ElCheckbox>
        <ElCheckbox v-model="options.upper">大写 A-Z</ElCheckbox>
        <ElCheckbox v-model="options.digits">数字 0-9</ElCheckbox>
        <ElCheckbox v-model="options.symbols">符号</ElCheckbox>
      </div>
      <div class="flag-row">
        <ElSwitch v-model="options.excludeAmbiguous" inline-prompt active-text="排除易混字符" inactive-text="保留易混字符" />
        <ElSwitch v-model="options.guaranteeEach" inline-prompt active-text="每类至少一个" inactive-text="纯随机分布" />
      </div>

      <span class="field-label">数量（1-50）</span>
      <ElInputNumber v-model="count" :min="1" :max="50" />

      <div class="strength-row">
        <ElProgress
          :percentage="strength.percent"
          :color="strength.color"
          :stroke-width="10"
          class="strength-bar"
        />
        <span class="strength-label" :style="{ color: strength.color }">{{ strength.label }}</span>
      </div>

      <HistoryPanel tool-id="password" @restore="restore" />
    </template>

    <template #output>
      <div v-if="!results.length" class="hint">请在左侧至少选择一种字符集</div>
      <div v-else class="gen-list">
        <div
          v-for="(item, index) in results"
          :key="index"
          class="gen-row"
          title="点击复制"
          @click="copyOne(item)"
        >
          <span class="gen-index">{{ index + 1 }}</span>
          <span class="gen-text">{{ item }}</span>
        </div>
      </div>
    </template>

    <template #output-actions>
      <CopyButton :text="results.join('\n')" />
      <span class="char-count">{{ results.length }} 条 · 点击单行复制</span>
    </template>
  </ToolLayout>
</template>

<style scoped>
.flag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.strength-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.strength-bar {
  flex: 1;
}

.strength-label {
  min-width: 34px;
  font-size: 13px;
  font-weight: 600;
}
</style>
