import { registerTool } from '../registry'

registerTool({
  id: 'mock',
  name: 'Mock 数据生成',
  description: '生成姓名、手机号、邮箱等测试假数据，支持 JSON / CSV',
  category: 'generate',
  component: () => import('./MockTool.vue'),
})
