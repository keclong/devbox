/**
 * Cron 表达式解析与下次运行时间计算，零依赖。
 * 支持标准 5 段格式（分 时 日 月 周）、@daily 等宏，
 * 以及 *、列表、范围、步长（以 / 分隔）、月份与星期名称（JAN、MON）。
 */

export interface CronFields {
  minute: Set<number>
  hour: Set<number>
  dayOfMonth: Set<number>
  month: Set<number>
  dayOfWeek: Set<number>
}

export interface FieldInfo {
  /** 字段名，如「分钟」 */
  name: string
  /** 原始表达式片段 */
  raw: string
  /** 取值范围说明 */
  range: string
  /** 解析后的值（升序） */
  values: number[]
}

export type ParseResult =
  | { ok: true; fields: CronFields; infos: FieldInfo[]; description: string }
  | { ok: false; error: string }

interface FieldSpec {
  key: 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek'
  name: string
  min: number
  max: number
  names: readonly string[] | null
  /** 取值范围展示文本 */
  rangeText: string
}

const FIELD_SPECS: FieldSpec[] = [
  { key: 'minute', name: '分钟', min: 0, max: 59, names: null, rangeText: '0-59' },
  { key: 'hour', name: '小时', min: 0, max: 23, names: null, rangeText: '0-23' },
  { key: 'dayOfMonth', name: '日', min: 1, max: 31, names: null, rangeText: '1-31' },
  {
    key: 'month',
    name: '月',
    min: 1,
    max: 12,
    names: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    rangeText: '1-12',
  },
  {
    key: 'dayOfWeek',
    name: '周',
    min: 0,
    max: 7,
    names: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    rangeText: '0-7（0 和 7 均为周日）',
  },
]

const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

const WEEK_CN = ['日', '一', '二', '三', '四', '五', '六']

function parseValue(token: string, spec: FieldSpec): number | null {
  const text = token.trim().toUpperCase()
  if (spec.names) {
    const index = spec.names.indexOf(text)
    if (index >= 0) return spec.min + index
  }
  if (!/^\d+$/.test(text)) return null
  return Number(text)
}

/** 解析单个字段，返回升序值列表 */
function parseField(raw: string, spec: FieldSpec): { values: number[]; error?: string } {
  const values = new Set<number>()
  for (const segment of raw.split(',')) {
    const part = segment.trim()
    if (!part) return { values: [], error: '存在空片段（检查是否有多余的逗号）' }

    let base = part
    let step = 1
    const slash = part.indexOf('/')
    if (slash >= 0) {
      base = part.slice(0, slash)
      const stepText = part.slice(slash + 1)
      if (!/^\d+$/.test(stepText) || Number(stepText) < 1) {
        return { values: [], error: `步长 "${stepText}" 必须是正整数` }
      }
      step = Number(stepText)
    }

    let lo: number
    let hi: number
    if (base === '*') {
      lo = spec.min
      hi = spec.max
    } else {
      const dash = base.indexOf('-')
      const loParsed = parseValue(dash > 0 ? base.slice(0, dash) : base, spec)
      if (loParsed === null) return { values: [], error: `无法解析 "${base}"` }
      lo = loParsed
      if (dash > 0) {
        const hiParsed = parseValue(base.slice(dash + 1), spec)
        if (hiParsed === null) return { values: [], error: `无法解析 "${base}"` }
        hi = hiParsed
      } else {
        // 「a/n」表示从 a 到字段最大值
        hi = slash >= 0 ? spec.max : lo
      }
    }

    if (lo < spec.min || hi > spec.max) {
      return { values: [], error: `"${base}" 超出取值范围 ${spec.rangeText}` }
    }
    if (lo > hi) {
      return { values: [], error: `"${base}" 的起点大于终点` }
    }
    for (let v = lo; v <= hi; v += step) values.add(v)
  }
  // 周字段 7 归一为 0（周日）
  if (spec.key === 'dayOfWeek' && values.has(7)) {
    values.delete(7)
    values.add(0)
  }
  return { values: [...values].sort((a, b) => a - b) }
}

