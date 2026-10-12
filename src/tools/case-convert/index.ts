import { registerTool } from '../registry'

registerTool({
  id: 'case',
  name: '命名转换',
  description: 'camelCase、snake_case 等 8 种命名风格互转',
  category: 'format',
  component: () => import('./CaseTool.vue'),
})
