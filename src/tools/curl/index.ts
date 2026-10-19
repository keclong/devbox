import { registerTool } from '../registry'

registerTool({
  id: 'curl',
  name: 'cURL 转代码',
  description: '粘贴 cURL 命令，一键生成 Python/JS/Go/Java/PHP/C#/Ruby 等语言代码',
  category: 'network',
  component: () => import('./CurlTool.vue'),
})