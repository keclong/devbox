/**
 * 将解析后的 cURL 请求转成各主流语言代码，零依赖。
 * 每种语言生成可直接运行的代码片段，保留方法、URL、请求头、请求体、表单与 Basic Auth。
 */

import { compactJson, type ParsedCurl } from './curl'

export interface LanguageOption {
  id: string
  label: string
  /** 代码块语法高亮意图（本项目未引高亮库，保留标识） */
  hint: string
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'curl', label: 'cURL 命令', hint: 'shell' },
  { id: 'python', label: 'Python (requests)', hint: 'python' },
  { id: 'javascript', label: 'JavaScript (fetch)', hint: 'javascript' },
  { id: 'node-axios', label: 'Node.js (axios)', hint: 'javascript' },
  { id: 'go', label: 'Go (net/http)', hint: 'go' },
  { id: 'java', label: 'Java (HttpClient)', hint: 'java' },
  { id: 'php', label: 'PHP (cURL)', hint: 'php' },
  { id: 'csharp', label: 'C# (HttpClient)', hint: 'csharp' },
  { id: 'ruby', label: 'Ruby (Net::HTTP)', hint: 'ruby' },
]

/* ---------- 字符串转义 ---------- */

/** 单引号字符串转义（Python / JS / PHP 单引号不能用，PHP 用 phpStr） */
function sq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')
}

/** 双引号字符串转义（Java / C# / Go 双引号 / JS） */
function dq(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')
}

/** PHP 双引号转义：额外转义 $ 防止变量插值 */
function phpStr(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\r?\n/g, '\\n')
}

/* ---------- 通用辅助 ---------- */

function splitHeader(header: string): { key: string; value: string } | null {
  const i = header.indexOf(':')
  if (i < 0) return null
  return { key: header.slice(0, i).trim(), value: header.slice(i + 1).trim() }
}

function parsedHeaders(req: ParsedCurl): { key: string; value: string }[] {
  return req.headers.map(splitHeader).filter((h): h is { key: string; value: string } => !!h)
}

function bodyFor(req: ParsedCurl): string {
  return compactJson(req.body) ?? req.body
}

/** 返回 "user"/"pass"，无法拆分时返回 null */
function basicAuth(req: ParsedCurl): { user: string; pass: string } | null {
  if (!req.user) return null
  const i = req.user.indexOf(':')
  if (i < 0) return { user: req.user, pass: '' }
  return { user: req.user.slice(0, i), pass: req.user.slice(i + 1) }
}

function basicToken(req: ParsedCurl): string | null {
  if (!req.user) return null
  try {
    return btoa(req.user)
  } catch {
    return null
  }
}

/* ---------- 各语言生成 ---------- */

function toCurl(req: ParsedCurl): string {
  const tokens: string[] = []
  if (req.method && req.method !== 'GET') tokens.push(`-X ${shellQuote(req.method)}`)
  if (req.followRedirects) tokens.push('-L')
  if (req.insecure) tokens.push('-k')
  if (req.compressed) tokens.push('--compressed')
  for (const h of req.headers) tokens.push(`-H ${shellQuote(h)}`)
  if (req.user) tokens.push(`-u ${shellQuote(req.user)}`)
  for (const f of req.formFields) tokens.push(`-F ${shellQuote(f)}`)
  if (req.body) tokens.push(`--data-raw ${shellQuote(req.body)}`)
  tokens.push(shellQuote(req.url))
  if (tokens.length === 1) return `curl ${shellQuote(req.url)}`
  return `curl \\\n${tokens.map((t, i) => (i === tokens.length - 1 ? `  ${t}` : `  ${t} \\`)).join('\n')}`
}

