import { registerTool } from '../registry'

registerTool({
  id: 'url',
  name: 'URL 编解码',
  description: 'URL 组件编解码，处理查询参数中的特殊字符',
  category: 'encode',
  component: () => import('./UrlTool.vue'),
})
