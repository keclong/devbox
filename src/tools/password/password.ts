/**
 * 密码生成与强度评估，零依赖。
 * 随机源使用 crypto.getRandomValues（拒绝采样消除取模偏差）。
 */

export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  /** 排除易混字符（il1Lo0O 等） */
  excludeAmbiguous: boolean
  /** 保证所选字符集每类至少出现一次 */
  guaranteeEach: boolean
}

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
}

const AMBIGUOUS = 'il1Lo0O'

/** 拒绝采样随机整数 [0, max) */
export function randomInt(max: number): number {
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let value: number
  do {
    crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}

export function buildCharset(options: PasswordOptions): string {
  const parts: string[] = []
  if (options.lower) parts.push(CHARSETS.lower)
  if (options.upper) parts.push(CHARSETS.upper)
  if (options.digits) parts.push(CHARSETS.digits)
  if (options.symbols) parts.push(CHARSETS.symbols)
  let charset = parts.join('')
  if (options.excludeAmbiguous) {
    charset = [...charset].filter((ch) => !AMBIGUOUS.includes(ch)).join('')
  }
  return charset
}

/** 生成单个密码；字符池为空时返回空串 */
export function generatePassword(options: PasswordOptions): string {
  const pool = buildCharset(options)
  if (!pool || options.length < 1) return ''
  const chars: string[] = Array.from({ length: options.length }, () => pool[randomInt(pool.length)])
  if (options.guaranteeEach) {
    const kinds = (['lower', 'upper', 'digits', 'symbols'] as const).filter((k) => options[k])
    // 补齐：每类字符集随机取一个，覆盖到随机位置
    const positions = Array.from({ length: options.length }, (_, i) => i)
    for (const kind of kinds) {
      let kindPool = CHARSETS[kind]
      if (options.excludeAmbiguous) {
        kindPool = [...kindPool].filter((ch) => !AMBIGUOUS.includes(ch)).join('')
      }
      if (!kindPool) continue
      const pos = positions.splice(randomInt(positions.length), 1)[0]
      if (pos !== undefined) chars[pos] = kindPool[randomInt(kindPool.length)]
    }
  }
  return chars.join('')
}

/** 香农熵（bits）= 长度 × log2(字符池大小) */
export function entropyBits(options: PasswordOptions): number {
  const pool = buildCharset(options)
  if (!pool || options.length < 1) return 0
  return options.length * Math.log2(pool.length)
}

export interface Strength {
  label: string
  /** 0-100，用于进度条 */
  percent: number
  /** 进度条语义色 */
  color: string
}

export function strengthOf(options: PasswordOptions): Strength {
  const bits = entropyBits(options)
  if (bits === 0) return { label: '无', percent: 0, color: '#909399' }
  if (bits < 40) return { label: '弱', percent: 25, color: '#f56c6c' }
  if (bits < 60) return { label: '中', percent: 50, color: '#e6a23c' }
  if (bits < 80) return { label: '强', percent: 75, color: '#409eff' }
  return { label: '极强', percent: 100, color: '#67c23a' }
}
