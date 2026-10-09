import { registerTool } from '../registry'

registerTool({
  id: 'timestamp',
  name: '时间戳转换',
  description: 'Unix 时间戳与日期时间互转，支持秒 / 毫秒与多时区',
  category: 'time',
  component: () => import('./TimestampConverter.vue'),
})
