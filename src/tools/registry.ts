import type { Component } from 'vue'

export type ToolCategory = 'format' | 'encode' | 'time' | 'generate' | 'network'

export interface ToolMeta {
  /** 唯一标识，同时作为路由 path：/tool/{id} */
  id: string
  /** 工具显示名称 */
  name: string
  /** 一句话描述，展示在首页卡片 */
  description: string
  /** 分类，决定首页分组 */
  category: ToolCategory
  /** 懒加载的工具组件 */
  component: () => Promise<Component>
}

const tools = new Map<string, ToolMeta>()

/** 注册一个工具。重复注册会被忽略并给出警告。 */
export function registerTool(meta: ToolMeta): void {
  if (tools.has(meta.id)) {
    console.warn(`[registry] 工具 "${meta.id}" 已注册，重复注册已忽略`)
    return
  }
  tools.set(meta.id, meta)
}

export function getTool(id: string): ToolMeta | undefined {
  return tools.get(id)
}

export function getTools(): ToolMeta[] {
  return [...tools.values()]
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  format: '格式化与转换',
  encode: '编码与加密',
  time: '时间与日期',
  generate: '生成与随机',
  network: '网络与协议',
}
