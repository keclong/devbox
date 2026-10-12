/** Unicode 转义逻辑：多种转义风格互转 + 字符码点分析 */

export type EscapeStyle = 'u' | 'x' | 'html-dec' | 'html-hex' | 'uplus'

export interface UnescapeResult {
  ok: boolean
  value: string
  /** 成功替换的转义序列数量 */
  count: number
  error?: string
}

export interface CharInfo {
  char: string
  /** 展示用文本：不可见字符显示为转义形式 */
  display: string
  codePoint: number
  /** 大写十六进制，不含 0x */
  hex: string
  utf8: number[]
  /** 占用的 UTF-16 码元数（代理对为 2） */
  utf16Units: number
}

export const ESCAPE_STYLES: { value: EscapeStyle; label: string }[] = [
  { value: 'u', label: 'JS 风格 \\uXXXX（码元）' },
  { value: 'x', label: 'C 风格 \\xXX / \\uXXXX' },
  { value: 'html-dec', label: 'HTML 实体 &#128512;' },
  { value: 'html-hex', label: 'HTML 实体 &#x1F600;' },
  { value: 'uplus', label: 'U+1F600 记法' },
]

const encoder = new TextEncoder()

function pad(n: number, width: number): string {
  return n.toString(16).toUpperCase().padStart(width, '0')
}

/** 码点转为代理对形式的 \uXXXX\uXXXX */
function surrogatePair(cp: number): string {
  const v = cp - 0x10000
  const hi = 0xd800 + (v >> 10)
  const lo = 0xdc00 + (v & 0x3ff)
  return `\\u${pad(hi, 4)}\\u${pad(lo, 4)}`
}

function formatCodePoint(cp: number, style: EscapeStyle): string {
  switch (style) {
    case 'u':
      return cp <= 0xffff ? `\\u${pad(cp, 4)}` : surrogatePair(cp)
    case 'x':
      return cp <= 0xff ? `\\x${pad(cp, 2)}` : `\\u${pad(cp, 4)}`
    case 'html-dec':
      return `&#${cp};`
    case 'html-hex':
      return `&#x${pad(cp, 4)};`
    case 'uplus':
      return `U+${pad(cp, 4)}`
  }
}

/**
 * 按指定风格转义文本。
 * onlyNonAscii 为 true 时仅转义 ASCII 以外的字符。
 */
export function escapeText(text: string, style: EscapeStyle, onlyNonAscii = true): string {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    if (onlyNonAscii && cp <= 0x7f) {
      out += ch
      continue
    }
    out += formatCodePoint(cp, style)
  }
  return out
}

/** 匹配常见转义序列：\u{...} \uXXXX \xXX &#x..; &#..; U+XXXX */
const UNESCAPE_RE =
  /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|&#[xX]([0-9a-fA-F]+);|&#(\d+);|U\+([0-9a-fA-F]{4,6})/g

/**
 * 反转义：自动识别上述风格。
 * \uXXXX / \xXX 按 UTF-16 码元处理（代理对可正确组合）；
 * 十进制/十六进制实体与 U+ 记法按码点处理。
 */
export function unescapeText(text: string): UnescapeResult {
  if (!text) return { ok: true, value: '', count: 0 }
  let count = 0
  try {
    const value = text.replace(UNESCAPE_RE, (m, brace, u4, x2, hx, dec, uplus) => {
      count++
      if (brace !== undefined) return String.fromCodePoint(parseInt(brace, 16))
      if (u4 !== undefined) return String.fromCharCode(parseInt(u4, 16))
      if (x2 !== undefined) return String.fromCharCode(parseInt(x2, 16))
      if (hx !== undefined) return String.fromCodePoint(parseInt(hx, 16))
      if (dec !== undefined) return String.fromCodePoint(parseInt(dec, 10))
      if (uplus !== undefined) return String.fromCodePoint(parseInt(uplus, 16))
      return m
    })
    return { ok: true, value, count }
  } catch {
    return { ok: false, value: '', count, error: '包含无效码点（超出 Unicode 范围 0-0x10FFFF）' }
  }
}

function isInvisible(ch: string): boolean {
  const cp = ch.codePointAt(0) as number
  return cp <= 0x1f || (cp >= 0x7f && cp <= 0x9f) || cp === 0x2028 || cp === 0x2029
}

/** 逐字符分析：码点、UTF-8 字节、UTF-16 码元数 */
export function analyzeChars(text: string): CharInfo[] {
  const list: CharInfo[] = []
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    list.push({
      char: ch,
      display: isInvisible(ch) ? JSON.stringify(ch).slice(1, -1) : ch,
      codePoint: cp,
      hex: pad(cp, 4),
      utf8: Array.from(encoder.encode(ch)),
      utf16Units: ch.length,
    })
  }
  return list
}
