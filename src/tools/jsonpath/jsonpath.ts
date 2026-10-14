/**
 * 轻量 JSONPath 引擎，零依赖。
 * 支持：$ . .. * ['key'] ["key"] [n] [-n] [n,m] [start:end:step] [?(@.a>1 && @.b=='x')] =~ 正则。
 * 返回匹配节点列表（值 + 规范路径），语法错误返回中文错误信息。
 */

export interface JsonPathNode {
  value: unknown
  /** 规范路径，如 $.store.book[0].price */
  path: string
}

export type QueryResult =
  | { ok: true; nodes: JsonPathNode[] }
  | { ok: false; error: string }

/* ---------- 语法树 ---------- */

type Segment =
  | { kind: 'child'; key: string }
  | { kind: 'wildcard' }
  | { kind: 'recursive'; key?: string }
  | { kind: 'index'; index: number }
  | { kind: 'slice'; start?: number; end?: number; step?: number }
  | { kind: 'union'; indices: number[] }
  | { kind: 'filter'; expr: FilterExpr }

type FilterExpr =
  | { type: 'or'; left: FilterExpr; right: FilterExpr }
  | { type: 'and'; left: FilterExpr; right: FilterExpr }
  | { type: 'cmp'; left: Operand; op: CmpOp; right: Operand }
  | { type: 'exists'; operand: Operand }

type CmpOp = '==' | '!=' | '<' | '<=' | '>' | '>=' | '=~'

type Operand =
  | { type: 'current'; segments: Segment[] }
  | { type: 'root'; segments: Segment[] }
  | { type: 'literal'; value: string | number | boolean | null }

/* ---------- 词法扫描 ---------- */

class Scanner {
  readonly s: string
  private i: number

  constructor(s: string, i = 0) {
    this.s = s
    this.i = i
  }

  get pos(): number {
    return this.i
  }

  get done(): boolean {
    return this.i >= this.s.length
  }

  peek(): string {
    return this.s[this.i] ?? ''
  }

  startsWith(text: string): boolean {
    return this.s.startsWith(text, this.i)
  }

  skipWs(): void {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++
  }

  /** 匹配固定串（不跳空白），成功则前进 */
  eat(text: string): boolean {
    if (this.startsWith(text)) {
      this.i += text.length
      return true
    }
    return false
  }

  /** 跳过空白后匹配固定串 */
  eatWs(text: string): boolean {
    this.skipWs()
    return this.eat(text)
  }

  /** 读取标识符（字母数字下划线连字符、中文；不含 . [ ] 等路径语法字符） */
  readName(): string {
    const m = /^[A-Za-z0-9_\-\u4e00-\u9fff]+/.exec(this.s.slice(this.i))
    if (!m) return ''
    this.i += m[0].length
    return m[0]
  }

  /** 读取数字（含负号） */
  readInt(): string | null {
    this.skipWs()
    const m = /^-?\d+/.exec(this.s.slice(this.i))
    if (!m) return null
    this.i += m[0].length
    return m[0]
  }
}

/* ---------- 解析 ---------- */

function parseSegments(sc: Scanner, root: boolean): Segment[] {
  const segments: Segment[] = []
  while (!sc.done) {
    sc.skipWs()
    if (sc.peek() === '.') {
      sc.eat('.')
      if (sc.eat('.')) {
        // 递归下降 ..name / ..* / ..[...]（递归后接括号视为先递归再索引，简化为 recursive '*'）
        sc.skipWs()
        if (sc.peek() === '[') {
          segments.push({ kind: 'recursive' })
          continue
        }
        if (sc.peek() === '*') {
          sc.eat('*')
          segments.push({ kind: 'recursive' })
          continue
        }
        const name = sc.readName()
        if (!name) throw new Error('.. 之后缺少属性名')
        segments.push({ kind: 'recursive', key: name })
        continue
      }
      if (sc.peek() === '*') {
        sc.eat('*')
        segments.push({ kind: 'wildcard' })
        continue
      }
      const name = sc.readName()
      if (!name) throw new Error('. 之后缺少属性名')
      segments.push({ kind: 'child', key: name })
      continue
    }
    if (sc.peek() === '[') {
      sc.eat('[')
      segments.push(parseBracket(sc))
      continue
    }
    if (root && segments.length === 0) throw new Error('路径必须以 $ 开头')
    // 顶层路径已结束（filter 内部由调用方负责边界）
    break
  }
  return segments
}

