/**
 * 应用图标生成脚本：零依赖，直接输出 PNG 到 public/icons/。
 * 图案为项目主色 #4f6ef7 圆角方块 + 白色「</>」符号。
 * maskable 版本按 62% 安全区缩放、背景全出血。
 * 改主色或图案时只需改下面常量后重新运行：node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const PRIMARY = [0x4f, 0x6e, 0xf7]
const WHITE = [0xff, 0xff, 0xff]

/** 「</>」三条折线（归一化坐标，y 向下） */
const GLYPH = [
  // 左尖括号 <
  [0.36, 0.3, 0.26, 0.5],
  [0.26, 0.5, 0.36, 0.7],
  // 右尖括号 >
  [0.64, 0.3, 0.74, 0.5],
  [0.74, 0.5, 0.64, 0.7],
  // 斜杠 /
  [0.56, 0.7, 0.44, 0.3],
]
const GLYPH_WIDTH = 0.085

/** 点到线段距离 */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

/** 圆角矩形 SDF：内部为负 */
function roundedRectSdf(px, py, radius) {
  const half = 0.5 - radius
  const qx = Math.abs(px - 0.5) - half
  const qy = Math.abs(py - 0.5) - half
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
  )
}

/**
 * 渲染 RGBA 像素缓冲。maskable=true 时图案缩至 62% 安全区、背景直角全出血。
 */
function render(size, { maskable }) {
  const scale = maskable ? 0.62 : 1
  const cx = (v) => 0.5 + (v - 0.5) * scale
  const radius = maskable ? 0 : 0.22
  const lineW = GLYPH_WIDTH * scale
  const half = lineW / 2
  const px = new Uint8Array(size * size * 4)
  const samples = 3 // 每边超采样数，抗锯齿

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgCover = 0
      let fgCover = 0
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const nx = (x + (sx + 0.5) / samples) / size
          const ny = (y + (sy + 0.5) / samples) / size
          if (roundedRectSdf(nx, ny, radius) <= 0) bgCover++
          for (const [x1, y1, x2, y2] of GLYPH) {
            if (distToSegment(nx, ny, cx(x1), cx(y1), cx(x2), cx(y2)) <= half) {
              fgCover++
              break
            }
          }
        }
      }
      const total = samples * samples
      const b = bgCover / total
      const f = fgCover / total
      const i = (y * size + x) * 4
      // 线条绘制在背景之上：先背景后线条合成
      px[i] = Math.round(PRIMARY[0] * (1 - f) + WHITE[0] * f)
      px[i + 1] = Math.round(PRIMARY[1] * (1 - f) + WHITE[1] * f)
      px[i + 2] = Math.round(PRIMARY[2] * (1 - f) + WHITE[2] * f)
      px[i + 3] = Math.round(255 * (b + f * (1 - b)))
    }
  }
  return px
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** 像素缓冲 → PNG（truecolor + alpha，filter 0） */
function encodePng(size, px) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { name: 'favicon-16.png', size: 16, maskable: false },
  { name: 'favicon-32.png', size: 32, maskable: false },
  { name: 'favicon-48.png', size: 48, maskable: false },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'maskable-icon-512.png', size: 512, maskable: true },
]

for (const t of targets) {
  const png = encodePng(t.size, render(t.size, t))
  writeFileSync(join(OUT_DIR, t.name), png)
  console.log(`${t.name}  ${t.size}x${t.size}  ${png.length} bytes`)
}
console.log('done')
