/** 时间计算逻辑：时间差、日期推算、工作日推算（不含法定节假日） */

export type TimeUnit = 'day' | 'week' | 'month' | 'year'

export interface TimeDiff {
  /** 总毫秒数（b - a） */
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  /** 按自然日计的总跨度（含首尾） */
  calendarDays: number
  /** 区间内周一至周五的天数（不含法定节假日） */
  workdays: number
  /** 是否 a 晚于 b */
  reversed: boolean
}

const DAY_MS = 86400000

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 格式化为 YYYY-MM-DD HH:mm:ss */
export function formatDateTime(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  )
}

/** 格式化为 YYYY-MM-DD */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayLabel(d: Date): string {
  return `周${WEEKDAYS[d.getDay()]}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** 计算两个时间的差：时长组件 + 自然日跨度 + 工作日数 */
export function diffBetween(a: Date, b: Date): TimeDiff {
  const totalMs = b.getTime() - a.getTime()
  const abs = Math.abs(totalMs)
  const days = Math.floor(abs / DAY_MS)
  const rest = abs % DAY_MS
  const hours = Math.floor(rest / 3600000)
  const minutes = Math.floor((rest % 3600000) / 60000)
  const seconds = Math.floor((rest % 60000) / 1000)

  const from = startOfDay(totalMs >= 0 ? a : b)
  const to = startOfDay(totalMs >= 0 ? b : a)
  let calendarDays = 0
  let workdays = 0
  const cur = new Date(from)
  while (cur <= to) {
    calendarDays++
    const wd = cur.getDay()
    if (wd !== 0 && wd !== 6) workdays++
    cur.setDate(cur.getDate() + 1)
  }

  return { totalMs, days, hours, minutes, seconds, calendarDays, workdays, reversed: totalMs < 0 }
}

/** 日期加减：天/周/月/年 */
export function addDuration(base: Date, amount: number, unit: TimeUnit): Date {
  const d = new Date(base)
  switch (unit) {
    case 'day':
      d.setDate(d.getDate() + amount)
      break
    case 'week':
      d.setDate(d.getDate() + amount * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + amount)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + amount)
      break
  }
  return d
}

/** 加减若干个工作日（跳过周六周日；负数向前推） */
export function addWorkdays(base: Date, count: number): Date {
  const d = new Date(base)
  if (count === 0) return d
  const step = count > 0 ? 1 : -1
  let left = Math.abs(count)
  while (left > 0) {
    d.setDate(d.getDate() + step)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d
}

/** 解析 datetime-local 输入值（YYYY-MM-DDTHH:mm）为 Date */
export function parseLocalInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value.trim())
  if (!m) return null
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    m[4] ? Number(m[4]) : 0,
    m[5] ? Number(m[5]) : 0,
  )
  return Number.isNaN(d.getTime()) ? null : d
}

/** 生成 datetime-local 输入框用的值 */
export function toLocalInput(d: Date): string {
  return `${formatDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}
