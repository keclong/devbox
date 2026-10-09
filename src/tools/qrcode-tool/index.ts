import { registerTool } from '../registry'

registerTool({
  id: 'qrcode',
  name: '二维码生成',
  description: '文本或网址生成二维码，可调尺寸、容错与颜色',
  category: 'generate',
  component: () => import('./QrTool.vue'),
})
