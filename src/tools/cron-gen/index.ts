import { registerTool } from '../registry'

registerTool({
  id: 'crongen',
  name: 'Cron 生成器',
  description: '可视化生成 Cron 表达式，实时校验并预览执行时间',
  category: 'time',
  component: () => import('./CronGenTool.vue'),
})
