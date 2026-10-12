/** 命名转换逻辑：camel/snake/kebab 等风格互转 */

export type CaseStyle =
  | 'camel'
  | 'pascal'
  | 'snake'
  | 'kebab'
  | 'constant'
  | 'dot'
  | 'title'
  | 'sentence'

export const CASE_STYLES: { value: CaseStyle; label: string; sample: string }[] = [
  { value: 'camel', label: '小驼峰 camelCase', sample: 'userName' },
  { value: 'pascal', label: '大驼峰 PascalCase', sample: 'UserName' },
  { value: 'snake', label: '下划线 snake_case', sample: 'user_name' },
  { value: 'kebab', label: '短横线 kebab-case', sample: 'user-name' },
  { value: 'constant', label: '常量 CONSTANT_CASE', sample: 'USER_NAME' },
  { value: 'dot', label: '点号 dot.case', sample: 'user.name' },
  { value: 'title', label: '标题 Title Case', sample: 'User Name' },
  { value: 'sentence', label: '句首 sentence case', sample: 'User name' },
]

/**
 * 分词：先按分隔符切分，再按驼峰边界与数字边界细分。
 * "parseHTTPResponse" → parse / http / response
 * "user2Id" → user2 / id
 */
export function tokenize(input: string): string[] {
  const tokens: string[] = []
  for (const raw of input.split(/[^A-Za-z0-9]+/)) {
    if (!raw) continue
    // 连续大写后接小写：HTTPResponse → HTTP / Response
    // 小写或数字后接大写：userName → user / Name；user2Id → user2 / Id（数字前的边界不拆）
    const parts = raw
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .split(' ')
    for (const p of parts) {
      if (p) tokens.push(p.toLowerCase())
    }
  }
  return tokens
}

function join(tokens: string[], sep: string, transform: (t: string, i: number) => string): string {
  return tokens.map(transform).join(sep)
}

function upperFirst(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/** 将分词结果按指定风格输出 */
export function formatTokens(tokens: string[], style: CaseStyle): string {
  if (!tokens.length) return ''
  switch (style) {
    case 'camel':
      return join(tokens, '', (t, i) => (i === 0 ? t : upperFirst(t)))
    case 'pascal':
      return join(tokens, '', upperFirst)
    case 'snake':
      return join(tokens, '_', (t) => t)
    case 'kebab':
      return join(tokens, '-', (t) => t)
    case 'constant':
      return join(tokens, '_', (t) => t.toUpperCase())
    case 'dot':
      return join(tokens, '.', (t) => t)
    case 'title':
      return join(tokens, ' ', upperFirst)
    case 'sentence':
      return join(tokens, ' ', (t, i) => (i === 0 ? upperFirst(t) : t))
  }
}

/** 输入文本转目标命名风格 */
export function convertCase(input: string, style: CaseStyle): string {
  return formatTokens(tokenize(input), style)
}

/** 一次生成全部风格的结果，供界面平铺展示 */
export function convertAll(input: string): Record<CaseStyle, string> {
  const tokens = tokenize(input)
  const out = {} as Record<CaseStyle, string>
  for (const s of CASE_STYLES) out[s.value] = formatTokens(tokens, s.value)
  return out
}

/** 识别输入最接近的风格（用于默认高亮） */
export function detectStyle(input: string): CaseStyle | '' {
  if (!input) return ''
  for (const s of CASE_STYLES) {
    if (convertCase(input, s.value) === input) return s.value
  }
  return ''
}
