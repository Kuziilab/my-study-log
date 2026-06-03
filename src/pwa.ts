import { registerSW } from 'virtual:pwa-register'

export const updateSW = registerSW({
  onNeedRefresh() {
    // 存储回调供 App.vue 使用
    ;(window as any).__pwaNeedRefresh = true
    ;(window as any).__pwaUpdate = () => {
      updateSW()
    }
  },
  onOfflineReady() {
    console.log('[PWA] 应用已准备好离线使用')
  },
  onRegistered(registration) {
    if (registration) {
      // 每小时检查更新
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
    }
  },
})
