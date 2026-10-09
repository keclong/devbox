// 汇总导入：每个工具的 index.ts 在模块加载时自动完成注册。
// 新增工具时，只需在这里加一行 import。
import './base64'
import './json-formatter'
import './regex-tester'
import './text-diff'
import './timestamp'
import './url-encode'

export { getTool, getTools, registerTool, CATEGORY_LABELS } from './registry'
export type { ToolCategory, ToolMeta } from './registry'
