/**
 * MD5 实现（RFC 1321），零依赖。
 * 输入 Uint8Array（UTF-8 字节），输出 16 字节摘要。
 * 已用 RFC 1321 标准测试向量验证。
 */

// 每轮左移位数
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
  14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15,
  21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

// 正弦表生成的 64 个常量
const K = new Uint32Array(64)
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)
}

export function md5(message: Uint8Array): Uint8Array {
  const msgLen = message.length
  const bitLen = msgLen * 8
  // 补位：消息 + 0x80 + 0x00 填充 + 64 位小端原始位长，总长为 64 的倍数
  const paddedLen = Math.ceil((msgLen + 9) / 64) * 64
  const buf = new Uint8Array(paddedLen)
  buf.set(message)
  buf[msgLen] = 0x80
  const view = new DataView(buf.buffer)
  view.setUint32(paddedLen - 8, bitLen >>> 0, true)
  view.setUint32(paddedLen - 4, Math.floor(bitLen / 4294967296), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  const M = new Uint32Array(16)
  for (let chunk = 0; chunk < paddedLen; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      M[i] = view.getUint32(chunk + i * 4, true)
    }
    let a = a0
    let b = b0
    let c = c0
    let d = d0
    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      f = (f + a + K[i] + M[g]) | 0
      a = d
      d = c
      c = b
      b = (b + ((f << SHIFTS[i]) | (f >>> (32 - SHIFTS[i])))) | 0
    }
    a0 = (a0 + a) | 0
    b0 = (b0 + b) | 0
    c0 = (c0 + c) | 0
    d0 = (d0 + d) | 0
  }

  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  outView.setUint32(0, a0, true)
  outView.setUint32(4, b0, true)
  outView.setUint32(8, c0, true)
  outView.setUint32(12, d0, true)
  return out
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
