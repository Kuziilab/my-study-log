<script setup lang="ts">
import { ref, onMounted, onActivated, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useDiaryDatabase, useCountdownDatabase, useSessionDatabase, useSubjectDatabase } from '../composables/useDatabase'
import { todayISO, formatDuration } from '../utils/date'
import type { Subject } from '../db/schema'

const router = useRouter()

// Calendar date range
const calMinDate = new Date(2024, 0, 1)
const calMaxDate = new Date(2027, 11, 31)
const calDefaultDate = new Date()

const { entries, fetchByDate, getDatesWithEntries } = useDiaryDatabase()
const { countdown, fetchCountdown, saveCountdown, deleteCountdown } = useCountdownDatabase()
const { sessions, fetchByDate: fetchSessions } = useSessionDatabase()
const { subjects, fetchSubjects } = useSubjectDatabase()

// 科目映射
const subjectMap = ref<Map<number, Subject>>(new Map())

// ====== 日历 ======
const calendarDate = ref(todayISO())
const calendarShow = ref(false)
const diaryDates = ref<string[]>([])

const formattedDate = computed(() => {
  const d = new Date(calendarDate.value)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

async function onDateConfirm(value: any) {
  // Vant 4 Calendar @confirm 返回 Date 或 { selectedValues }
  let d: Date
  if (value instanceof Date) {
    d = value
  } else if (value?.selectedValues) {
    d = new Date(value.selectedValues[0], value.selectedValues[1] - 1, value.selectedValues[2])
  } else if (value?.date instanceof Date) {
    d = value.date
  } else {
    d = new Date()
  }
  // 用本地时间格式化，避免 UTC 时区偏移
  calendarDate.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  calendarShow.value = false
  await fetchByDate(calendarDate.value)
  await fetchSessions(calendarDate.value)
}

async function loadData() {
  await Promise.all([fetchByDate(calendarDate.value), fetchCountdown(), fetchSessions(calendarDate.value), fetchSubjects()])
  diaryDates.value = await getDatesWithEntries()
  subjectMap.value = new Map(subjects.value.map(s => [s.id!, s]))
}

onMounted(loadData)
onActivated(loadData)

// ====== 倒计时 ======
const showCountdownPopup = ref(false)
const cdName = ref('')
const cdDate = ref('')
const cdTime = ref('09:00')

const now = ref(Date.now())
let timer = 0

onMounted(() => { timer = window.setInterval(() => { now.value = Date.now() }, 1000) })
onUnmounted(() => { clearInterval(timer) })

const countdownRemaining = computed(() => {
  if (!countdown.value) return null
  const target = new Date(`${countdown.value.targetDate}T${countdown.value.targetTime}:00`).getTime()
  const diff = target - now.value
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    expired: false,
  }
})

function openCountdownSetting() {
  if (countdown.value) {
    cdName.value = countdown.value.name
    cdDate.value = countdown.value.targetDate
    cdTime.value = countdown.value.targetTime
  } else {
    cdName.value = ''
    cdDate.value = todayISO()
    cdTime.value = '09:00'
  }
  showCountdownPopup.value = true
}

async function handleSaveCountdown() {
  if (!cdName.value.trim()) { showToast('请输入倒计时名称'); return }
  await saveCountdown({ name: cdName.value.trim(), targetDate: cdDate.value, targetTime: cdTime.value })
  showCountdownPopup.value = false
  showToast('倒计时已设置')
}

// ====== 日记 ======
function openDiaryEditor(date?: string) {
  router.push(`/diary/${date || calendarDate.value}`)
}

function getMoodEmoji(mood: string) { return mood || '😊' }
function getWeatherEmoji(w: string) { return w || '☀️' }

// 当前选中日期的日记
const currentEntry = computed(() => entries.value[0] || null)

// 返回今日
function goToToday() {
  calendarDate.value = todayISO()
  fetchByDate(calendarDate.value)
  fetchSessions(calendarDate.value)
}

function getSubjectName(id: number) { return subjectMap.value.get(id)?.name || '未知' }
function getSubjectColor(id: number) { return subjectMap.value.get(id)?.color || '#999' }

</script>

<template>
  <div class="page-content page-content--with-padding">
    <!-- ====== 日历区域（上 1/3） ====== -->
    <div class="card-section calendar-section">
      <div class="calendar-header" @click="calendarShow = true">
        <div class="calendar-date-big">
          <span class="cal-day">{{ calendarDate.slice(8) }}</span>
          <div class="cal-my">
            <span>{{ calendarDate.slice(0, 7) }}</span>
            <van-icon name="arrow-down" size="12" color="#999" />
          </div>
        </div>
        <span class="cal-weekday">{{ formattedDate }}</span>
      </div>
      <!-- 返回今日 -->
      <div v-if="calendarDate !== todayISO()" style="text-align:right;margin-top:4px">
        <van-button size="mini" type="primary" plain @click.stop="goToToday">返回今日</van-button>
      </div>

      <!-- Vant Calendar -->
      <van-calendar
        v-model:show="calendarShow"
        :default-date="calDefaultDate"
        :min-date="calMinDate"
        :max-date="calMaxDate"
        @confirm="onDateConfirm"
      />

      <!-- 有日记的日期标记（小圆点） -->
      <div class="diary-dots">
        <span v-if="diaryDates.includes(calendarDate)" class="has-diary">📝 有日记</span>
        <span v-else class="no-diary">这天还没有日记</span>
      </div>
    </div>

    <!-- ====== 倒计时 ====== -->
    <div class="card-section countdown-section" @click="openCountdownSetting">
      <template v-if="countdown">
        <div class="cd-header">
          <span class="cd-name">{{ countdown.name }}</span>
          <van-icon name="edit" size="16" color="#999" />
        </div>
        <div class="cd-target">目标日期：{{ countdown.targetDate }} {{ countdown.targetTime }}</div>
        <div class="cd-display">
          <template v-if="countdownRemaining && !countdownRemaining.expired">
            <div class="cd-num">{{ countdownRemaining.days }}</div>
            <div class="cd-unit">天</div>
            <div class="cd-num">{{ String(countdownRemaining.hours).padStart(2, '0') }}</div>
            <div class="cd-unit">时</div>
            <div class="cd-num">{{ String(countdownRemaining.minutes).padStart(2, '0') }}</div>
            <div class="cd-unit">分</div>
            <div class="cd-num">{{ String(countdownRemaining.seconds).padStart(2, '0') }}</div>
            <div class="cd-unit">秒</div>
          </template>
          <template v-else>
            <span style="font-size:20px;color:#F5222D">已到期 🎉</span>
          </template>
        </div>
      </template>
      <template v-else>
        <div class="cd-empty">
          <van-icon name="clock-o" size="24" color="#bbb" />
          <span>点击设置倒计时</span>
        </div>
      </template>
    </div>

    <!-- ====== 日记列表（下 2/3） ====== -->
    <div class="card-section diary-section">
      <div class="diary-section-header">
        <span class="card-section__title" style="margin-bottom:0">📖 日记心得</span>
        <van-icon
          name="edit"
          size="20"
          color="#4A90D9"
          @click="openDiaryEditor(calendarDate)"
        />
      </div>

      <div v-if="!currentEntry" class="diary-empty">
        <van-empty description="这天还没有日记" />
        <van-button type="primary" round size="small" @click="openDiaryEditor(calendarDate)">
          写日记
        </van-button>
      </div>

      <div v-else class="diary-card" @click="openDiaryEditor(calendarDate)">
        <div class="diary-card__header">
          <span class="diary-mood">{{ getMoodEmoji(currentEntry.mood) }}</span>
          <span class="diary-weather">{{ getWeatherEmoji(currentEntry.weather) }}</span>
          <span class="diary-time">{{ currentEntry.time }}</span>
          <van-icon name="edit" size="16" color="#999" class="diary-edit-icon" />
        </div>
        <div class="diary-card__preview">
          {{ (currentEntry.content || '').replace(/<[^>]+>/g, '').slice(0, 120) }}{{ (currentEntry.content || '').replace(/<[^>]+>/g, '').length > 120 ? '...' : '' }}
        </div>
      </div>
    </div>

    <!-- ====== 该日学习记录 ====== -->
    <div class="card-section session-section" style="margin-top:14px">
      <div class="card-section__title">📝 该日学习记录</div>
      <div v-if="sessions.length === 0" class="task-empty">
        这天还没有学习记录
      </div>
      <div v-else>
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :style="{ borderLeftColor: getSubjectColor(session.subjectId) }"
        >
          <div class="session-item__top">
            <van-tag :color="getSubjectColor(session.subjectId)" size="medium">
              {{ getSubjectName(session.subjectId) }}
            </van-tag>
            <span class="session-item__duration">{{ formatDuration(session.durationMinutes) }}</span>
          </div>
          <div v-if="session.note" class="session-item__note">{{ session.note }}</div>
        </div>
      </div>
    </div>

    <!-- ====== 倒计时设置弹窗 ====== -->
    <van-popup v-model:show="showCountdownPopup" round position="bottom">
      <div class="goal-popup">
        <h3 class="goal-popup__title">设置倒计时</h3>
        <van-field v-model="cdName" label="名称" placeholder="如：高考倒计时" maxlength="20" />
        <van-field label="目标日期">
          <template #input>
            <input type="date" v-model="cdDate" class="date-input" />
          </template>
        </van-field>
        <van-field label="目标时间">
          <template #input>
            <input type="time" v-model="cdTime" class="date-input" />
          </template>
        </van-field>
        <div class="goal-popup__actions">
          <van-button type="primary" round block @click="handleSaveCountdown">保存</van-button>
          <van-button
            v-if="countdown"
            type="danger"
            round
            block
            plain
            @click="deleteCountdown(); showCountdownPopup = false; showToast('已删除')"
          >
            删除倒计时
          </van-button>
          <van-button round block plain @click="showCountdownPopup = false">取消</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
/* ====== 日历 ====== */
.calendar-section { padding-bottom: 12px; }
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}
.calendar-date-big {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.cal-day {
  font-size: 40px;
  font-weight: 800;
  color: #333;
  line-height: 1;
}
.cal-my {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
}
.cal-weekday { font-size: 14px; color: #999; }
.diary-dots { margin-top: 8px; font-size: 12px; }
.has-diary { color: #4A90D9; }
.no-diary { color: #ccc; }

/* ====== 倒计时 ====== */
.countdown-section { cursor: pointer; }
.cd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.cd-name { font-size: 15px; font-weight: 600; color: #333; }
.cd-target { font-size: 11px; color: #999; margin-bottom: 10px; }
.cd-display { display: flex; align-items: baseline; gap: 4px; justify-content: center; padding: 8px 0; }
.cd-num {
  font-size: 28px;
  font-weight: 800;
  color: #4A90D9;
  font-variant-numeric: tabular-nums;
  font-family: 'SF Mono', 'Menlo', monospace;
  min-width: 36px;
  text-align: center;
}
.cd-unit { font-size: 12px; color: #999; }
.cd-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #bbb;
  font-size: 14px;
  padding: 16px 0;
}

/* ====== 日记 ====== */
.diary-section { flex: 1; }
.diary-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.diary-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.diary-card {
  background: #fafbfc;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}
.diary-card:active { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.diary-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.diary-mood { font-size: 28px; }
.diary-weather { font-size: 22px; }
.diary-time { font-size: 13px; color: #999; flex: 1; }
.diary-edit-icon { flex-shrink: 0; }
.diary-card__preview {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ====== 学习记录 ====== */
.session-item { background: #fafbfc; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; border-left: 4px solid #4A90D9; }
.session-item__top { display: flex; justify-content: space-between; align-items: center; }
.session-item__duration { font-weight: 600; color: #333; font-size: 15px; }
.session-item__note { font-size: 12px; color: #999; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.task-empty { text-align: center; color: #bbb; padding: 16px 0; font-size: 13px; }

/* ====== 弹窗 ====== */
.goal-popup { padding: 20px 16px 30px; }
.goal-popup__title { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.goal-popup__actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.date-input { border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; font-size: 14px; width: 100%; }
</style>
