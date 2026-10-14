import { registerTool } from '../registry'

registerTool({
  id: 'jsonpath',
  name: 'JSONPath 查询',
  description: '自研 JSONPath 引擎：递归、通配符、切片、过滤表达式提取 JSON 数据',
  category: 'format',
  component: () => import('./JsonPathTool.vue'),
})
