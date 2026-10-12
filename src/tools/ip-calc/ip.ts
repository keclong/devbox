/** IP 子网计算逻辑：IPv4 CIDR 解析 + IPv6 前缀解析（BigInt 128 位运算） */

export interface Ipv4Result {
  ok: boolean
  error?: string
  ip: string
  prefix: number
  network: string
  broadcast: string
  mask: string
  wildcard: string
  firstHost: string
  lastHost: string
  hostCount: number
  totalCount: number
  ipClass: string
  scope: string
  binary: string
}

export interface Ipv6Result {
  ok: boolean
  error?: string
  address: string
  expanded: string
  prefix: number
  network: string
  lastAddress: string
  totalCount: string
  scope: string
}

function ipv4ToNum(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null
    const v = Number(p)
    if (v > 255) return null
    n = n * 256 + v
  }
  return n >>> 0
}

function numToIpv4(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function numToBinary(n: number): string {
  return (n >>> 0).toString(2).padStart(32, '0').replace(/(\d{8})(?=\d)/g, '$1.')
}

/** 解析 IPv4 地址或 CIDR（如 192.168.1.130/24） */
export function parseIpv4(input: string): Ipv4Result {
  const text = input.trim()
  const slash = text.indexOf('/')
  const ipPart = slash === -1 ? text : text.slice(0, slash)
  const prefix = slash === -1 ? 32 : Number(text.slice(slash + 1))
  if (slash !== -1 && !/^\d{1,2}$/.test(text.slice(slash + 1))) {
    return failV4('前缀长度必须是 0-32 的整数')
  }
  if (prefix < 0 || prefix > 32) return failV4('前缀长度必须在 0-32 之间')
  const ipNum = ipv4ToNum(ipPart)
  if (ipNum === null) return failV4('IPv4 地址格式不正确（应为 a.b.c.d，每段 0-255）')

  const maskNum = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  const network = (ipNum & maskNum) >>> 0
  const broadcast = (network | (~maskNum >>> 0)) >>> 0
  const totalCount = Math.pow(2, 32 - prefix)
  const hostCount = prefix >= 31 ? (prefix === 32 ? 1 : 2) : totalCount - 2
  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0

  return {
    ok: true,
    ip: numToIpv4(ipNum),
    prefix,
    network: numToIpv4(network),
    broadcast: numToIpv4(broadcast),
    mask: numToIpv4(maskNum),
    wildcard: numToIpv4(~maskNum >>> 0),
    firstHost: numToIpv4(firstHost),
    lastHost: numToIpv4(lastHost),
    hostCount,
    totalCount,
    ipClass: ipv4Class(ipNum),
    scope: ipv4Scope(ipNum),
    binary: numToBinary(ipNum),
  }
}

function failV4(error: string): Ipv4Result {
  return {
    ok: false,
    error,
    ip: '',
    prefix: 0,
    network: '',
    broadcast: '',
    mask: '',
    wildcard: '',
    firstHost: '',
    lastHost: '',
    hostCount: 0,
    totalCount: 0,
    ipClass: '',
    scope: '',
    binary: '',
  }
}

function ipv4Class(n: number): string {
  const first = (n >>> 24) & 255
  if (first < 128) return 'A 类'
  if (first < 192) return 'B 类'
  if (first < 224) return 'C 类'
  if (first < 240) return 'D 类（组播）'
  return 'E 类（保留）'
}

function ipv4Scope(n: number): string {
  const b = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
  if (b[0] === 10) return '私有地址（RFC 1918）'
  if (b[0] === 172 && b[1] >= 16 && b[1] <= 31) return '私有地址（RFC 1918）'
  if (b[0] === 192 && b[1] === 168) return '私有地址（RFC 1918）'
  if (b[0] === 127) return '回环地址'
  if (b[0] === 169 && b[1] === 254) return '链路本地'
  if (b[0] === 100 && b[1] >= 64 && b[1] <= 127) return '运营商级 NAT（RFC 6598）'
  if (b[0] >= 224 && b[0] < 240) return '组播地址'
  if (b[0] >= 240) return '保留地址'
  if (b[0] === 0) return '本网络（未指定）'
  return '公网地址'
}

/** 解析 IPv6 地址（支持 :: 压缩与内嵌 IPv4）为 128 位 BigInt */
export function ipv6ToBigInt(text: string): bigint | null {
  let s = text.trim()
  if (!s || s.includes(':::')) return null
  // 内嵌 IPv4（如 ::ffff:192.168.1.1）转成最后两组
  const v4 = /(?:^|:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s)
  if (v4) {
    const parts = v4[1].split('.').map(Number)
    if (parts.some((n) => Number.isNaN(n) || n > 255)) return null
    const g1 = (parts[0] << 8) | parts[1]
    const g2 = (parts[2] << 8) | parts[3]
    const before = s.slice(0, v4.index)
    const sep = before === '' || before.endsWith(':') ? '' : ':'
    s = `${before}${sep}${g1.toString(16)}:${g2.toString(16)}`
  }
  const halves = s.split('::')
  if (halves.length > 2) return null
  const head = halves[0] ? halves[0].split(':') : []
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  if (halves.length === 1 && head.length !== 8) return null
  if (halves.length === 2 && head.length + tail.length > 7) return null
  const missing = 8 - head.length - tail.length
  const groups = [...head, ...Array<string>(missing).fill('0'), ...tail]
  let n = 0n
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null
    n = (n << 16n) | BigInt(parseInt(g, 16))
  }
  return n
}