function shellQuote(s: string): string {
  // 优先单引号：内部单引号用 '\'' 转义
  return `'${s.replace(/'/g, `'\\''`)}'`
}

function toPython(req: ParsedCurl): string {
  const lines: string[] = ['import requests', '']
  lines.push(`url = "${dq(req.url)}"`)
  if (req.formFields.length) {
    lines.push('# 注意：原命令含 -F multipart 表单，请改用 files= 参数构造 multipart 请求')
  }
  const headers = parsedHeaders(req)
  if (headers.length) {
    lines.push('headers = {')
    for (const h of headers) lines.push(`    "${dq(h.key)}": "${dq(h.value)}",`)
    lines.push('}')
  }
  lines.push('')
  const kwargs: string[] = []
  if (headers.length) kwargs.push('headers=headers')
  const body = bodyFor(req)
  if (body) kwargs.push(`data="${dq(body)}"`)
  const auth = basicAuth(req)
  if (auth) kwargs.push(`auth=("${sq(auth.user)}", "${sq(auth.pass)}")`)
  if (req.insecure) kwargs.push('verify=False')
  const callArgs = kwargs.length ? ', ' + kwargs.join(', ') : ''
  lines.push(`response = requests.request("${req.method}", url${callArgs})`)
  lines.push('')
  lines.push('print(response.text)')
  return lines.join('\n')
}

function toJavaScript(req: ParsedCurl): string {
  const lines: string[] = []
  lines.push(`const url = "${dq(req.url)}";`)
  lines.push('')
  lines.push('const options = {')
  lines.push(`    method: "${req.method}",`)
  const headers = parsedHeaders(req)
  if (headers.length) {
    lines.push('    headers: {')
    for (const h of headers) lines.push(`        "${dq(h.key)}": "${dq(h.value)}",`)
    lines.push('    },')
  }
  const body = bodyFor(req)
  if (body) lines.push(`    body: "${dq(body)}",`)
  lines.push('};')
  lines.push('')
  if (req.formFields.length) {
    lines.push('// 原命令含 -F 表单，请改用 FormData 逐项 append：')
    lines.push('// const formData = new FormData();')
    for (const f of req.formFields) {
      lines.push(`// formData.append(${JSON.stringify(f.split('=')[0])}, ${JSON.stringify(f.includes('=') ? f.slice(f.indexOf('=') + 1) : '')});`)
    }
    lines.push('')
  }
  lines.push('fetch(url, options)')
  lines.push('    .then((response) => response.text())')
  lines.push('    .then((data) => console.log(data))')
  lines.push('    .catch((error) => console.error(error));')
  return lines.join('\n')
}

function toAxios(req: ParsedCurl): string {
  const lines: string[] = ['const axios = require("axios");', '']
  lines.push(`const url = "${dq(req.url)}";`)
  const headers = parsedHeaders(req)
  const config: string[] = [`method: "${req.method.toLowerCase()}"`, 'url']
  if (headers.length) {
    lines.push('const headers = {')
    for (const h of headers) lines.push(`    "${dq(h.key)}": "${dq(h.value)}",`)
    lines.push('};')
    config.push('headers')
  }
  const body = bodyFor(req)
  if (body) config.push(`data: ${JSON.stringify(body)}`)
  const auth = basicAuth(req)
  if (auth) {
    lines.push(`const auth = { username: "${dq(auth.user)}", password: "${dq(auth.pass)}" };`)
    config.push('auth')
  }
  lines.push('')
  lines.push(`axios({ ${config.join(', ')} })`)
  lines.push('    .then((response) => console.log(response.data))')
  lines.push('    .catch((error) => console.error(error));')
  return lines.join('\n')
}

