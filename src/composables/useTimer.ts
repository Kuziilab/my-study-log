import { ref, computed, watch } from 'vue'
import type { Subject } from '../db/schema'

export type TimerStatus = 'idle' | 'running' | 'paused'

const STORAGE_KEY = 'study_timer_state'

interface SavedState {
  status: TimerStatus
  startTimestamp: number    // Date.now() 绝对时间戳
  totalPauseMs: number      // 累计暂停毫秒
  pauseTimestamp: number    // 最近暂停时刻
  startTimeISO: string
  subject: Subject | null
}

function saveState(state: SavedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* quota exceeded */ }
}

function loadState(): SavedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedState
  } catch { return null }
}

function clearState() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
}

export function useTimer() {
  // ====== 尝试从 localStorage 恢复状态 ======
  const saved = loadState()

  const status = ref<TimerStatus>(saved?.status || 'idle')
  const selectedSubject = ref<Subject | null>(saved?.subject || null)
  const startTimestamp = ref(saved?.startTimestamp || 0)
  const totalPauseMs = ref(saved?.totalPauseMs || 0)
  const pauseTimestamp = ref(saved?.pauseTimestamp || 0)
  const startTimeISO = ref(saved?.startTimeISO || '')
  const _elapsedCache = ref(0)

  let tickHandle: ReturnType<typeof setInterval> | null = null

  // ====== 时间戳计时核心 ======
  function tick() {
    if (status.value !== 'running') return
    const now = Date.now()
    const total = Math.max(0, now - startTimestamp.value - totalPauseMs.value)
    _elapsedCache.value = Math.floor(total / 1000)
  }

  function startTick() {
    stopTick()
    // 立即算一次 + 启动定时刷新
    tick()
    tickHandle = setInterval(tick, 250)
  }

  function stopTick() {
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null }
  }

  // ====== 持久化 ======
  function persist() {
    if (status.value === 'idle') {
      clearState()
      return
    }
    saveState({
      status: status.value,
      startTimestamp: startTimestamp.value,
      totalPauseMs: totalPauseMs.value,
      pauseTimestamp: pauseTimestamp.value,
      startTimeISO: startTimeISO.value,
      subject: selectedSubject.value,
    })
  }

  // 关键状态变化时自动保存
  watch([status, startTimestamp, totalPauseMs, pauseTimestamp], () => {
    persist()
  })

  // ====== 页面隐藏/恢复处理 ======
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      if (status.value === 'running') {
        // 从休眠恢复：用绝对时间戳重算，修正任意时长的时间差
        tick()
      } else if (status.value === 'paused') {
        // 暂停中恢复：累加休眠期间的暂停时长
        // （实际上暂停期间不需要修正，elapsed 不变）
      }
    } else {
      // 页面隐藏时再保存一次，确保最新状态落地
      persist()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // iOS Safari: 从页面缓存恢复时触发
  window.addEventListener('pageshow', () => {
    if (status.value === 'running') {
      tick()
    }
  })

  // 如果从 localStorage 恢复了一个 running 状态，立即计算当前时间
  if (status.value === 'running') {
    tick()
    startTick()
  } else if (status.value === 'paused') {
    tick() // 取冻结时的值
  }

  // ====== 计算属性 ======
  const elapsed = computed(() => _elapsedCache.value)
  const elapsedMinutes = computed(() => Math.round(elapsed.value / 60))

  const displayTime = computed(() => {
    const m = Math.floor(elapsed.value / 60)
    const s = elapsed.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  const displayTimeFull = computed(() => {
    const h = Math.floor(elapsed.value / 3600)
    const m = Math.floor((elapsed.value % 3600) / 60)
    const s = elapsed.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  // ====== 操作 ======
  function setSubject(subject: Subject) {
    selectedSubject.value = subject
    persist()
  }

  function start() {
    if (status.value === 'running') return
    status.value = 'running'
    const now = Date.now()
    startTimestamp.value = now
    totalPauseMs.value = 0
    pauseTimestamp.value = 0
    startTimeISO.value = new Date().toISOString()
    startTick()
  }

  function pause() {
    if (status.value !== 'running') return
    status.value = 'paused'
    pauseTimestamp.value = Date.now()
    tick()
    stopTick()
  }

  function resume() {
    if (status.value !== 'paused') return
    totalPauseMs.value += Date.now() - pauseTimestamp.value
    pauseTimestamp.value = 0
    status.value = 'running'
    startTick()
  }

  function stop() {
    tick()
    stopTick()
    const endTime = new Date().toISOString()
    const result = {
      startTime: startTimeISO.value,
      endTime,
      elapsedSeconds: elapsed.value,
      elapsedMinutes: elapsedMinutes.value,
      subject: selectedSubject.value,
    }
    // 重置
    status.value = 'idle'
    _elapsedCache.value = 0
    startTimestamp.value = 0
    totalPauseMs.value = 0
    pauseTimestamp.value = 0
    startTimeISO.value = ''
    clearState()
    return result
  }

  function reset() {
    stopTick()
    status.value = 'idle'
    _elapsedCache.value = 0
    selectedSubject.value = null
    startTimestamp.value = 0
    totalPauseMs.value = 0
    pauseTimestamp.value = 0
    startTimeISO.value = ''
    clearState()
  }

  return {
    status,
    elapsed,
    elapsedMinutes,
    selectedSubject,
    displayTime,
    displayTimeFull,
    setSubject,
    start,
    pause,
    resume,
    stop,
    reset,
  }
}
