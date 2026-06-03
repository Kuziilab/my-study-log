import { ref } from 'vue'

export interface BackgroundSettings {
  home?: string
  timer?: string
  stats?: string
  journal?: string
  lockscreen?: string
}

// 用 IndexedDB 存背景图（不限制大小）
function openBgDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('MyStudyBg', 1)
    req.onupgradeneeded = () => { req.result.createObjectStore('bg') }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadFromDB(): Promise<BackgroundSettings> {
  try {
    const db = await openBgDB()
    return new Promise((resolve) => {
      const tx = db.transaction('bg', 'readonly')
      const req = tx.objectStore('bg').get('settings')
      req.onsuccess = () => resolve(req.result || {})
      req.onerror = () => resolve({})
    })
  } catch { return {} }
}

async function saveToDB(settings: BackgroundSettings): Promise<boolean> {
  try {
    const db = await openBgDB()
    return new Promise((resolve) => {
      const tx = db.transaction('bg', 'readwrite')
      tx.objectStore('bg').put(settings, 'settings')
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch { return false }
}

export function useBackground() {
  const settings = ref<BackgroundSettings>({})
  const loaded = ref(false)

  async function load() {
    settings.value = await loadFromDB()
    loaded.value = true
  }

  async function setBg(key: keyof BackgroundSettings, value: string) {
    settings.value[key] = value
    const ok = await saveToDB({ ...settings.value })
    if (!ok) {
      delete settings.value[key]
      throw new Error('保存失败')
    }
  }

  async function removeBg(key: keyof BackgroundSettings) {
    delete settings.value[key]
    await saveToDB({ ...settings.value })
  }

  function getBg(key: keyof BackgroundSettings): string {
    return settings.value[key] || ''
  }

  load()

  return { settings, loaded, setBg, removeBg, getBg }
}
