import { registerTool } from '../registry'

registerTool({
  id: 'color',
  name: '颜色转换',
  description: 'HEX / RGB / HSL 互转，带实时预览与取色器',
  category: 'format',
  component: () => import('./ColorConverter.vue'),
})