function parseBracket(sc: Scanner): Segment {
  sc.skipWs()
  // 通配符
  if (sc.peek() === '*') {
    sc.eat('*')
    expect(sc, ']')
    return { kind: 'wildcard' }
  }
  // 过滤 [?()]
  if (sc.eat('?')) {
    sc.skipWs()
    if (sc.peek() !== '(') throw new Error('? 之后缺少 (')
    sc.eat('(')
    const expr = parseFilter(sc)
    sc.skipWs()
    if (sc.peek() !== ')') throw new Error('过滤表达式缺少右括号')
    sc.eat(')')
    sc.skipWs()
    expect(sc, ']')
    return { kind: 'filter', expr }
  }
  // 字符串键
  if (sc.peek() === "'" || sc.peek() === '"') {
    const quote = sc.peek()
    sc.eat(quote)
    const end = sc.s.indexOf(quote, sc.pos)
    if (end < 0) throw new Error('字符串键缺少结束引号')
    const key = sc.s.slice(sc.pos, end)
    sc.eat(key)
    sc.eat(quote)
    sc.skipWs()
    expect(sc, ']')
    return { kind: 'child', key }
  }
  // 数字序列：索引 / 并集 / 切片
  const first = sc.readInt()
  if (first === null) throw new Error('[ 之后不是有效的索引、键名或过滤器')
  sc.skipWs()
  if (sc.peek() === ':') {
    return parseSlice(sc, Number(first))
  }
  if (sc.peek() === ',') {
    const indices = [Number(first)]
    while (sc.eatWs(',')) {
      const n = sc.readInt()
      if (n === null) throw new Error('并集索引不是数字')
      indices.push(Number(n))
      sc.skipWs()
    }
    expect(sc, ']')
    return { kind: 'union', indices }
  }
  expect(sc, ']')
  return { kind: 'index', index: Number(first) }
}

function parseSlice(sc: Scanner, start: number): Segment {
  sc.eat(':')
  const end = sc.readInt()
  let step: number | undefined
  if (sc.peek() === ':') {
    sc.eat(':')
    const s = sc.readInt()
    if (s !== null) step = Number(s)
  }
  expect(sc, ']')
  return { kind: 'slice', start, end: end === null ? undefined : Number(end), step }
}

function expect(sc: Scanner, ch: string): void {
  sc.skipWs()
  if (sc.peek() !== ch) throw new Error(`缺少 "${ch}"（位置 ${sc.pos}）`)
  sc.eat(ch)
}

/* filter 表达式：or > and > cmp > operand */

function parseFilter(sc: Scanner): FilterExpr {
  let left = parseAnd(sc)
  for (;;) {
    sc.skipWs()
    if (sc.startsWith('||') || sc.startsWith('or ')) {
      sc.eat('||')
      const right = parseAnd(sc)
      left = { type: 'or', left, right }
    } else break
  }
  return left
}

function parseAnd(sc: Scanner): FilterExpr {
  let left = parseComparison(sc)
  for (;;) {
    sc.skipWs()
    if (sc.startsWith('&&') || sc.startsWith('and ')) {
      sc.eat('&&')
      const right = parseComparison(sc)
      left = { type: 'and', left, right }
    } else break
  }
  return left
}

const CMP_OPS: CmpOp[] = ['==', '!=', '<=', '>=', '=~', '<', '>']

function parseComparison(sc: Scanner): FilterExpr {
  sc.skipWs()
  if (sc.peek() === '(') {
    sc.eat('(')
    const inner = parseFilter(sc)
    sc.skipWs()
    if (sc.peek() !== ')') throw new Error('过滤表达式缺少右括号')
    sc.eat(')')
    return inner
  }
  const left = parseOperand(sc)
  sc.skipWs()
  const op = CMP_OPS.find((candidate) => sc.startsWith(candidate))
  if (!op) return { type: 'exists', operand: left }
  sc.eat(op)
  const right = parseOperand(sc)
  return { type: 'cmp', left, op, right }
}

