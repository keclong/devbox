/** Cron 生成器逻辑：可视化选择各字段，拼接为标准 5 段表达式 */

export type FieldKind = 'every' | 'list' | 'range'

export interface FieldSelection {
  kind: FieldKind
  /** list 模式选中的值 */
  values: number[]
  /** range 模式起止（含） */
  start: number
  end: number
  /** 步长：every 模式生成「每 N 单位」，range 模式生成 a-b/N；1 表示不带步长 */
  step: number
}

export type FieldKey = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'

export type GenSelection = Record<FieldKey, FieldSelection>

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 单个字段的选择转表达式片段 */
export function buildFieldText(sel: FieldSelection, min: number, max: number): string {
  switch (sel.kind) {
    case 'every':
      return sel.step > 1 ? `*/${sel.step}` : '*'
    case 'list': {
      const values = [...new Set(sel.values)].filter((v) => v >= min && v <= max).sort((a, b) => a - b)
      return values.length ? values.join(',') : `${min}-${max}`
    }
    case 'range': {
      const lo = Math.min(sel.start, sel.end)
      const hi = Math.max(sel.start, sel.end)
      return sel.step > 1 ? `${lo}-${hi}/${sel.step}` : `${lo}-${hi}`
    }
  }
}

/** 完整选择转标准 5 段表达式 */
export function buildExpr(sel: GenSelection): string {
  return [
    buildFieldText(sel.minute, 0, 59),
    buildFieldText(sel.hour, 0, 23),
    buildFieldText(sel.dayOfMonth, 1, 31),
    buildFieldText(sel.month, 1, 12),
    buildFieldText(sel.dayOfWeek, 0, 7),
  ].join(' ')
}

function every(): FieldSelection {
  return { kind: 'every', values: [], start: 0, end: 59, step: 1 }
}

function list(values: number[], start: number, end: number): FieldSelection {
  return { kind: 'list', values, start, end, step: 1 }
}

function range(start: number, end: number, step = 1): FieldSelection {
  return { kind: 'range', values: [], start, end, step }
}

/** 常用预设：一键填好 5 个字段 */
export interface Preset {
  name: string
  selection: GenSelection
}

export const PRESETS: Preset[] = [
  { name: '每分钟', selection: { minute: every(), hour: every(), dayOfMonth: every(), month: every(), dayOfWeek: every() } },
  {
    name: '每小时',
    selection: {
      minute: list([0], 0, 59),
      hour: every(),
      dayOfMonth: every(),
      month: every(),
      dayOfWeek: every(),
    },
  },
  {
    name: '每天 0 点',
    selection: {
      minute: list([0], 0, 59),
      hour: list([0], 0, 23),
      dayOfMonth: every(),
      month: every(),
      dayOfWeek: every(),
    },
  },
  {
    name: '工作日 9 点',
    selection: {
      minute: list([0], 0, 59),
      hour: list([9], 0, 23),
      dayOfMonth: every(),
      month: every(),
      dayOfWeek: range(1, 5),
    },
  },
  {
    name: '每周一 9 点',
    selection: {
      minute: list([0], 0, 59),
      hour: list([9], 0, 23),
      dayOfMonth: every(),
      month: every(),
      dayOfWeek: list([1], 0, 7),
    },
  },
  {
    name: '每月 1 号',
    selection: {
      minute: list([0], 0, 59),
      hour: list([0], 0, 23),
      dayOfMonth: list([1], 1, 31),
      month: every(),
      dayOfWeek: every(),
    },
  },
  {
    name: '每年 1 月 1 日',
    selection: {
      minute: list([0], 0, 59),
      hour: list([0], 0, 23),
      dayOfMonth: list([1], 1, 31),
      month: list([1], 1, 12),
      dayOfWeek: every(),
    },
  },
]

export const DEFAULT_SELECTION: GenSelection = PRESETS[3].selection

/** 展示用：值的可读标签（周字段转中文） */
const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

export function valueLabel(key: FieldKey, value: number): string {
  if (key === 'dayOfWeek') return `周${WEEK_CN[value]}`
  if (key === 'minute' || key === 'hour') return pad2(value)
  return String(value)
}