/** 解析 Cron 表达式 */
export function parseCron(expr: string): ParseResult {
  const trimmed = expr.trim()
  if (!trimmed) return { ok: false, error: '请输入 Cron 表达式' }
  if (trimmed.toLowerCase() === '@reboot') {
    return { ok: false, error: '@reboot 表示系统启动时执行，无法推算下次运行时间' }
  }

  const macro = MACROS[trimmed.toLowerCase()]
  const parts = (macro ?? trimmed).split(/\s+/)
  if (parts.length !== 5) {
    return { ok: false, error: `标准格式为 5 段（分 时 日 月 周），当前为 ${parts.length} 段` }
  }

  const fields: CronFields = {
    minute: new Set(),
    hour: new Set(),
    dayOfMonth: new Set(),
    month: new Set(),
    dayOfWeek: new Set(),
  }
  const infos: FieldInfo[] = []
  for (let i = 0; i < FIELD_SPECS.length; i++) {
    const spec = FIELD_SPECS[i]
    const { values, error } = parseField(parts[i], spec)
    if (error) {
      return { ok: false, error: `第 ${i + 1} 段（${spec.name}）"${parts[i]}"：${error}` }
    }
    fields[spec.key] = new Set(values)
    infos.push({ name: spec.name, raw: parts[i], range: spec.rangeText, values })
  }
  return { ok: true, fields, infos, description: describe(fields) }
}

/* ---------- 人类可读描述 ---------- */

function sorted(values: Set<number>): number[] {
  return [...values].sort((a, b) => a - b)
}

function isFull(values: number[], spec: FieldSpec): boolean {
  return spec.key === 'dayOfWeek'
    ? values.length >= 7
    : values.length >= spec.max - spec.min + 1
}