function parseOperand(sc: Scanner): Operand {
  sc.skipWs()
  const ch = sc.peek()
  if (ch === '@' || ch === '$') {
    sc.eat(ch)
    const segments = parseSegments(sc, false)
    return ch === '@' ? { type: 'current', segments } : { type: 'root', segments }
  }
  // 字符串
  if (ch === "'" || ch === '"') {
    sc.eat(ch)
    const end = sc.s.indexOf(ch, sc.pos)
    if (end < 0) throw new Error('字符串缺少结束引号')
    const value = sc.s.slice(sc.pos, end)
    sc.eat(value)
    sc.eat(ch)
    return { type: 'literal', value }
  }
  // 数字
  const num = /^-?\d+(\.\d+)?/.exec(sc.s.slice(sc.pos))
  if (num) {
    sc.eat(num[0])
    return { type: 'literal', value: Number(num[0]) }
  }
  // 布尔 / null
  for (const [word, value] of [
    ['true', true],
    ['false', false],
    ['null', null],
  ] as const) {
    if (sc.startsWith(word)) {
      sc.eat(word)
      return { type: 'literal', value }
    }
  }
  throw new Error(`无法解析的过滤条件（位置 ${sc.pos}）`)
}

/* ---------- 求值 ---------- */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function joinPath(parent: string, key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}['${key}']`
}

function childPath(parent: string, key: string | number): string {
  return typeof key === 'number' ? `${parent}[${key}]` : joinPath(parent, key)
}

/** 收集自身 + 所有后代节点（DFS 先序） */
function collectDescendants(node: JsonPathNode, out: JsonPathNode[]): void {
  out.push(node)
  const { value } = node
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectDescendants({ value: item, path: childPath(node.path, i) }, out))
  } else if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      collectDescendants({ value: value[key], path: joinPath(node.path, key) }, out)
    }
  }
}

function resolveOperand(operand: Operand, item: JsonPathNode, root: unknown): unknown {
  const start: JsonPathNode =
    operand.type === 'current'
      ? item
      : operand.type === 'root'
        ? { value: root, path: '$' }
        : { value: null, path: '$' }
  if (operand.type === 'literal') return operand.value
  let nodes = [start]
  for (const seg of operand.segments) {
    nodes = applySegment(nodes, seg, root)
  }
  return nodes.length ? nodes[0].value : undefined
}

function evalFilter(expr: FilterExpr, item: JsonPathNode, root: unknown): boolean {
  switch (expr.type) {
    case 'or':
      return evalFilter(expr.left, item, root) || evalFilter(expr.right, item, root)
    case 'and':
      return evalFilter(expr.left, item, root) && evalFilter(expr.right, item, root)
    case 'exists':
      return resolveOperand(expr.operand, item, root) !== undefined
    case 'cmp': {
      const left = resolveOperand(expr.left, item, root)
      const right = resolveOperand(expr.right, item, root)
      if (expr.op === '=~') {
        if (typeof left !== 'string' || typeof right !== 'string') return false
        try {
          return new RegExp(right).test(left)
        } catch {
          return false
        }
      }
      if (left === undefined || right === undefined) {
        return expr.op === '!=' ? left !== right : false
      }
      switch (expr.op) {
        case '==':
          return left === right
        case '!=':
          return left !== right
        case '<':
          return (left as number) < (right as number)
        case '<=':
          return (left as number) <= (right as number)
        case '>':
          return (left as number) > (right as number)
        case '>=':
          return (left as number) >= (right as number)
      }
    }
  }
}

function applySegment(nodes: JsonPathNode[], seg: Segment, root: unknown): JsonPathNode[] {
  const out: JsonPathNode[] = []
  for (const node of nodes) {
    const { value } = node
    switch (seg.kind) {
      case 'child':
        if (isPlainObject(value) && seg.key in value) {
          out.push({ value: value[seg.key], path: joinPath(node.path, seg.key) })
        } else if (Array.isArray(value) && String(Number(seg.key)) === seg.key) {
          // 对象数组按 ['0'] 形式访问
          const idx = Number(seg.key)
          if (idx >= 0 && idx < value.length) {
            out.push({ value: value[idx], path: childPath(node.path, idx) })
          }
        }
        break
      case 'wildcard':
        if (Array.isArray(value)) {
          value.forEach((item, i) => out.push({ value: item, path: childPath(node.path, i) }))
        } else if (isPlainObject(value)) {
          for (const key of Object.keys(value)) {
            out.push({ value: value[key], path: joinPath(node.path, key) })
          }
        }
        break
      case 'recursive': {
        const all: JsonPathNode[] = []
        collectDescendants(node, all)
        for (const descendant of all) {
          if (!seg.key) {
            out.push(descendant)
          } else if (isPlainObject(descendant.value) && seg.key in descendant.value) {
            out.push({
              value: descendant.value[seg.key],
              path: joinPath(descendant.path, seg.key),
            })
          }
        }
        break
      }
      case 'index': {
        if (Array.isArray(value)) {
          const idx = seg.index < 0 ? value.length + seg.index : seg.index
          if (idx >= 0 && idx < value.length) {
            out.push({ value: value[idx], path: childPath(node.path, idx) })
          }
        } else if (isPlainObject(value) && String(seg.index) in value) {
          out.push({ value: value[String(seg.index)], path: childPath(node.path, String(seg.index)) })
        }
        break
      }
      case 'union': {
        for (const raw of seg.indices) {
          const idx = raw < 0 && Array.isArray(value) ? value.length + raw : raw
          if (Array.isArray(value) && idx >= 0 && idx < value.length) {
            out.push({ value: value[idx], path: childPath(node.path, idx) })
          }
        }
        break
      }
      case 'slice': {
        if (!Array.isArray(value)) break
        const step = seg.step && seg.step !== 0 ? seg.step : 1
        const len = value.length
        const norm = (n: number | undefined, dflt: number) =>
          n === undefined ? dflt : n < 0 ? Math.max(len + n, 0) : Math.min(n, len)
        const start = norm(seg.start, step > 0 ? 0 : len - 1)
        const end = norm(seg.end, step > 0 ? len : -1)
        if (step > 0) {
          for (let i = start; i < end; i += step) {
            out.push({ value: value[i], path: childPath(node.path, i) })
          }
        } else {
          for (let i = start; i > end; i += step) {
            if (i >= 0) out.push({ value: value[i], path: childPath(node.path, i) })
          }
        }
        break
      }
      case 'filter': {
        if (Array.isArray(value)) {
          value.forEach((item, i) => {
            if (evalFilter(seg.expr, { value: item, path: childPath(node.path, i) }, root)) {
              out.push({ value: item, path: childPath(node.path, i) })
            }
          })
        } else if (evalFilter(seg.expr, node, root)) {
          out.push(node)
        }
        break
      }
    }
  }
  return out
}

/* ---------- 入口 ---------- */

export function queryJsonPath(data: unknown, path: string): QueryResult {
  const trimmed = path.trim()
  if (!trimmed) return { ok: false, error: '请输入 JSONPath 表达式' }
  if (trimmed[0] !== '$') return { ok: false, error: '路径必须以 $ 开头' }
  try {
    const sc = new Scanner(trimmed, 1)
    const segments = parseSegments(sc, true)
    sc.skipWs()
    if (!sc.done) return { ok: false, error: `路径末尾有多余内容（位置 ${sc.pos}）` }
    let nodes: JsonPathNode[] = [{ value: data, path: '$' }]
    for (const seg of segments) {
      nodes = applySegment(nodes, seg, data)
    }
    return { ok: true, nodes }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '表达式解析失败' }
  }
}

/** 常用示例，供 UI 快捷填充 */
export const JSONPATH_EXAMPLES = [
  { label: '取所有作者', path: '$.store.book[*].author' },
  { label: '递归找价格', path: '$..price' },
  { label: '低价的书', path: '$.store.book[?(@.price < 10)]' },
  { label: '前两本', path: '$.store.book[0,1]' },
  { label: '切片', path: '$.store.book[0:2]' },
  { label: '正则匹配', path: "$.store.book[?(@.title =~ 'Rain')]" },
]
