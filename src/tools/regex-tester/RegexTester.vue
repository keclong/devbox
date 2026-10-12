<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElButton, ElCheckbox, ElInput, ElMessage } from 'element-plus'
import ToolLayout from '../../components/ToolLayout.vue'
import HistoryPanel from '../../components/HistoryPanel.vue'
import { createRecorder, preview } from '../../composables/useHistory'

interface MatchInfo {
  full: string
  start: number
  end: number
  groups: (string | undefined)[]
  named: [string, string | undefined][]
}

const MAX_MATCHES = 1000

const pattern = ref('(\\w+)@(\\w+)\\.com')
const testText = ref('联系列表：alice@example.com、bob@test.com，无效地址：not-an-email。')
const flags = reactive({ i: false, m: false, s: false, u: false, y: false })

const flagStr = computed(() =>
  Object.entries(flags)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)
    .join(''),
)

// 输入停止变化 1.2 秒后自动记录，避免逐字记录
const recorder = createRecorder('regex')
watch([pattern, testText, flagStr], () =>
  recorder.schedule(() =>
    pattern.value && testText.value
      ? {
          label: `/${pattern.value}/${flagStr.value} · ${preview(testText.value, 16)}`,
          data: {
            pattern: pattern.value,
            testText: testText.value,
            flags: { ...flags },
          },
        }
      : null,
  ),
)

function restore(data: unknown): void {
  const d = data as {
    pattern?: unknown
    testText?: unknown
    flags?: Record<string, unknown>
  }
  if (typeof d.pattern !== 'string' || typeof d.testText !== 'string') return
  pattern.value = d.pattern
  testText.value = d.testText
  const f = d.flags ?? {}
  flags.i = f.i === true
  flags.m = f.m === true
  flags.s = f.s === true
  flags.u = f.u === true
  flags.y = f.y === true
  ElMessage.success('已恢复历史记录')
}

const regexError = ref('')

/** 编译后的正则；内部始终附加 g 标志以支持遍历全部匹配 */
const regex = computed(() => {
  if (!pattern.value) {
    regexError.value = ''
    return null
  }
  try {
    const re = new RegExp(pattern.value, Array.from(new Set(flagStr.value + 'g')).join(''))
    regexError.value = ''
    return re
  } catch (e) {
    regexError.value = `正则语法错误：${(e as Error).message}`
    return null
  }
})

const matches = computed<MatchInfo[]>(() => {
  const re = regex.value
  if (!re || !testText.value) return []
  const result: MatchInfo[] = []
  for (const m of testText.value.matchAll(re)) {
    result.push({
      full: m[0],
      start: m.index ?? 0,
      end: (m.index ?? 0) + m[0].length,
      groups: m.slice(1),
      named: m.groups ? Object.entries(m.groups) : [],
    })
    if (result.length >= MAX_MATCHES) break
  }
  return result
})

/** 将文本按匹配范围切分为高亮片段 */
const segments = computed(() => {
  const text = testText.value
  if (!text) return []
  const list = matches.value
  if (!list.length) return [{ text, match: false }]
  const segs: { text: string; match: boolean }[] = []
  let cursor = 0
  for (const m of list) {
    if (m.start > cursor) segs.push({ text: text.slice(cursor, m.start), match: false })
    if (m.end > m.start) segs.push({ text: text.slice(m.start, m.end), match: true })
    cursor = Math.max(cursor, m.end)
  }
  if (cursor < text.length) segs.push({ text: text.slice(cursor), match: false })
  return segs
})

function clearAll() {
  pattern.value = ''
  testText.value = ''
}
</script>

<template>
  <ToolLayout title="正则测试" description="实时匹配高亮与捕获组展示，默认全局匹配，全程本地处理">
    <template #input-actions>
      <ElButton size="small" @click="clearAll">清空</ElButton>
    </template>

    <template #input>
      <span class="field-label">正则表达式</span>
      <ElInput
        v-model="pattern"
        class="fill regex-pattern"
        placeholder="输入正则表达式，如 (\w+)@(\w+)\.com"
      />
      <div class="flag-row">
        <ElCheckbox v-model="flags.i" label="i" title="忽略大小写" />
        <ElCheckbox v-model="flags.m" label="m" title="多行模式：^ $ 匹配每行首尾" />
        <ElCheckbox v-model="flags.s" label="s" title=". 匹配换行符" />
        <ElCheckbox v-model="flags.u" label="u" title="Unicode 模式" />
        <ElCheckbox v-model="flags.y" label="y" title="粘性匹配：从 lastIndex 处开始" />
      </div>
      <span class="field-label">测试文本</span>
      <ElInput
        v-model="testText"
        type="textarea"
        resize="none"
        class="fill"
        placeholder="输入用于测试的文本"
      />
      <HistoryPanel tool-id="regex" @restore="restore" />
    </template>

    <template #output>
      <p v-if="regexError" class="error-msg">{{ regexError }}</p>
      <div v-else-if="!pattern" class="hint">输入正则表达式后实时查看匹配结果</div>
      <div v-else-if="!testText" class="hint">输入测试文本</div>
      <div v-else-if="!matches.length" class="hint">未找到匹配</div>
      <div v-else class="highlight-view">
        <span v-for="(seg, index) in segments" :key="index" :class="{ hl: seg.match }">{{
          seg.text || '\u00A0'
        }}</span>
      </div>
    </template>
  </ToolLayout>

  <section v-if="matches.length" class="regex-matches">
    <h3 class="section-title">
      匹配结果（{{ matches.length }} 处<span v-if="matches.length >= MAX_MATCHES">，仅显示前 {{ MAX_MATCHES }} 处</span>）
    </h3>
    <div class="match-list">
      <div v-for="(m, index) in matches" :key="index" class="match-card">
        <div class="match-head">
          <span class="match-index">#{{ index + 1 }}</span>
          <span>位置 [{{ m.start }}, {{ m.end }})</span>
        </div>
        <div class="match-full">{{ m.full || '(空匹配)' }}</div>
        <template v-if="m.groups.length || m.named.length">
          <div class="match-groups">
            <div v-for="(g, gi) in m.groups" :key="'g' + gi" class="group-row">
              <span class="group-key">${{ gi + 1 }}</span>
              <span class="group-val">{{ g ?? '(未参与匹配)' }}</span>
            </div>
            <div v-for="([name, val], ni) in m.named" :key="'n' + ni" class="group-row">
              <span class="group-key">&lt;{{ name }}&gt;</span>
              <span class="group-val">{{ val ?? '(未参与匹配)' }}</span>
            </div>
          </div>
        </template>
        <div v-else class="match-groups-empty">无捕获组</div>
      </div>
    </div>
  </section>
</template>
