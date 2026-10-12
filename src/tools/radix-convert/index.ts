import { registerTool } from '../registry'

registerTool({
  id: 'radix',
  name: '进制转换',
  description: '2-36 进制互转，支持小数、负数与大整数',
  category: 'format',
  component: () => import('./RadixTool.vue'),
})
