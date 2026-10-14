/**
 * 轻量 Markdown 渲染器，零依赖，输出已转义的安全 HTML。
 * 块级：标题/段落/列表/任务列表/引用/围栏代码块/分割线/表格（对齐）。
 * 行内：粗体/斜体/删除线/行内代码/链接/图片/自动链接。
 * 安全策略：所有文本先 HTML 转义再解析；URL 走协议白名单。
 */

const URL_SCHEME_WHITELIST = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:']
const PLACEHOLDER = '\u0000'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 过滤危险协议（javascript: 等），白名单外一律降级为 # */
function safeUrl(raw: string): string {
  const url = raw.trim()
  const compact = url.replace(/[\s\u0000-\u001f]/g, '').toLowerCase()
  const schemeMatch = /^([a-z0-9+.-]+:)/.exec(compact)
  if (schemeMatch && !URL_SCHEME_WHITELIST.includes(schemeMatch[1])) return '#'
  return url
}

/** 行内代码占位符收集，避免代码内容被其他行内规则误伤 */
class CodeSlots {
  private slots: string[] = []

  stash(html: string): string {
    this.slots.push(html)
    return `${PLACEHOLDER}${this.slots.length - 1}${PLACEHOLDER}`
  }

  restore(text: string): string {
    return text.replace(
      new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'),
      (_, i) => this.slots[Number(i)] ?? '',
    )
  }
}

/** 行内解析：输入必须已转义 */
function renderInline(raw: string, slots: CodeSlots): string {
  let text = raw

  // 行内代码 `...`（含多个反引号）
  text = text.replace(/(`+)([\s\S]*?)\1/g, (_, _ticks, code) =>
    slots.stash(`<code>${code.trim()}</code>`),
  )

  // 图片 ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) =>
    slots.stash(
      `<img src="${safeUrl(url)}" alt="${alt}" loading="lazy" />`,
    ),
  )

  // 链接 [text](url)
  text = text.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) =>
    slots.stash(`<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`),
  )

  // 自动链接 <http(s)://...>
  text = text.replace(/&lt;(https?:\/\/[^\s<>]+)&gt;/g, (_, url) =>
    slots.stash(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`),
  )

  // 粗斜体组合先于单层匹配
  text = text.replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  text = text.replace(/___([\s\S]+?)___/g, '<strong><em>$1</em></strong>')
  text = text.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>')
  text = text.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>')
  text = text.replace(/(^|[^\w])_([^_]+)_(?=[^\w]|$)/g, '$1<em>$2</em>')
  // 删除线
  text = text.replace(/~~([\s\S]+?)~~/g, '<del>$1</del>')

  return text
}

const HR_RE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*(\S*)\s*$/
const UL_RE = /^ {0,3}([-*+])\s+(.*)$/
const OL_RE = /^ {0,3}(\d+)[.)]\s+(.*)$/
const TASK_RE = /^\[([ xX])\]\s+(.*)$/
const QUOTE_RE = /^ {0,3}>\s?(.*)$/
const TABLE_SEP_RE = /^\|?[\s:|-]+\|?\s*$/

function splitRow(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '\\' && inner[i + 1] === '|') {
      cur += '|'
      i++
    } else if (ch === '|') {
      cells.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

function isTableBlock(lines: string[], start: number): boolean {
  return (
    start + 1 < lines.length &&
    lines[start].includes('|') &&
    TABLE_SEP_RE.test(lines[start + 1]) &&
    lines[start + 1].includes('-')
  )
}

function parseTableAlign(sep: string): ('left' | 'center' | 'right')[] {
  return splitRow(sep).map((cell) => {
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) return 'center'
    if (right) return 'right'
    return 'left'
  })
}

