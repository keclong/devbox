import { registerTool } from '../registry'

registerTool({
  id: 'aes',
  name: 'AES 加解密',
  description: 'AES-256-GCM 加密 + PBKDF2 密钥派生，随机盐与 IV，全程本地计算',
  category: 'encode',
  component: () => import('./AesTool.vue'),
})
