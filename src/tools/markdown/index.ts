import { registerTool } from '../registry'

registerTool({
  id: 'markdown',
  name: 'Markdown 编辑器',
  description: '实时渲染 Markdown，自研解析器零依赖，输出经 XSS 转义防护',
  category: 'format',
  component: () => import('./MarkdownTool.vue'),
})
