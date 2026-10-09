import { registerTool } from '../registry'

registerTool({
  id: 'hash',
  name: '哈希计算',
  description: 'MD5 与 SHA-1/256/384/512 哈希，实时计算',
  category: 'encode',
  component: () => import('./HashTool.vue'),
})
