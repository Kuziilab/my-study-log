import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { seedDefaultSubjects } from './db/seed'
import { updateSW } from './pwa'
import './assets/styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')

// 首次启动时添加默认科目
seedDefaultSubjects()

// 注册 PWA Service Worker（离线缓存 + 更新提示）
updateSW