function bigIntToIpv6(n: bigint, compress: boolean): string {
  const groups: string[] = []
  for (let i = 0; i < 8; i++) {
    groups.push(((n >> BigInt((7 - i) * 16)) & 0xffffn).toString(16))
  }
  if (!compress) return groups.map((g) => g.padStart(4, '0')).join(':')
  // RFC 5952：压缩最长的连续零段，等长取最前，不压缩单独一段 0
  let bestStart = -1
  let bestLen = 1
  let cur = -1
  let curLen = 0
  for (let i = 0; i < 8; i++) {
    if (groups[i] === '0') {
      if (cur === -1) {
        cur = i
        curLen = 1
      } else {
        curLen++
      }
      if (curLen > bestLen) {
        bestLen = curLen
        bestStart = cur
      }
    } else {
      cur = -1
      curLen = 0
    }
  }
  if (bestStart === -1) return groups.join(':')
  return groups.slice(0, bestStart).join(':') + '::' + groups.slice(bestStart + bestLen).join(':')
}

function ipv6Scope(n: bigint): string {
  if (n === 0n) return '未指定地址'
  if (n === 1n) return '回环地址'
  if (n >> 32n === 0xffffn) return 'IPv4 映射地址'
  if (n >> 118n === 0x3fan) return '链路本地'
  if (n >> 121n === 0x7en) return '唯一本地地址（ULA）'
  if (n >> 120n === 0xffn) return '组播地址'
  if (n >> 125n === 1n) return '全球单播地址'
  return '其他地址'
}

/** 解析 IPv6 地址或前缀（如 2001:db8::/64） */
export function parseIpv6(input: string): Ipv6Result {
  const text = input.trim()
  const slash = text.indexOf('/')
  const addrPart = slash === -1 ? text : text.slice(0, slash)
  const prefix = slash === -1 ? 128 : Number(text.slice(slash + 1))
  if (slash !== -1 && !/^\d{1,3}$/.test(text.slice(slash + 1))) {
    return failV6('前缀长度必须是 0-128 的整数')
  }
  if (prefix < 0 || prefix > 128) return failV6('前缀长度必须在 0-128 之间')
  const addr = ipv6ToBigInt(addrPart)
  if (addr === null) return failV6('IPv6 地址格式不正确')

  const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix)
  const network = addr & mask
  const totalCount = 2n ** BigInt(128 - prefix)
  const lastAddress = network + totalCount - 1n
  return {
    ok: true,
    address: bigIntToIpv6(addr, true),
    expanded: bigIntToIpv6(addr, false),
    prefix,
    network: `${bigIntToIpv6(network, true)}/${prefix}`,
    lastAddress: bigIntToIpv6(lastAddress, true),
    totalCount: totalCount.toString(),
    scope: ipv6Scope(addr),
  }
}

function failV6(error: string): Ipv6Result {
  return {
    ok: false,
    error,
    address: '',
    expanded: '',
    prefix: 0,
    network: '',
    lastAddress: '',
    totalCount: '',
    scope: '',
  }
}

/** 按输入内容自动选择 v4 / v6 解析 */
export function parseIp(input: string): { version: 4 | 6; result: Ipv4Result | Ipv6Result } {
  if (input.includes(':')) return { version: 6, result: parseIpv6(input) }
  return { version: 4, result: parseIpv4(input) }
}
