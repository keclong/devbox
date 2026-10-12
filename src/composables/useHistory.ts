import { computed, ref } from 'vue'

export interface HistoryEntry {
  id: string
  /** 列表中展示的摘要文本 */
  label: string
  /** 恢复时回填给工具的数据 */
  data: unknown
  /** 记录时间（毫秒时间戳） */
  time: number
}

/** 记录输入停止变化多久后才写入历史，避免逐字记录刷屏 */
const DEFAULT_DELAY = 1200
/** 每个工具最多保留的历史条数 */
const MAX_PER_TOOL = 10

const STORAGE_KEY = 'devbox:history'

type HistoryStore = Record<string, HistoryEntry[]>

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'string' && typeof e.label === 'string' && typeof e.time === 'number' && 'data' in e
  )
}

/** 读取并清洗本地数据：结构损坏或字段缺失时容错跳过 */
function loadStore(): HistoryStore {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return {}
  }
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const store: HistoryStore = {}
    for (const [toolId, list] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue
      const entries = list.filter(isHistoryEntry).slice(0, MAX_PER_TOOL)
      if (entries.length) store[toolId] = entries
    }
    return store
  } catch {
    return {}
  }
}

function writeStorage(value: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, value)
    return true
  } catch {
    return false
  }
}

/** 模块级单例：所有工具共享同一份历史，切页面不丢失 */
const state = ref<HistoryStore>(loadStore())

function persist(store: HistoryStore): void {
  state.value = store
  if (writeStorage(JSON.stringify(store))) return
  // 写入失败（通常是配额超出）：丢弃各工具较早的一半记录后重试一次
  const trimmed: HistoryStore = {}
  for (const [toolId, list] of Object.entries(store)) {
    trimmed[toolId] = list.slice(0, Math.ceil(MAX_PER_TOOL / 2))
  }
  if (writeStorage(JSON.stringify(trimmed))) state.value = trimmed
  // 仍然失败（如隐私模式）时保持纯内存历史，不影响当次使用
}

function nextId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** 内容相同的记录只保留一条：重新记录时移到最前 */
function entryKey(label: string, data: unknown): string {
  return JSON.stringify([label, data])
}

export function useHistory(toolId: string) {
  const items = computed<HistoryEntry[]>(() => state.value[toolId] ?? [])

  function add(label: string, data: unknown): void {
    const key = entryKey(label, data)
    const kept = (state.value[toolId] ?? []).filter((e) => entryKey(e.label, e.data) !== key)
    persist({
      ...state.value,
      [toolId]: [{ id: nextId(), label, data, time: Date.now() }, ...kept].slice(0, MAX_PER_TOOL),
    })
  }

  function remove(id: string): void {
    const list = state.value[toolId]
    if (!list) return
    const filtered = list.filter((e) => e.id !== id)
    const next = { ...state.value }
    if (filtered.length) next[toolId] = filtered
    else delete next[toolId]
    persist(next)
  }

  function clear(): void {
    if (!state.value[toolId]) return
    const next = { ...state.value }
    delete next[toolId]
    persist(next)
  }

  return { items, add, remove, clear }
}

export interface HistoryDraft {
  label: string
  data: unknown
}

export interface Recorder {
  /** 安排一次防抖记录；build 返回 null 表示不记录 */
  schedule: (build: () => HistoryDraft | null) => void
}

/** 创建防抖记录器：供实时计算类工具在输入停止变化后自动记录 */
export function createRecorder(toolId: string, delay = DEFAULT_DELAY): Recorder {
  const { add } = useHistory(toolId)
  let timer: ReturnType<typeof setTimeout> | undefined
  return {
    schedule(build) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        const draft = build()
        if (draft) add(draft.label, draft.data)
      }, delay)
    },
  }
}

/** 生成单行摘要：折叠空白并按长度截断，用于历史列表展示 */
export function preview(text: string, max = 36): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}
