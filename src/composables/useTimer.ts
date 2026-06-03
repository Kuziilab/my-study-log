import { ref, computed } from 'vue'
import type { Subject } from '../db/schema'

export type TimerStatus = 'idle' | 'running' | 'paused'

export function useTimer() {
  const status = ref<TimerStatus>('idle')
  const elapsed = ref(0) // 已过秒数
  const selectedSubject = ref<Subject | null>(null)
  const startTime = ref<string>('')
  const pauseStartTime = ref<string>('')

  let intervalId: ReturnType<typeof setInterval> | null = null

  // 格式化显示 MM:SS
  const displayTime = computed(() => {
    const m = Math.floor(elapsed.value / 60)
    const s = elapsed.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  // 格式化显示 小时:分钟:秒
  const displayTimeFull = computed(() => {
    const h = Math.floor(elapsed.value / 3600)
    const m = Math.floor((elapsed.value % 3600) / 60)
    const s = elapsed.value % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  // 已过分钟数
  const elapsedMinutes = computed(() => Math.round(elapsed.value / 60))

  function setSubject(subject: Subject) {
    selectedSubject.value = subject
  }

  function start() {
    if (status.value === 'running') return
    status.value = 'running'
    startTime.value = new Date().toISOString()

    intervalId = setInterval(() => {
      elapsed.value++
    }, 1000)
  }

  function pause() {
    if (status.value !== 'running') return
    status.value = 'paused'
    pauseStartTime.value = new Date().toISOString()

    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function resume() {
    if (status.value !== 'paused') return
    status.value = 'running'

    intervalId = setInterval(() => {
      elapsed.value++
    }, 1000)
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    const endTime = new Date().toISOString()
    const result = {
      startTime: startTime.value,
      endTime,
      elapsedSeconds: elapsed.value,
      elapsedMinutes: elapsedMinutes.value,
      subject: selectedSubject.value,
    }

    // 重置状态
    status.value = 'idle'
    elapsed.value = 0
    startTime.value = ''
    pauseStartTime.value = ''

    return result
  }

  function reset() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    status.value = 'idle'
    elapsed.value = 0
    selectedSubject.value = null
    startTime.value = ''
    pauseStartTime.value = ''
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
