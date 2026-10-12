import { registerTool } from '../registry'

registerTool({
  id: 'unicode',
  name: 'Unicode 转义',
  description: '中文与 Emoji 转 \\uXXXX、HTML 实体等，可反转义',
  category: 'encode',
  component: () => import('./UnicodeTool.vue'),
})
