import { registerTool } from '../registry'

registerTool({
  id: 'uuid',
  name: 'UUID / 随机字符串生成',
  description: '批量生成 UUID v4 与加密安全随机字符串',
  category: 'generate',
  component: () => import('./UuidGenerator.vue'),
})
