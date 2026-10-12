import { registerTool } from '../registry'

registerTool({
  id: 'timecalc',
  name: '时间计算器',
  description: '时间差计算、日期推算与工作日推算',
  category: 'time',
  component: () => import('./TimeCalcTool.vue'),
})
