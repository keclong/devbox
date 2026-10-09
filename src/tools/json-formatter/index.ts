import { registerTool } from '../registry'

registerTool({
  id: 'json-formatter',
  name: 'JSON 工具箱',
  description: '格式化、压缩、转义与校验 JSON',
  category: 'format',
  component: () => import('./JsonFormatter.vue'),
})
