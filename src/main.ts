import { createApp } from 'vue'
import { h } from 'vue'
import ElementPlus from 'element-plus'
import { ElButton, ElNotification } from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './tools' // 须先于 router 导入：触发所有工具的注册
import router from './router'
import './style.css'
import { registerSW } from 'virtual:pwa-register'

createApp(App).use(router).use(ElementPlus).mount('#app')

// PWA：新版本就绪时提示刷新（registerType: 'prompt'，不自动刷新）
const updateSW = registerSW({
  onNeedRefresh() {
    ElNotification({
      title: '发现新版本',
      position: 'bottom-right',
      duration: 0,
      message: h('div', { class: 'pwa-update' }, [
        h('span', '刷新页面即可使用最新版本'),
        h(
          ElButton,
          {
            type: 'primary',
            size: 'small',
            onClick: () => updateSW(true),
          },
          () => '刷新',
        ),
      ]),
    })
  },
  onOfflineReady() {
    ElNotification({
      title: 'DevBox 已可离线使用',
      message: '断网后仍能继续使用已缓存的工具',
      type: 'success',
      position: 'bottom-right',
      duration: 4000,
    })
  },
})
