/**
 * cURL 命令解析器，零依赖。
 * 分词处理单/双引号与反斜杠续行，提取 URL、方法、请求头、请求体、
 * 表单字段、认证用户等选项，供 codegen 转成各语言代码。
 */

export interface ParsedCurl {
  /** HTTP 方法，大写 */
  method: string
  /** 完整 URL（含 query） */
  url: string
  /** 完整请求头，形如 "Content-Type: application/json" */
  headers: string[]
  /** -d/--data* 拼接出的请求体（多个 -d 以 & 连接，同 curl 语义） */
  body: string
  /** -F/--form 的原始字段，未做进一步解析 */
  formFields: string[]
  /** -u/--user 的原始值 user:pass */
  user: string
  /** -k/--insecure */
  insecure: boolean
  /** --compressed */
  compressed: boolean
  /** -L/--location */
  followRedirects: boolean
  /** 单个 data 以 @ 开头，表示从文件读取 */
  hasFileData: boolean
}

export type CurlParseResult =
  | { ok: true; request: ParsedCurl; warnings: string[] }
  | { ok: false; error: string }

/** 将 curl 命令拆成 token：正确处理单引号、双引号与反斜杠转义 */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let i = 0
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) i++
    if (i >= input.length) break
    const ch = input[i]
    let token = ''
    if (ch === "'") {
      // 单引号内：反斜杠是字面量，直到下一个单引号为止
      i++
      while (i < input.length && input[i] !== "'") {
        token += input[i]
        i++
      }
      i++ // 跳过结束引号
    } else if (ch === '"') {
      // 双引号内：反斜杠仅对 $ ` " \ 与换行转义，其余保留字面
      i++
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) {
          const next = input[i + 1]
          if (next === '$' || next === '`' || next === '"' || next === '\\' || next === '\n') {
            token += next
            i += 2
          } else {
            token += input[i]
            i++
          }
        } else {
          token += input[i]
          i++
        }
      }
      i++ // 跳过结束引号
    } else {
      while (i < input.length && !/\s/.test(input[i])) {
        token += input[i]
        i++
      }
    }
    if (token) tokens.push(token)
  }
  return tokens
}

const HTTP_PREFIX_RE = /^https?:\/\//i

export function parseCurl(input: string): CurlParseResult {
  if (!input.trim()) return { ok: false, error: '请粘贴要转换的 cURL 命令' }

  const normalized = input.trim().replace(/\\\r?\n/g, ' ')
  const tokens = tokenize(normalized)
  if (!tokens.length) return { ok: false, error: '无法识别命令内容' }

  const request: ParsedCurl = {
    method: '',
    url: '',
    headers: [],
    body: '',
    formFields: [],
    user: '',
    insecure: false,
    compressed: false,
    followRedirects: false,
    hasFileData: false,
  }

  const dataParts: string[] = []
  const positional: string[] = []
  const warnings: string[] = []
  let sawGetFlag = false

  // 跳过命令名（curl / curl.exe），容忍大小写
  let start = 0
  if (/^curl(\.exe)?$/i.test(tokens[0])) start = 1

  for (let idx = start; idx < tokens.length; idx++) {
    const tok = tokens[idx]

    // 带值选项
    if (tok === '-X' || tok === '--request') {
      request.method = tokens[++idx] ?? ''
    } else if (tok === '-H' || tok === '--header') {
      request.headers.push(tokens[++idx] ?? '')
    } else if (
      tok === '-d' || tok === '--data' || tok === '--data-raw' ||
      tok === '--data-binary' || tok === '--data-ascii' || tok === '--data-urlencode'
    ) {
      const value = tokens[++idx] ?? ''
      dataParts.push(value)
      if (value.startsWith('@')) request.hasFileData = true
    } else if (tok === '-F' || tok === '--form') {
      request.formFields.push(tokens[++idx] ?? '')
    } else if (tok === '-u' || tok === '--user') {
      request.user = tokens[++idx] ?? ''
    } else if (tok === '-b' || tok === '--cookie') {
      request.headers.push(`Cookie: ${tokens[++idx] ?? ''}`)
    } else if (tok === '-A' || tok === '--user-agent') {
      request.headers.push(`User-Agent: ${tokens[++idx] ?? ''}`)
    } else if (tok === '-e' || tok === '--referer') {
      request.headers.push(`Referer: ${tokens[++idx] ?? ''}`)
    } else if (tok === '-o' || tok === '--output' || tok === '-w' || tok === '--write-out') {
      idx++ // 这些选项的值与请求无关，跳过
    } else if (tok === '-x' || tok === '--proxy' || tok === '--connect-timeout' || tok === '-m' || tok === '--max-time') {
      idx++
    } else if (tok === '-L' || tok === '--location') {
      request.followRedirects = true
    } else if (tok === '-k' || tok === '--insecure') {
      request.insecure = true
    } else if (tok === '--compressed') {
      request.compressed = true
    } else if (tok === '-I' || tok === '--head') {
      request.method = 'HEAD'
    } else if (tok === '-G' || tok === '--get') {
      sawGetFlag = true
    } else if (tok.startsWith('-X') && tok.length > 2) {
      // -XPOST 紧贴写法
      request.method = tok.slice(2)
    } else if (/^-[A-Za-z]+$/.test(tok) && tok.length > 2 && !tok.startsWith('--')) {
      // 合并短选项（-sSL 等）：逐个字母应用
      for (const ch of tok.slice(1)) {
        if (ch === 'L') request.followRedirects = true
        else if (ch === 'k') request.insecure = true
        else if (ch === 'I') request.method = 'HEAD'
        else if (ch === 'G') sawGetFlag = true
        // s/S/v 等静默/显示选项忽略
      }
    } else if (tok.startsWith('--')) {
      // 其余长选项（--fail、--retry 等）：不识别则不处理，避免误判值
    } else if (tok.startsWith('-') && tok.length === 2) {
      // 未识别的短选项：忽略
    } else {
      // 可能是 URL 或裸位置参数
      if (HTTP_PREFIX_RE.test(tok) || !tok.startsWith('-')) positional.push(tok)
    }
  }

  request.body = dataParts.join('&')
  let url = positional.find((t) => HTTP_PREFIX_RE.test(t)) ?? positional[0] ?? ''
  // curl 对缺省协议的裸域名默认走 http://
  if (url && !HTTP_PREFIX_RE.test(url)) url = `http://${url}`
  request.url = url

  if (!request.url) {
    return { ok: false, error: '未找到请求 URL（需以 http:// 或 https:// 开头）' }
  }

  // 方法推断：显式方法优先，其次 HEAD/-G，有请求体默认 POST，否则 GET
  if (!request.method) {
    if (sawGetFlag) request.method = 'GET'
    else if (request.body || request.formFields.length) request.method = 'POST'
    else request.method = 'GET'
  } else {
    request.method = request.method.toUpperCase()
  }

  if (request.hasFileData) {
    warnings.push('检测到 -d @file（从文件读取请求体）：生成的代码用注释标记了需要替换为文件读取逻辑的位置')
  }
  if (request.formFields.length) {
    warnings.push('检测到 -F/--form（multipart 表单）：部分语言以注释提示需手动处理 multipart')
  }

  return { ok: true, request, warnings }
}

/** 判断请求体是否为合法 JSON（用于生成代码时紧凑化嵌入） */
export function compactJson(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) return null
  try {
    return JSON.stringify(JSON.parse(raw))
  } catch {
    return null
  }
}