function toGo(req: ParsedCurl): string {
  const body = bodyFor(req)
  const hasBody = !!body
  const useRawString = hasBody && !body.includes('`')
  const lines: string[] = [
    'package main',
    '',
    'import (',
    '    "fmt"',
    '    "io"',
    '    "net/http"',
  ]
  if (hasBody) lines.push('    "strings"')
  if (req.insecure) lines.push('    "crypto/tls"')
  lines.push(')', '')
  lines.push('func main() {')
  lines.push(`    url := "${dq(req.url)}"`)
  lines.push(`    method := "${req.method}"`)
  if (req.formFields.length) {
    lines.push('    // 注意：原命令含 -F multipart 表单，请改用 mime/multipart 构造请求体')
  }
  if (hasBody) {
    const lit = useRawString ? `\`${body}\`` : `"${dq(body)}"`
    lines.push(`    payload := strings.NewReader(${lit})`)
  }
  lines.push('')
  lines.push('    client := &http.Client{}')
  if (req.insecure) {
    lines.push('    client.Transport = &http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}')
  }
  const bodyArg = hasBody ? 'payload' : 'nil'
  lines.push(`    req, err := http.NewRequest(method, url, ${bodyArg})`)
  lines.push('    if err != nil {')
  lines.push('        fmt.Println(err)')
  lines.push('        return')
  lines.push('    }')
  for (const h of parsedHeaders(req)) {
    lines.push(`    req.Header.Add("${dq(h.key)}", "${dq(h.value)}")`)
  }
  const auth = basicAuth(req)
  if (auth) lines.push(`    req.SetBasicAuth("${dq(auth.user)}", "${dq(auth.pass)}")`)
  lines.push('')
  lines.push('    res, err := client.Do(req)')
  lines.push('    if err != nil {')
  lines.push('        fmt.Println(err)')
  lines.push('        return')
  lines.push('    }')
  lines.push('    defer res.Body.Close()')
  lines.push('')
  lines.push('    resBody, err := io.ReadAll(res.Body)')
  lines.push('    if err != nil {')
  lines.push('        fmt.Println(err)')
  lines.push('        return')
  lines.push('    }')
  lines.push('    fmt.Println(string(resBody))')
  lines.push('}')
  return lines.join('\n')
}

function toJava(req: ParsedCurl): string {
  const lines: string[] = [
    'import java.net.URI;',
    'import java.net.http.HttpClient;',
    'import java.net.http.HttpRequest;',
    'import java.net.http.HttpResponse;',
    '',
    'public class Main {',
    '    public static void main(String[] args) throws Exception {',
    '        var client = HttpClient.newBuilder()',
  ]
  if (req.followRedirects) lines.push('                .followRedirects(HttpClient.Redirect.NORMAL)')
  lines.push('                .build();')
  lines.push('')
  lines.push('        var builder = HttpRequest.newBuilder()')
  lines.push(`                .uri(URI.create("${dq(req.url)}"))`)
  if (req.formFields.length) {
    lines.push('                // 注意：原命令含 -F multipart 表单，请改用 BodyPublishers.ofMultipart() 或 ofFile()')
  }
  for (const h of parsedHeaders(req)) {
    lines.push(`                .header("${dq(h.key)}", "${dq(h.value)}")`)
  }
  const body = bodyFor(req)
  if (body) {
    lines.push(`                .method("${req.method}", HttpRequest.BodyPublishers.ofString("${dq(body)}"))`)
  } else {
    lines.push(`                .method("${req.method}", HttpRequest.BodyPublishers.noBody())`)
  }
  const auth = basicAuth(req)
  if (auth) {
    lines.push(`                .header("Authorization", "Basic ${basicToken(req)}")`)
  }
  lines.push('                .build();')
  lines.push('')
  lines.push('        var response = client.send(builder, HttpResponse.BodyHandlers.ofString());')
  lines.push('        System.out.println(response.body());')
  lines.push('    }')
  lines.push('}')
  return lines.join('\n')
}

