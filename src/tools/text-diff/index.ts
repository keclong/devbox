import { registerTool } from '../registry'

registerTool({
  id: 'diff',
  name: '文本 Diff',
  description: '行级文本对比，高亮显示新增与删除',
  category: 'format',
  component: () => import('./TextDiffTool.vue'),
})
