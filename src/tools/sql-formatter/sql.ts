/**
 * SQL 格式化器，零依赖。
 * 词法分析保留字符串/引号标识符/注释为整体，其余按关键字、标识符、数字、符号切分；
 * 子句关键字换行缩进，字段列表与条件按逗号/AND/OR 换行，关键字可选大写。
 * 括号策略：仅「子查询括号」（( 后紧跟 SELECT/WITH）增加缩进层级并允许内逗号换行，
 * 函数括号 / IN 列表 / VALUES 行值构造器内逗号不换行、不增加缩进。
 */

export interface SqlFormatOptions {
  /** 缩进单位：2 / 4（空格数）或 '\t' */
  indent: number | string
  /** 关键字是否转大写 */
  uppercase: boolean
}

/* ---------- 词法 ---------- */

type TokenType = 'word' | 'string' | 'number' | 'symbol' | 'comment'

interface Token {
  raw: string
  type: TokenType
}

const WORD_START = /[A-Za-z_]/
const WORD_CHAR = /[A-Za-z0-9_$#]/

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = input.length

  while (i < n) {
    const ch = input[i]

    if (/\s/.test(ch)) {
      i++
      continue
    }

    if (ch === "'") {
      let j = i + 1
      let raw = "'"
      while (j < n) {
        raw += input[j]
        if (input[j] === "'") {
          if (input[j + 1] === "'") {
            raw += "'"
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      tokens.push({ raw, type: 'string' })
      i = j
      continue
    }

    if (ch === '"' || ch === '`') {
      const close = ch
      let j = i + 1
      let raw = ch
      while (j < n) {
        raw += input[j]
        if (input[j] === close) {
          if (close === '`' && input[j + 1] === '`') {
            raw += '`'
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      tokens.push({ raw, type: 'string' })
      i = j
      continue
    }
    if (ch === '[') {
      const end = input.indexOf(']', i + 1)
      const raw = end < 0 ? input.slice(i) : input.slice(i, end + 1)
      tokens.push({ raw, type: 'string' })
      i = end < 0 ? n : end + 1
      continue
    }

    if (ch === '-' && input[i + 1] === '-') {
      let j = i + 2
      while (j < n && input[j] !== '\n') j++
      tokens.push({ raw: input.slice(i, j), type: 'comment' })
      i = j
      continue
    }
    if (ch === '#') {
      let j = i + 1
      while (j < n && input[j] !== '\n') j++
      tokens.push({ raw: input.slice(i, j), type: 'comment' })
      i = j
      continue
    }

    if (ch === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2)
      const raw = end < 0 ? input.slice(i) : input.slice(i, end + 2)
      tokens.push({ raw, type: 'comment' })
      i = end < 0 ? n : end + 2
      continue
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(input[i + 1] ?? ''))) {
      let j = i
      while (j < n && /[0-9a-fA-F.x]/.test(input[j])) j++
      tokens.push({ raw: input.slice(i, j), type: 'number' })
      i = j
      continue
    }

    const two = input.slice(i, i + 2)
    if (['<=', '>=', '<>', '!=', '||', '::', '->', '=>'].includes(two)) {
      tokens.push({ raw: two, type: 'symbol' })
      i += 2
      continue
    }

    if (WORD_START.test(ch)) {
      let j = i + 1
      while (j < n && WORD_CHAR.test(input[j])) j++
      tokens.push({ raw: input.slice(i, j), type: 'word' })
      i = j
      continue
    }

    tokens.push({ raw: ch, type: 'symbol' })
    i++
  }

  return tokens
}

/* ---------- 关键字 ---------- */

/** 结构性关键字：不含函数名，用于判断函数括号（word 后紧跟 ( 且不在本集合 = 函数调用） */
const KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'NULL', 'AS', 'IN', 'IS', 'LIKE', 'BETWEEN',
  'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT',
  'OFFSET', 'UNION', 'ALL', 'DISTINCT', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER',
  'CROSS', 'NATURAL', 'STRAIGHT', 'ON', 'INSERT', 'INTO', 'UPDATE', 'DELETE', 'SET', 'VALUES',
  'WITH', 'ASC', 'DESC', 'USING', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CREATE', 'TABLE',
  'DROP', 'ALTER', 'ADD', 'COLUMN', 'INDEX', 'UNIQUE', 'CONSTRAINT', 'DEFAULT', 'AUTO_INCREMENT',
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'VARCHAR', 'CHAR', 'TEXT', 'DECIMAL', 'NUMERIC', 'DATE',
  'DATETIME', 'TIMESTAMP', 'BOOLEAN', 'FLOAT', 'DOUBLE', 'REAL', 'TRUE', 'FALSE', 'TRUNCATE',
  'REPLACE', 'DESCRIBE', 'EXPLAIN', 'RETURNING', 'FETCH', 'FIRST', 'LAST', 'CASCADE', 'RESTRICT',
  'ONLY',
])

/** 函数名：参与大写化，但不影响函数括号判定 */
const FUNCTION_NAMES = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'IFNULL', 'NULLIF', 'CAST', 'CONCAT',
  'SUBSTRING', 'SUBSTR', 'UPPER', 'LOWER', 'LENGTH', 'TRIM', 'ROUND', 'FLOOR', 'CEIL', 'ABS',
  'NOW', 'CURDATE', 'DATE_FORMAT', 'GROUP_CONCAT',
])

const UPPERCASE_WORDS = new Set([...KEYWORDS, ...FUNCTION_NAMES])

/** 单词子句起始关键字 */
const CLAUSE_START = new Set([
  'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'OFFSET', 'VALUES', 'SET', 'WITH', 'RETURNING',
  'FETCH', 'ON', 'GROUP', 'ORDER', 'UNION', 'INSERT', 'UPDATE', 'DELETE',
])