function toPhp(req: ParsedCurl): string {
  const lines: string[] = [
    '<?php',
    '',
    '$ch = curl_init();',
    '',
    `curl_setopt($ch, CURLOPT_URL, "${phpStr(req.url)}");`,
    'curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);',
  ]
  if (req.followRedirects) lines.push('curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);')
  if (req.insecure) {
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);')
    lines.push('curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);')
  }
  if (req.compressed) lines.push('curl_setopt($ch, CURLOPT_ENCODING, "");')
  lines.push(`curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "${req.method}");`)
  const body = bodyFor(req)
  if (req.formFields.length) {
    lines.push('// 原命令含 -F multipart 表单，请改用 CURLFile + CURLOPT_POSTFIELDS 数组构造')
  }
  if (body) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, "${phpStr(body)}");`)
  }
  const headers = parsedHeaders(req)
  if (headers.length) {
    lines.push('')
    lines.push('$headers = array();')
    for (const h of headers) lines.push(`$headers[] = "${phpStr(h.key)}: ${phpStr(h.value)}";`)
    lines.push('curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);')
  }
  if (basicAuth(req)) {
    lines.push(`curl_setopt($ch, CURLOPT_USERPWD, "${phpStr(req.user)}");`)
  }
  lines.push('')
  lines.push('$result = curl_exec($ch);')
  lines.push('if (curl_errno($ch)) {')
  lines.push(`    echo "Error:" . curl_error($ch);`)
  lines.push('}')
  lines.push('curl_close($ch);')
  lines.push('')
  lines.push('echo $result;')
  return lines.join('\n')
}

function toCsharp(req: ParsedCurl): string {
  const lines: string[] = [
    'using System;',
    'using System.Net.Http;',
    'using System.Text;',
    '',
    'var client = new HttpClient();',
    `var request = new HttpRequestMessage(new HttpMethod("${req.method}"), "${dq(req.url)}");`,
  ]
  if (req.formFields.length) {
    lines.push('// 注意：原命令含 -F multipart 表单，请改用 MultipartFormDataContent 构造')
  }
  for (const h of parsedHeaders(req)) {
    lines.push(`request.Headers.TryAddWithoutValidation("${dq(h.key)}", "${dq(h.value)}");`)
  }
  const auth = basicAuth(req)
  if (auth) lines.push(`request.Headers.TryAddWithoutValidation("Authorization", "Basic ${basicToken(req)}");`)
  const body = bodyFor(req)
  if (body) {
    lines.push(`request.Content = new StringContent("${dq(body)}", Encoding.UTF8);`)
  }
  lines.push('var response = await client.SendAsync(request);')
  lines.push('response.EnsureSuccessStatusCode();')
  lines.push('Console.WriteLine(await response.Content.ReadAsStringAsync());')
  return lines.join('\n')
}

function toRuby(req: ParsedCurl): string {
  const klassMap: Record<string, string> = {
    GET: 'Get', POST: 'Post', PUT: 'Put', DELETE: 'Delete',
    PATCH: 'Patch', HEAD: 'Head', OPTIONS: 'Options',
  }
  const klass = klassMap[req.method] ?? 'Post'
  const lines: string[] = [
    "require 'uri'",
    "require 'net/http'",
    '',
    `url = URI("${dq(req.url)}")`,
    '',
    'http = Net::HTTP.new(url.host, url.port)',
    'http.use_ssl = (url.scheme == "https")',
  ]
  if (req.formFields.length) {
    lines.push('# 注意：原命令含 -F multipart 表单，请改用 Net::HTTP::Post + multipart/form-data 构造')
  }
  if (req.insecure) {
    lines.splice(2, 0, "require 'openssl'")
    lines.push('http.verify_mode = OpenSSL::SSL::VERIFY_NONE')
  }
  lines.push('')
  const body = bodyFor(req)
  if (body) {
    lines.push(`request = Net::HTTP::${klass}.new(url)`)
    for (const h of parsedHeaders(req)) {
      lines.push(`request["${dq(h.key)}"] = "${dq(h.value)}"`)
    }
    if (basicAuth(req)) lines.push(`request.basic_auth("${dq(basicAuth(req)!.user)}", "${dq(basicAuth(req)!.pass)}")`)
    lines.push(`request.body = "${dq(body)}"`)
  } else {
    lines.push(`request = Net::HTTP::${klass}.new(url)`)
    for (const h of parsedHeaders(req)) {
      lines.push(`request["${dq(h.key)}"] = "${dq(h.value)}"`)
    }
    if (basicAuth(req)) lines.push(`request.basic_auth("${dq(basicAuth(req)!.user)}", "${dq(basicAuth(req)!.pass)}")`)
  }
  lines.push('')
  lines.push('response = http.request(request)')
  lines.push('puts response.read_body')
  return lines.join('\n')
}

/* ---------- 入口 ---------- */

export function generateCode(req: ParsedCurl, lang: string): string {
  switch (lang) {
    case 'curl': return toCurl(req)
    case 'python': return toPython(req)
    case 'javascript': return toJavaScript(req)
    case 'node-axios': return toAxios(req)
    case 'go': return toGo(req)
    case 'java': return toJava(req)
    case 'php': return toPhp(req)
    case 'csharp': return toCsharp(req)
    case 'ruby': return toRuby(req)
    default: return ''
  }
}