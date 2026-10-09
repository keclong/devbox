import { registerTool } from '../registry'

registerTool({
  id: 'cron',
  name: 'Cron 表达式解析',
  description: '解析 Cron 表达式，推算未来 10 次执行时间',
  category: 'time',
  component: () => import('./CronTool.vue'),
})
