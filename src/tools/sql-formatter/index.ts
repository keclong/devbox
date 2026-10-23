import { registerTool } from '../registry'

registerTool({
  id: 'sql-formatter',
  name: 'SQL 格式化',
  description: '美化 SQL 语句：子句换行缩进、关键字大写、字段列表对齐，全程本地处理',
  category: 'format',
  component: () => import('./SqlFormatter.vue'),
})