import { registerTool } from '../registry'

registerTool({
  id: 'base64',
  name: 'Base64 编解码',
  description: '文本与 Base64 互转，完整支持 UTF-8 中文',
  category: 'encode',
  component: () => import('./Base64Tool.vue'),
})
