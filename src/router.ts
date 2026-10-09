import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Home from './views/Home.vue'
import { getTools } from './tools'

// 路由由注册表自动生成：新增工具后无需改动本文件
const toolRoutes: RouteRecordRaw[] = getTools().map((tool) => ({
  path: `/tool/${tool.id}`,
  name: tool.id,
  component: tool.component,
}))

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Home },
  ...toolRoutes,
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

export default router
