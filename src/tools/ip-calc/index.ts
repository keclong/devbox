import { registerTool } from '../registry'

registerTool({
  id: 'ip',
  name: 'IP 子网计算器',
  description: 'IPv4/IPv6 CIDR 解析：网段、掩码、可用主机范围',
  category: 'network',
  component: () => import('./IpCalcTool.vue'),
})
