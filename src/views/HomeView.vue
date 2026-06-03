<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useSessionDatabase, useSubjectDatabase, useDailyTaskDatabase, useLongTermGoalDatabase } from '../composables/useDatabase'
import { useBackground } from '../composables/useBackground'
import { todayISO, formatDateCN, getDayName, formatDuration } from '../utils/date'
import type { StudySession, Subject } from '../db/schema'

const router = useRouter()
const { getBg, setBg, removeBg } = useBackground()

// ====== 背景设置弹窗 ======
const showBgSettings = ref(false)
const bgInputUrl = ref('')

async function applyBgUrl() {
  const url = bgInputUrl.value.trim()
  if (url) {
    try {
      await setBg('lockscreen', url)
      showToast('锁屏背景已设置')
    } catch (err: any) {
      showToast(err?.message || '设置失败')
      return
    }
  } else {
    removeBg('lockscreen')
    showToast('已恢复默认')
  }
  showBgSettings.value = false
}

async function handleBgFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async () => {
    try {
      await setBg('lockscreen', reader.result as string)
      showToast('锁屏背景已设置')
      showBgSettings.value = false
    } catch (err: any) {
      showToast(err?.message || '设置失败')
    }
  }
  reader.readAsDataURL(file)
}

const { sessions, fetchByDate, deleteSession } = useSessionDatabase()
const { subjects, fetchSubjects } = useSubjectDatabase()
const { tasks, fetchByDate: fetchTasks, addTask, toggleTask, deleteTask } = useDailyTaskDatabase()
const { goals: longGoals, fetchGoals, addGoal: addLongGoal, deleteGoal: deleteLongGoal } = useLongTermGoalDatabase()

const subjectMap = ref<Map<number, Subject>>(new Map())

// ====== 每日任务 ======
const newTaskTitle = ref('')

// ====== 长期目标 折叠 ======
const showLongGoals = ref(false)

// ====== 添加长期目标弹窗 ======
const showGoalPopup = ref(false)
const goalTitle = ref('')
const goalDesc = ref('')
const goalStartDate = ref('')
const goalEndDate = ref('')

