import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import './tools' // 须先于 router 导入：触发所有工具的注册
import router from './router'
import './style.css'

createApp(App).use(router).use(ElementPlus).mount('#app')
