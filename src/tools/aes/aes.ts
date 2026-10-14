/**
 * AES-256-GCM 加解密，基于 WebCrypto（crypto.subtle）。
 * PBKDF2-SHA256 派生密钥（20 万次迭代，随机盐），GCM 模式自带完整性校验。
 * 输出格式：`devbox1:` + base64( salt[16] | iv[12] | ciphertext+tag )
 */

const PBKDF2_ITERATIONS = 200_000
const SALT_BYTES = 16
const IV_BYTES = 12
const MAGIC = 'devbox1:'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function requireSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle
  if (!subtle) {
    throw new Error('当前环境不支持 WebCrypto（需 HTTPS 或 localhost 等安全上下文）')
  }
  return subtle
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = requireSubtle()
  const material = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 加密：返回带 magic 前缀的 base64 载荷 */
export async function encryptText(plainText: string, password: string): Promise<string> {
  if (!password) throw new Error('请输入加密密码')
  const subtle = requireSubtle()
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(password, salt)
  const cipher = new Uint8Array(
    await subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new TextEncoder().encode(plainText),
    ),
  )
  const payload = new Uint8Array(salt.length + iv.length + cipher.length)
  payload.set(salt, 0)
  payload.set(iv, salt.length)
  payload.set(cipher, salt.length + iv.length)
  return MAGIC + toBase64(payload)
}

/** 解密：密码错误或数据损坏时抛出中文错误 */
export async function decryptText(payloadText: string, password: string): Promise<string> {
  if (!password) throw new Error('请输入解密密码')
  const body = payloadText.trim().startsWith(MAGIC)
    ? payloadText.trim().slice(MAGIC.length)
    : payloadText.trim()
  let payload: Uint8Array
  try {
    payload = fromBase64(body)
  } catch {
    throw new Error('密文不是有效的 base64 格式')
  }
  if (payload.length <= SALT_BYTES + IV_BYTES) {
    throw new Error('密文长度不足，数据可能已损坏')
  }
  const salt = payload.subarray(0, SALT_BYTES)
  const iv = payload.subarray(SALT_BYTES, SALT_BYTES + IV_BYTES)
  const cipher = payload.subarray(SALT_BYTES + IV_BYTES)
  const key = await deriveKey(password, salt)
  try {
    const plain = await requireSubtle().decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, cipher)
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('解密失败：密码错误或密文已损坏')
  }
}