/** 渲染块级内容。lines 为已按 \n 拆分、未转义的原始行 */
function renderBlocks(lines: string[]): string {
  const slots = new CodeSlots()
  const out: string[] = []
  let i = 0

  const inline = (s: string) => renderInline(escapeHtml(s), slots)

  while (i < lines.length) {
    const line = lines[i]

    // 空行
    if (!line.trim()) {
      i++
      continue
    }

    // 围栏代码块
    const fence = FENCE_RE.exec(line)
    if (fence) {
      const marker = fence[1][0]
      const lang = fence[2]
      const body: string[] = []
      i++
      while (i < lines.length && !new RegExp(`^ {0,3}${marker}{3,}\\s*$`).test(lines[i])) {
        body.push(lines[i])
        i++
      }
      i++ // 跳过收尾围栏
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : ''
      out.push(`<pre><code${cls}>${escapeHtml(body.join('\n'))}</code></pre>`)
      continue
    }

    // 分割线
    if (HR_RE.test(line)) {
      out.push('<hr />')
      i++
      continue
    }

    // 标题
    const heading = HEADING_RE.exec(line)
    if (heading) {
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      i++
      continue
    }

    // 表格
    if (isTableBlock(lines, i)) {
      const aligns = parseTableAlign(lines[i + 1])
      const head = splitRow(lines[i])
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]))
        i++
      }
      const th = head
        .map((cell, c) => `<th style="text-align:${aligns[c] ?? 'left'}">${inline(cell)}</th>`)
        .join('')
      const trs = rows
        .map(
          (row) =>
            `<tr>${row
              .map(
                (cell, c) =>
                  `<td style="text-align:${aligns[c] ?? 'left'}">${inline(cell)}</td>`,
              )
              .join('')}</tr>`,
        )
        .join('')
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`)
      continue
    }

    // 引用块（收集连续行递归渲染）
    if (QUOTE_RE.test(line)) {
      const body: string[] = []
      while (i < lines.length) {
        const m = QUOTE_RE.exec(lines[i])
        if (m) {
          body.push(m[1])
          i++
        } else if (lines[i].trim() && body.length && !BLOCK_START_RE.test(lines[i])) {
          // 引用内懒续行
          body.push(lines[i])
          i++
        } else break
      }
      out.push(`<blockquote>${renderBlocks(body)}</blockquote>`)
      continue
    }

    // 列表（有序/无序，支持任务列表与一级缩进嵌套）
    const ulMatch = UL_RE.exec(line)
    const olMatch = OL_RE.exec(line)
    if (ulMatch || olMatch) {
      const ordered = !!olMatch
      const itemRe = ordered ? OL_RE : UL_RE
      const items: { text: string[]; children: string[] }[] = []
      while (i < lines.length) {
        const m = itemRe.exec(lines[i])
        if (m) {
          items.push({ text: [m[2]], children: [] })
          i++
        } else if (/^ {2,}\S/.test(lines[i]) && items.length) {
          // 缩进续行：并入当前项
          const raw = lines[i].replace(/^ {2}/, '')
          const nested = items[items.length - 1]
          // 缩进行若是列表则作为子列表
          if (UL_RE.test(raw) || OL_RE.test(raw)) nested.children.push(raw)
          else nested.text.push(raw)
          i++
        } else break
      }
      const lis = items
        .map((item) => {
          const task = TASK_RE.exec(item.text[0])
          let body: string
          if (task) {
            const checked = task[1].toLowerCase() === 'x'
            const box = `<input type="checkbox" disabled${checked ? ' checked' : ''} /> `
            body = box + inline([task[2], ...item.text.slice(1)].join('\n'))
          } else {
            body = inline(item.text.join('\n'))
          }
          const child = item.children.length ? renderBlocks(item.children) : ''
          const inner = /^<(p|pre|ul|ol|blockquote|table|h[1-6])/.test(body) || child
            ? `${body}${child}`
            : `<p>${body}</p>${child}`
          return `<li>${inner}</li>`
        })
        .join('')
      out.push(ordered ? `<ol>${lis}</ol>` : `<ul>${lis}</ul>`)
      continue
    }

    // 普通段落（连续非空行，软换行渲染为 <br>）
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() &&
      !BLOCK_START_RE.test(lines[i]) &&
      !isTableBlock(lines, i)
    ) {
      para.push(lines[i])
      i++
    }
    out.push(`<p>${inline(para.join('\n')).replace(/\n/g, '<br />')}</p>`)
  }

  return slots.restore(out.join('\n'))
}

/** 块级起始正则（用于惰性续行判断） */
const BLOCK_START_RE = new RegExp(
  [HR_RE, HEADING_RE, FENCE_RE, UL_RE, OL_RE, QUOTE_RE].map((re) => re.source).join('|'),
)

/** 入口：Markdown 源码 → 安全 HTML */
export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  return renderBlocks(lines)
}
