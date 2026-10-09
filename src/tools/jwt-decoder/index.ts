import { registerTool } from '../registry'

registerTool({
  id: 'jwt',
  name: 'JWT 解析',
  description: '解码 JWT 的 Header 与 Payload，检查过期时间',
  category: 'encode',
  component: () => import('./JwtDecoder.vue'),
})
