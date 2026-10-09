import { registerTool } from '../registry'

registerTool({
  id: 'regex',
  name: '正则测试',
  description: '实时匹配高亮与捕获组展示，默认全局匹配',
  category: 'format',
  component: () => import('./RegexTester.vue'),
})