/** JOIN 修饰词 */
const JOIN_MODS = ['LEFT', 'RIGHT', 'FULL', 'INNER', 'CROSS', 'NATURAL', 'STRAIGHT', 'OUTER']

/** 块式子句：其后内容另起一行并缩进一级 */
const BLOCK_CLAUSES = new Set(['SELECT', 'WHERE', 'HAVING', 'SET', 'ON', 'GROUP BY', 'ORDER BY', 'VALUES'])

interface Clause {
  phrase: string
  len: number
}

/** 识别子句/JOIN 短语（含多词），返回归一后短语与消耗 token 数 */
function matchClause(tokens: Token[], idx: number): Clause | null {
  const t = tokens[idx]
  if (!t || t.type !== 'word') return null
  const u = t.raw.toUpperCase()
  const w1 = tokens[idx + 1]?.type === 'word' ? tokens[idx + 1].raw.toUpperCase() : ''
  const w2 = tokens[idx + 2]?.type === 'word' ? tokens[idx + 2].raw.toUpperCase() : ''

  if (u === 'GROUP' && w1 === 'BY') return { phrase: 'GROUP BY', len: 2 }
  if (u === 'ORDER' && w1 === 'BY') return { phrase: 'ORDER BY', len: 2 }
  if (u === 'UNION' && w1 === 'ALL') return { phrase: 'UNION ALL', len: 2 }
  if (u === 'INSERT' && w1 === 'INTO') return { phrase: 'INSERT INTO', len: 2 }
  if (u === 'DELETE' && w1 === 'FROM') return { phrase: 'DELETE FROM', len: 2 }

  if (u === 'JOIN') return { phrase: 'JOIN', len: 1 }
  if (JOIN_MODS.includes(u)) {
    if (w1 === 'OUTER' && w2 === 'JOIN') return { phrase: `${u} OUTER JOIN`, len: 3 }
    if (w1 === 'JOIN') return { phrase: `${u} JOIN`, len: 2 }
    return null
  }

  if (CLAUSE_START.has(u)) return { phrase: u, len: 1 }
  return null
}

/* ---------- 格式化 ---------- */

export function formatSql(input: string, options: SqlFormatOptions): string {
  const tokens = tokenize(input)
  const unit = typeof options.indent === 'number' ? ' '.repeat(options.indent) : options.indent

  const out: string[] = []
  let cur: string[] = []
  let curLevel = 0
  let depth = 0
  const parenSub: boolean[] = []
  let pendingWrap: number | null = null

  const display = (tok: Token): string =>
    tok.type === 'word' && options.uppercase && UPPERCASE_WORDS.has(tok.raw.toUpperCase())
      ? tok.raw.toUpperCase()
      : tok.raw

  const newline = (level: number): void => {
    const line = cur.join('').trim()
    if (line) out.push(unit.repeat(curLevel) + line)
    cur = []
    curLevel = level
  }

  const push = (text: string, noSpace = false): void => {
    if (cur.length === 0) {
      cur.push(text)
      return
    }
    const last = cur[cur.length - 1]
    if (noSpace || text === ',' || text === ';' || text === ')' || text === '.') {
      cur.push(text)
      return
    }
    if (last.endsWith('(') || last.endsWith('.')) {
      cur.push(text)
      return
    }
    cur.push(' ' + text)
  }

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx]
    const word = tok.type === 'word' ? tok.raw.toUpperCase() : ''

    if (tok.type === 'comment') {
      newline(depth)
      out.push(unit.repeat(depth) + tok.raw)
      pendingWrap = null
      continue
    }

    const clause = tok.type === 'word' ? matchClause(tokens, idx) : null
    if (clause) {
      newline(depth)
      // 关闭大写时保留原始 token 的大小写（子句短语按原始 raw 拼接）
      const phrase = options.uppercase
        ? clause.phrase
        : tokens.slice(idx, idx + clause.len).map((t) => t.raw).join(' ')
      cur.push(phrase)
      pendingWrap = BLOCK_CLAUSES.has(clause.phrase) ? depth + 1 : null
      idx += clause.len - 1
      continue
    }

    if (tok.type === 'word' && (word === 'AND' || word === 'OR')) {
      newline(depth + 1)
      cur.push(display(tok))
      pendingWrap = null
      continue
    }

    if (tok.raw === '(') {
      const prev = idx > 0 ? tokens[idx - 1] : null
      const isFunc = prev?.type === 'word' && !KEYWORDS.has(prev.raw.toUpperCase())
      const next = tokens[idx + 1]
      const nextWord = next?.type === 'word' ? next.raw.toUpperCase() : ''
      const isSub = nextWord === 'SELECT' || nextWord === 'WITH'

      if (isSub) depth++
      parenSub.push(isSub)

      if (pendingWrap !== null) {
        newline(pendingWrap)
        pendingWrap = null
      }
      push('(', isFunc)
      continue
    }

    if (tok.raw === ')') {
      push(')')
      const wasSub = parenSub.pop()
      if (wasSub && depth > 0) depth--
      continue
    }

    if (tok.raw === ',') {
      push(',')
      const inListBracket = parenSub.length > 0 && !parenSub[parenSub.length - 1]
      if (!inListBracket) {
        newline(depth + 1)
        pendingWrap = null
      }
      continue
    }

    if (tok.raw === ';') {
      push(';')
      newline(depth)
      pendingWrap = null
      continue
    }

    if (pendingWrap !== null) {
      newline(pendingWrap)
      pendingWrap = null
    }
    push(display(tok))
  }

  newline(depth)
  return out.join('\n')
}