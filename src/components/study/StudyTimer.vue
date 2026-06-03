<script setup lang="ts">
import { computed } from 'vue'
import type { TimerStatus } from '../../composables/useTimer'

const props = defineProps<{
  status: TimerStatus
  elapsed: number
  displayTime: string
  displayTimeFull: string
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'pause'): void
  (e: 'resume'): void
  (e: 'stop'): void
}>()

const isRunning = computed(() => props.status === 'running')
const isPaused = computed(() => props.status === 'paused')
const isIdle = computed(() => props.status === 'idle')

// 计算圆形进度 (假设最大计时 4 小时 = 14400 秒)
const progressRate = computed(() => {
  const max = 4 * 60 * 60
  return Math.min((props.elapsed / max) * 100, 100)
})

const progressColor = computed(() => {
  if (isRunning.value) return '#4A90D9'
  if (isPaused.value) return '#FAAD14'
  return '#e5e5e5'
})
</script>

<template>
  <div class="study-timer">
    <!-- 圆形进度显示 -->
    <van-circle
      :rate="progressRate"
      :speed="60"
      :text="displayTime"
      :color="progressColor"
      :stroke-width="60"
      size="200px"
      layer-color="#ebedf0"
    />

    <!-- 所选科目 -->
    <div class="timer-actions">
      <div v-if="isIdle" class="flex-center">
        <van-button type="primary" size="large" round @click="$emit('start')">
          <van-icon name="play-circle-o" />
          开始计时
        </van-button>
      </div>

      <div v-else class="timer-controls">
        <van-button
          v-if="isRunning"
          icon="pause-circle-o"
          round
          type="warning"
          size="large"
          @click="$emit('pause')"
        >
          暂停
        </van-button>

        <van-button
          v-if="isPaused"
          icon="play-circle-o"
          round
          type="primary"
          size="large"
          @click="$emit('resume')"
        >
          继续
        </van-button>

        <van-button
          icon="stop-circle-o"
          round
          type="danger"
          size="large"
          @click="$emit('stop')"
        >
          停止
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.study-timer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.timer-actions {
  margin-top: 32px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.timer-controls {
  display: flex;
  gap: 20px;
}
</style>
