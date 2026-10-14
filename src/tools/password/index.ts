import { registerTool } from '../registry'

registerTool({
  id: 'password',
  name: '密码生成器',
  description: '加密安全随机密码，字符集可调，熵值强度评估，支持排除易混字符',
  category: 'generate',
  component: () => import('./PasswordTool.vue'),
})
