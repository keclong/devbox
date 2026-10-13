import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' 保证构建产物可部署到任意子路径（如 GitHub Pages）
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      // prompt：新版本就绪时不自动刷新，由 UI 提示用户手动刷新
      registerType: 'prompt',
      // 手动注册：在 main.ts 中引入 virtual:pwa-register 并接更新提示
      injectRegister: false,
      manifest: {
        name: 'DevBox 开发者工具箱',
        short_name: 'DevBox',
        description: '纯前端开发者小工具集合：JSON、时间戳、Base64、正则测试、二维码等，数据不离开浏览器',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f6fa',
        theme_color: '#4f6ef7',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 预缓存全部构建产物（hash 路由无深路径，导航回退仅为兜底）
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