/** 等步长等差数列（至少 3 项）时返回步长，否则 null */
function arithStep(values: number[]): number | null {
  if (values.length < 3) return null
  const step = values[1] - values[0]
  if (step < 1) return null
  return values.every((v, i) => i === 0 || v - values[i - 1] === step) ? step : null
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 循环连续的星期集合（如 五、六、日）返回 [起点, 终点]，否则 null */
function cyclicRun(values: number[]): [number, number] | null {
  const len = values.length
  for (let i = 0; i < len; i++) {
    let ok = true
    for (let k = 1; k < len; k++) {
      if (values[(i + k) % len] !== (values[i] + k) % 7) {
        ok = false
        break
      }
    }
    if (ok) return [values[i], values[(i + len - 1) % len]]
  }
  return null
}

function weekText(values: number[]): string {
  if (values.length === 1) return `每周${WEEK_CN[values[0]]}`
  const run = cyclicRun(values)
  if (run) return `每周${WEEK_CN[run[0]]}至周${WEEK_CN[run[1]]}`
  return `每周${values.map((v) => WEEK_CN[v]).join('、')}`
}

function listText(values: (string | number)[], limit = 8): string {
  const shown = values.slice(0, limit).join('、')
  return values.length > limit ? `${shown} 等` : shown
}

function timeClause(minute: number[], hour: number[]): string {
  const mStep = arithStep(minute)
  const hStep = arithStep(hour)
  const mList = (limit = 8) => listText(minute.map(pad2), limit)
  const hList = (limit = 8) => listText(hour.map(pad2), limit)

  if (minute.length >= 60 && hour.length >= 24) return '每分钟'
  if (hour.length >= 24) {
    if (mStep) return `每 ${mStep} 分钟`
    return `每小时 ${mList(10)} 分`
  }
  if (minute.length === 1 && hour.length === 1) return `${pad2(hour[0])}:${pad2(minute[0])}`
  if (minute.length === 1) {
    if (hStep) return `${pad2(hour[0])} 点起每 ${hStep} 小时的 ${pad2(minute[0])} 分`
    return `${hList()} 点的 ${pad2(minute[0])} 分`
  }
  if (mStep) {
    const hourPart = hStep
      ? hStep === 1
        ? `${pad2(hour[0])}-${pad2(hour[hour.length - 1])} 点`
        : `${pad2(hour[0])} 点起每 ${hStep} 小时`
      : `${hList()} 点`
    return `每 ${mStep} 分钟（${hourPart}）`
  }
  return `${hList()} 点的 ${mList()} 分`
}

function dateClause(dayOfMonth: number[], dayOfWeek: number[], month: number[]): string {
  const domSpec = FIELD_SPECS[2]
  const monthSpec = FIELD_SPECS[3]
  const domFull = isFull(dayOfMonth, domSpec)
  const dowFull = isFull(dayOfWeek, FIELD_SPECS[4])

  let dayText: string
  if (domFull && dowFull) dayText = '每天'
  else if (domFull) dayText = weekText(dayOfWeek)
  else if (dowFull) {
    if (dayOfMonth.length === 1) dayText = `${dayOfMonth[0]} 日`
    else {
      const step = arithStep(dayOfMonth)
      dayText = step ? `每 ${step} 天` : `${listText(dayOfMonth)} 日`
    }
  } else {
    // 标准 Cron 语义：日与周均受限时命中其一即可
    const domPart =
      dayOfMonth.length === 1 ? `${dayOfMonth[0]} 日` : `${listText(dayOfMonth, 6)} 日`
    dayText = `${domPart}或${weekText(dayOfWeek)}`
  }

  if (isFull(month, monthSpec)) {
    // 无月份限制时，「每天 / 每周几」无需前缀，日期需要「每月」
    return dayText === '每天' || dayText.startsWith('每周') ? dayText : `每月 ${dayText}`
  }
  return `${month.map((v) => `${v} 月`).join('、')}的 ${dayText}`
}

/** 生成中文描述，如「每周一至周五 09:00 执行」 */
export function describe(fields: CronFields): string {
  const date = dateClause(sorted(fields.dayOfMonth), sorted(fields.dayOfWeek), sorted(fields.month))
  const time = timeClause(sorted(fields.minute), sorted(fields.hour))
  if (date === '每天' && time.startsWith('每')) return `${time}执行`
  return `${date} ${time}${time.includes(':') ? ' ' : ''}执行`
}

/* ---------- 下次运行时间 ---------- */

/** 标准 Cron 语义：日与周均受限时命中其一即可，否则两者都需命中 */
function matchesDay(fields: CronFields, date: Date): boolean {
  const domHit = fields.dayOfMonth.has(date.getDate())
  const dowHit = fields.dayOfWeek.has(date.getDay())
  const domFull = fields.dayOfMonth.size >= 31
  const dowFull = fields.dayOfWeek.size >= 7
  if (!domFull && !dowFull) return domHit || dowHit
  return domHit && dowHit
}

/**
 * 计算从 from 之后开始的 count 个执行时间（分钟粒度）。
 * 采用跳步策略（不匹配的月/日/小时整段跳过），5 年内无匹配则返回空数组。
 */
export function nextRuns(fields: CronFields, from: Date, count = 10): Date[] {
  const runs: Date[] = []
  const cur = new Date(from)
  cur.setSeconds(0, 0)
  cur.setMinutes(cur.getMinutes() + 1)
  const limit = new Date(from)
  limit.setFullYear(limit.getFullYear() + 5)

  while (runs.length < count && cur < limit) {
    if (!fields.month.has(cur.getMonth() + 1)) {
      cur.setMonth(cur.getMonth() + 1, 1)
      cur.setHours(0, 0, 0, 0)
      continue
    }
    if (!matchesDay(fields, cur)) {
      cur.setDate(cur.getDate() + 1)
      cur.setHours(0, 0, 0, 0)
      continue
    }
    if (!fields.hour.has(cur.getHours())) {
      cur.setHours(cur.getHours() + 1, 0, 0, 0)
      continue
    }
    if (!fields.minute.has(cur.getMinutes())) {
      cur.setMinutes(cur.getMinutes() + 1, 0, 0)
      continue
    }
    runs.push(new Date(cur))
    cur.setMinutes(cur.getMinutes() + 1, 0, 0)
  }
  return runs
}