// 默认日期范围：今天 → 30天后
function getDefaultDateRange() {
  const today = new Date()
  const end = new Date(today)
  end.setDate(end.getDate() + 30)
  return {
    start: today.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

// ====== 数据加载 ======
async function loadData() {
  await Promise.all([
    fetchSubjects(),
    fetchByDate(todayISO()),
    fetchTasks(todayISO()),
    fetchGoals(),
  ])
  subjectMap.value = new Map(subjects.value.map(s => [s.id!, s]))
}

onMounted(loadData)
onActivated(loadData)

// ====== 每日任务操作 ======
async function handleAddTask() {
  const title = newTaskTitle.value.trim()
  if (!title) return
  try {
    await addTask(title, todayISO())
    newTaskTitle.value = ''
  } catch (e: any) {
    showToast('添加失败: ' + (e?.message || '未知'))
  }
}

async function handleToggleTask(id: number) {
  await toggleTask(id, todayISO())
}

async function handleDeleteTask(id: number) {
  await deleteTask(id, todayISO())
}

// ====== 长期目标操作 ======
function openAddGoal() {
  const d = getDefaultDateRange()
  goalTitle.value = ''
  goalDesc.value = ''
  goalStartDate.value = d.start
  goalEndDate.value = d.end
  showGoalPopup.value = true
}

async function saveLongGoal() {
  if (!goalTitle.value.trim()) {
    showToast('请输入目标名称')
    return
  }
  await addLongGoal({
    title: goalTitle.value.trim(),
    description: goalDesc.value.trim() || undefined,
    startDate: goalStartDate.value,
    endDate: goalEndDate.value,
  })
  showToast('长期目标已添加')
  showGoalPopup.value = false
}

async function handleDeleteGoal(id: number) {
  await deleteLongGoal(id)
  showToast('已删除')
}

// ====== 科目 ======
function getSubjectName(id: number) { return subjectMap.value.get(id)?.name || '未知' }
function getSubjectColor(id: number) { return subjectMap.value.get(id)?.color || '#999' }

// ====== 删除记录 ======
async function handleDelete(session: StudySession) {
  await deleteSession(session.id!)
  sessions.value = sessions.value.filter(s => s.id !== session.id)
  showToast('已删除')
}

// 计算长期目标剩余天数
function getRemainingDays(endDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getProgressText(startDate: string, endDate: string): string {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const now = new Date().getTime()
  if (now < start) return '未开始'
  if (now > end) return '已到期'
  const total = end - start
  const elapsed = now - start
  const pct = Math.min(100, Math.round((elapsed / total) * 100))
  return `进行中 ${pct}%`
}

function goToSessions() { router.push('/sessions') }
function goToTimer() { router.push('/timer') }
</script>

<template>
  <div class="page-content page-content--with-padding">
    <!-- 日期 -->
    <div class="home-header">
      <div class="home-date">
        <span class="home-date__day">{{ formatDateCN(todayISO()) }}</span>
        <span class="home-date__week">{{ getDayName(todayISO()) }}</span>
      </div>
      <van-icon name="brush-o" size="22" color="var(--c-primary)" class="bg-settings-icon" @click="showBgSettings = true" />
    </div>

    <!-- ====== 每日任务 ====== -->
    <div class="card-section">
      <div class="card-section__title">
        ✅ 今日任务
        <span class="task-count">{{ tasks.filter(t => t.completed).length }}/{{ tasks.length }}</span>
      </div>

      <!-- 添加新任务 -->
      <div class="task-add-row">
        <van-field
          v-model="newTaskTitle"
          placeholder="添加新任务，按回车确认"
          border
          @keyup.enter="handleAddTask"
        >
          <template #button>
            <van-button size="small" type="primary" @click="handleAddTask">添加</van-button>
          </template>
        </van-field>
      </div>

      <!-- 任务列表 -->
      <div v-if="tasks.length === 0" class="task-empty">
        今天还没有任务，添加一个吧
      </div>
      <div v-else class="task-list">
        <van-swipe-cell v-for="task in tasks" :key="task.id">
          <div
            class="task-item"
            :class="{ completed: task.completed }"
            @click="handleToggleTask(task.id!)"
          >
            <van-icon
              :name="task.completed ? 'checked' : 'circle'"
              :color="task.completed ? '#52C41A' : '#c8c9cc'"
              size="20"
            />
            <span class="task-title">{{ task.title }}</span>
          </div>
          <template #right>
            <van-button square type="danger" text="删除" @click="handleDeleteTask(task.id!)" />
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <!-- ====== 快速开始 ====== -->
    <van-button type="primary" round block size="large" @click="goToTimer">
      <van-icon name="play-circle-o" />
      开始学习
    </van-button>

    <!-- ====== 长期目标（折叠） ====== -->
    <div class="card-section mt-16">
      <div
        class="card-section__title long-goal-header"
        @click="showLongGoals = !showLongGoals"
      >
        <span>🎯 长期目标</span>
        <van-icon :name="showLongGoals ? 'arrow-up' : 'arrow-down'" color="#999" />
      </div>

      <div v-if="showLongGoals">
        <div v-if="longGoals.length === 0" class="task-empty">
          还没有长期目标
        </div>

        <div v-else class="long-goal-list">
          <van-swipe-cell v-for="goal in longGoals" :key="goal.id">
            <div class="long-goal-item">
              <div class="long-goal-top">
                <span class="long-goal-title">{{ goal.title }}</span>
                <van-tag
                  :type="getRemainingDays(goal.endDate) < 0 ? 'danger' : getRemainingDays(goal.endDate) <= 7 ? 'warning' : 'primary'"
                  size="medium"
                >
                  {{ getRemainingDays(goal.endDate) < 0 ? '已到期' : `剩余${getRemainingDays(goal.endDate)}天` }}
                </van-tag>
              </div>
              <div v-if="goal.description" class="long-goal-desc">{{ goal.description }}</div>
              <div class="long-goal-dates">
                {{ goal.startDate }} → {{ goal.endDate }}
                <span style="margin-left:8px;color:#999;font-size:12px">{{ getProgressText(goal.startDate, goal.endDate) }}</span>
              </div>
              <!-- 进度条 -->
              <van-progress
                :percentage="Math.max(0, Math.round((Date.now() - new Date(goal.startDate).getTime()) / (new Date(goal.endDate).getTime() - new Date(goal.startDate).getTime()) * 100))"
                :color="getRemainingDays(goal.endDate) < 0 ? '#F5222D' : '#4A90D9'"
                stroke-width="4"
                style="margin-top:8px"
              />
            </div>
            <template #right>
              <van-button square type="danger" text="删除" @click="handleDeleteGoal(goal.id!)" />
            </template>
          </van-swipe-cell>
        </div>

        <van-button
          type="primary"
          size="small"
          round
          block
          plain
          icon="plus"
          style="margin-top:8px"
          @click="openAddGoal"
        >
          添加长期目标
        </van-button>
      </div>
    </div>

    <!-- ====== 今日学习记录 ====== -->
    <div class="mt-16">
      <div class="flex-between mb-12">
        <span class="card-section__title" style="margin-bottom:0">📝 今日学习记录</span>
        <van-button
          v-if="sessions.length > 0"
          size="small"
          type="primary"
          plain
          @click="goToSessions"
        >
          查看全部
        </van-button>
      </div>

      <div v-if="sessions.length === 0" class="empty-state-wrapper">
        <van-empty description="今天还没有学习记录" />
      </div>

      <div v-else>
        <van-swipe-cell v-for="session in sessions" :key="session.id">
          <div
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
          <template #right>
            <van-button square type="danger" text="删除" @click="handleDelete(session)" />
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <!-- ====== 添加长期目标弹窗 ====== -->
    <van-popup v-model:show="showGoalPopup" round position="bottom">
      <div class="goal-popup">
        <h3 class="goal-popup__title">添加长期目标</h3>

        <van-field v-model="goalTitle" label="名称" placeholder="输入目标名称，如：准备期末考试" maxlength="50" />
        <van-field v-model="goalDesc" label="描述" placeholder="详细描述（可选）" type="textarea" rows="2" maxlength="200" />

        <van-field label="开始日期">
          <template #input>
            <input type="date" v-model="goalStartDate" class="date-input" />
          </template>
        </van-field>
        <van-field label="结束日期">
          <template #input>
            <input type="date" v-model="goalEndDate" class="date-input" />
          </template>
        </van-field>

        <div class="goal-popup__actions">
          <van-button type="primary" round block @click="saveLongGoal">保存目标</van-button>
          <van-button round block plain @click="showGoalPopup = false">取消</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 锁屏背景设置弹窗 -->
    <van-popup v-model:show="showBgSettings" round position="bottom">
      <div style="padding:20px 16px 30px">
        <h3 style="font-size:18px;font-weight:600;text-align:center;margin-bottom:16px">🔒 锁屏背景设置</h3>
        <van-field v-model="bgInputUrl" label="图片地址" placeholder="输入图片URL 或点击下方上传本地图片" />
        <div style="display:flex;gap:8px;margin-top:10px">
          <van-button size="small" icon="photo-o" round @click="($refs.bgFileInput as HTMLInputElement)?.click()">本地上传</van-button>
          <input ref="bgFileInput" type="file" accept="image/*" style="display:none" @change="handleBgFileUpload" />
          <van-button v-if="getBg('lockscreen')" size="small" type="danger" round plain @click="removeBg('lockscreen');showBgSettings=false;showToast('已恢复默认')">恢复默认</van-button>
        </div>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px">
          <van-button type="primary" round block @click="applyBgUrl">保存设置</van-button>
          <van-button round block plain @click="showBgSettings=false">取消</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.home-header { padding: 8px 0 16px; display: flex; justify-content: space-between; align-items: center; }
.home-date__day { font-size: 26px; font-weight: 800; color: var(--c-text); margin-right: 10px; }
.home-date__week { font-size: 14px; color: var(--c-text-muted); }
.bg-settings-icon { cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
.bg-settings-icon:hover { opacity: 1; }

/* ====== 任务 ====== */
.task-count { font-size: 13px; font-weight: 400; color: #4A90D9; margin-left: 8px; }
.task-add-row { margin-bottom: 8px; }
.task-empty { text-align: center; color: #bbb; padding: 16px 0; font-size: 13px; }
.task-list { margin-top: 8px; }
.task-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; cursor: pointer; }
.task-item.completed .task-title { text-decoration: line-through; color: #bbb; }
.task-title { font-size: 14px; color: #333; }

/* ====== 长期目标 ====== */
.long-goal-header { cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
.long-goal-list { margin-bottom: 4px; }
.long-goal-item { background: #fafbfc; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
.long-goal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.long-goal-title { font-size: 14px; font-weight: 600; color: #333; }
.long-goal-desc { font-size: 12px; color: #666; margin: 4px 0; }
.long-goal-dates { font-size: 11px; color: #999; margin-top: 4px; }

/* ====== 目标弹窗 ====== */
.goal-popup { padding: 20px 16px 30px; }
.goal-popup__title { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 16px; }
.goal-popup__actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
.date-input { border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; font-size: 14px; width: 100%; }

/* ====== 学习记录 ====== */
.session-item { background: #fff; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; border-left: 4px solid #4A90D9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.session-item__top { display: flex; justify-content: space-between; align-items: center; }
.session-item__duration { font-weight: 600; color: #333; font-size: 15px; }
.session-item__note { font-size: 12px; color: #999; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
