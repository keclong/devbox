/** 进制转换逻辑：2-36 进制互转，基于 BigInt 与分数长除法，支持小数部分 */

export interface ConvertResult {
  ok: boolean
  value: string
  error?: string
}

export const MIN_RADIX = 2
export const MAX_RADIX = 36

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** 常用进制展示顺序 */
export const COMMON_RADICES = [2, 8, 10, 16]

interface Fraction {
  /** 分子 */
  num: bigint
  /** 分母 */
  den: bigint
}

function digitValue(ch: string): number {
  const v = DIGITS.indexOf(ch.toLowerCase())
  return v
}

/** 解析输入：符号 + 整数部分 + 小数部分（小数用分数精确表示） */
function parseNumber(text: string, radix: number): { sign: string; int: bigint; frac: Fraction } | string {
  let s = text.trim().toLowerCase()
  if (!s) return '输入为空'
  let sign = ''
  if (s.startsWith('-')) {
    sign = '-'
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  // 去掉与进制匹配的常见前缀
  if (radix === 16 && s.startsWith('0x')) s = s.slice(2)
  else if (radix === 2 && s.startsWith('0b')) s = s.slice(2)
  else if (radix === 8 && s.startsWith('0o')) s = s.slice(2)
  if (!s) return '输入为空'

  const dot = s.indexOf('.')
  const intPart = dot === -1 ? s : s.slice(0, dot)
  const fracPart = dot === -1 ? '' : s.slice(dot + 1)
  if (!intPart && !fracPart) return '输入为空'
  if (fracPart.includes('.')) return '小数点只能出现一次'

  let int = 0n
  for (const ch of intPart) {
    const d = digitValue(ch)
    if (d < 0 || d >= radix) return `字符 "${ch}" 不是合法的 ${radix} 进制数字`
    int = int * BigInt(radix) + BigInt(d)
  }
  // 小数部分：fracPart 整体按进制解析为整数，再除以 radix^len
  let num = 0n
  for (const ch of fracPart) {
    const d = digitValue(ch)
    if (d < 0 || d >= radix) return `字符 "${ch}" 不是合法的 ${radix} 进制数字`
    num = num * BigInt(radix) + BigInt(d)
  }
  const den = BigInt(radix) ** BigInt(fracPart.length)
  return { sign, int, frac: { num, den } }
}

/** 分数转目标进制小数字符串：乘 radix 取整法，除尽或到达 maxDigits 停止 */
function fracToString(frac: Fraction, radix: number, maxDigits = 24): string {
  let { num, den } = frac
  const digits: string[] = []
  for (let i = 0; i < maxDigits && num !== 0n; i++) {
    num *= BigInt(radix)
    const d = num / den
    digits.push(DIGITS[Number(d)])
    num -= d * den
  }
  return digits.join('')
}

/**
 * 任意进制（2-36）数值转换。
 * 输入为空或含非法字符时返回 error；小数除不尽时截断到 24 位。
 */
export function convertRadix(text: string, from: number, to: number, upper = false): ConvertResult {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < MIN_RADIX || from > MAX_RADIX || to < MIN_RADIX || to > MAX_RADIX) {
    return { ok: false, value: '', error: `进制必须在 ${MIN_RADIX}-${MAX_RADIX} 之间` }
  }
  const parsed = parseNumber(text, from)
  if (typeof parsed === 'string') return { ok: false, value: '', error: parsed }
  const { sign, int, frac } = parsed
  let intStr = int.toString(to)
  let fracStr = frac.num === 0n ? '' : fracToString(frac, to)
  if (upper) {
    intStr = intStr.toUpperCase()
    fracStr = fracStr.toUpperCase()
  }
  return { ok: true, value: sign + intStr + (fracStr ? `.${fracStr}` : '') }
}
