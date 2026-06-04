/**
 * useWakeLock — 屏幕唤醒锁
 *
 * 计时运行时保持屏幕常亮，避免用户在计时界面时屏幕自动熄灭。
 * 页面隐藏（切后台/锁屏）时 wake lock 会自动释放，恢复可见时自动重新获取。
 *
 * 兼容性：iOS Safari 16.4+ 支持，不支持时静默降级。
 */
import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export function useWakeLock() {
  const isActive = ref(false)
  let wakeLock: WakeLockSentinel | null = null
  let shouldHold = false // 用户意图：是否应该持有 wake lock

  const isSupported = 'wakeLock' in navigator

  async function request() {
    shouldHold = true
    if (!isSupported) return
    await acquireLock()
  }

  async function acquireLock() {
    if (!shouldHold) return
    if (wakeLock) return // 已持有
    try {
      wakeLock = await navigator.wakeLock.request('screen')
      isActive.value = true

      // 监听自动释放（页面隐藏时浏览器会释放）
      wakeLock.addEventListener('release', () => {
        wakeLock = null
        isActive.value = false
        // 页面重新可见时自动重新获取
        if (shouldHold && document.visibilityState === 'visible') {
          acquireLock()
        }
      })
    } catch {
      // 静默降级，例如用户未交互或浏览器不支持
    }
  }

  async function release() {
    shouldHold = false
    if (wakeLock) {
      try {
        await wakeLock.release()
      } catch {
        // 忽略
      }
      wakeLock = null
      isActive.value = false
    }
  }

  // 页面从隐藏恢复时重新获取锁
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && shouldHold && !wakeLock) {
      acquireLock()
    }
  }

  // 初始化监听
  if (isSupported) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  return {
    isActive,
    isSupported,
    request,
    release,
  }
}
