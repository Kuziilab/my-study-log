<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { showDialog, showToast } from 'vant'
import { useBackground } from '../composables/useBackground'
import { useTimer } from '../composables/useTimer'
import { useTimeValidation } from '../composables/useTimeValidation'
import { useSessionDatabase, useSubjectDatabase } from '../composables/useDatabase'
import { todayISO } from '../utils/date'
import type { Subject, SubjectCategory } from '../db/schema'

const timer = useTimer()
const { getBg } = useBackground()
const { isWithinAllowedWindow } = useTimeValidation()
const { addSession } = useSessionDatabase()
const { subjects, fetchSubjects, addSubject, deleteSubject } = useSubjectDatabase()

const note = ref('')
const showSavePopup = ref(false)

const showSubjectPicker = ref(false)
const showAddForm = ref(false)
const newName = ref('')
const newCategory = ref<SubjectCategory>('subject')
const newColor = ref('#4A90D9')

// ====== 专注模式 ======
const focusMode = ref(false)
const showFocusOverlay = ref(false)
const focusExitCount = ref(0)
const focusExitTarget = 3

const PRESET_COLORS = [
  '#4A90D9', '#7B68EE', '#52C41A', '#FA8C16',
  '#F5222D', '#13C2C2', '#EB2F96', '#2F54EB',
  '#FAAD14', '#A0D911', '#722ED1', '#FA541C',
]

onMounted(() => { fetchSubjects() })

// 计时状态变化时，如果开启了专注模式且正在运行，显示遮罩
watch(() => timer.status.value, (status) => {
  if (focusMode.value && status === 'running') {
    showFocusOverlay.value = true
    focusExitCount.value = 0
  }
  if (status === 'idle' || status === 'paused') {
    showFocusOverlay.value = false
    focusExitCount.value = 0
  }
})

function openSubjectPicker() { fetchSubjects(); showSubjectPicker.value = true }
function selectSubject(sub: Subject) { timer.setSubject(sub); showSubjectPicker.value = false }
async function handleDeleteSubject(sub: Subject) {
  await deleteSubject(sub.id!); showToast('已删除「' + sub.name + '」')
  if (timer.selectedSubject.value?.id === sub.id) timer.selectedSubject.value = null
}
function openAddForm() {
  showSubjectPicker.value = false; newName.value = ''; newCategory.value = 'subject'; newColor.value = '#4A90D9'; showAddForm.value = true
}
async function confirmAdd() {
  const name = newName.value.trim()
  if (!name) { showToast('请输入科目名称'); return }
  if (subjects.value.some(s => s.name === name)) { showToast('该科目名称已存在'); return }
  try {
    const id = await addSubject({ name, category: newCategory.value, color: newColor.value })
    const found = subjects.value.find(s => s.id === id)
    if (found) timer.setSubject(found)
    showToast('已添加「' + name + '」'); showAddForm.value = false
  } catch (e) { showToast('添加失败') }
}

function handleStart() {
  const check = isWithinAllowedWindow()
  if (!check.valid) { showDialog({ title: '提示', message: check.message }); return }
  if (!timer.selectedSubject.value) { showDialog({ title: '提示', message: '请先选择科目' }); return }
  timer.start()
}
function handleStop() { showSavePopup.value = true }
async function handleSave() {
  const result = timer.stop()
  if (!result.subject || result.elapsedMinutes < 1) { showSavePopup.value = false; note.value = ''; showToast('记录时间太短，未保存'); return }
  try {
    await addSession({ subjectId: result.subject.id!, date: todayISO(), startTime: result.startTime, endTime: result.endTime, durationMinutes: result.elapsedMinutes, note: note.value || undefined })
    showToast('记录已保存')
  } catch (e) { showToast('保存失败') }
  showSavePopup.value = false; note.value = ''
  showFocusOverlay.value = false; focusExitCount.value = 0
}
function handleCancelSave() { timer.reset(); showSavePopup.value = false; note.value = ''; showFocusOverlay.value = false }

// ====== 专注模式退出 ======
function handleFocusExitTap() {
  focusExitCount.value++
  if (focusExitCount.value >= focusExitTarget) {
    timer.pause()
    showFocusOverlay.value = false
    focusExitCount.value = 0
    showToast('已退出专注模式')
  }
}
function getFocusExitHint(): string {
  const remain = focusExitTarget - focusExitCount.value
  if (remain <= 0) return '已退出'
  return `再点 ${remain} 次退出专注学习`
}
</script>

<template>
  <div class="page-content timer-page">
    <div class="timer-container">
      <!-- 科目选择 -->
      <div class="subject-select-section">
        <van-cell :title="timer.selectedSubject.value?.name || '选择科目'" is-link @click="openSubjectPicker">
          <template #icon><div v-if="timer.selectedSubject.value" class="dot" :style="{ backgroundColor: timer.selectedSubject.value.color }" /></template>
        </van-cell>
      </div>

      <!-- 专注模式开关 -->
      <div class="focus-toggle" v-if="timer.status.value === 'idle'">
        <div class="focus-toggle-row" @click="focusMode = !focusMode">
          <span class="focus-label">🧘 专注学习模式</span>
          <van-switch :model-value="focusMode" size="22px" active-color="#6366f1" />
        </div>
        <div class="focus-hint" v-if="focusMode">开启后计时期间锁定屏幕，需连点3次按钮才能退出</div>
      </div>

      <!-- 计时器显示 -->
      <div class="timer-display">
        {{ timer.displayTimeFull.value }}
      </div>

      <!-- 状态标签 -->
      <van-tag v-if="timer.status.value === 'running'" type="primary" round size="large">{{ timer.selectedSubject.value?.name || '' }}</van-tag>
      <van-tag v-else-if="timer.status.value === 'paused'" type="warning" round size="large">已暂停</van-tag>

      <!-- 控制按钮 -->
      <div class="timer-controls">
        <template v-if="timer.status.value === 'idle'">
          <van-button type="primary" size="large" round block @click="handleStart">
            <van-icon name="play-circle-o" /> 开始计时
          </van-button>
        </template>
        <template v-else>
          <div class="timer-btn-group">
            <van-button v-if="timer.status.value === 'running'" icon="pause-circle-o" round type="warning" size="large" @click="timer.pause()">暂停</van-button>
            <van-button v-if="timer.status.value === 'paused'" icon="play-circle-o" round type="primary" size="large" @click="timer.resume()">继续</van-button>
            <van-button icon="stop-circle-o" round type="danger" size="large" @click="handleStop">停止</van-button>
          </div>
        </template>
      </div>
    </div>

    <!-- 科目选择弹窗 -->
    <van-popup v-model:show="showSubjectPicker" round position="bottom">
      <div class="popup"><h3 class="popup-title">选择科目</h3>
        <div v-if="subjects.length===0" class="empty-hint">还没有科目</div>
        <div v-else class="subject-list">
          <van-swipe-cell v-for="s in subjects" :key="s.id">
            <van-cell :title="s.name" @click="selectSubject(s)">
              <template #icon><div class="dot" :style="{backgroundColor:s.color}"/></template>
              <template #right-icon><van-icon v-if="timer.selectedSubject.value?.id===s.id" name="success" color="#6366f1"/></template>
            </van-cell>
            <template #right><van-button square type="danger" text="删除" @click="handleDeleteSubject(s)"/></template>
          </van-swipe-cell>
        </div>
        <div class="popup-actions">
          <van-button icon="plus" type="primary" round block plain @click="openAddForm">自定义添加科目</van-button>
          <van-button type="default" round block style="margin-top:8px" @click="showSubjectPicker=false">取消</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 添加科目弹窗 -->
    <van-popup v-model:show="showAddForm" round position="bottom">
      <div class="popup"><h3 class="popup-title">添加新科目</h3>
        <van-field v-model="newName" label="名称" placeholder="输入科目名称" maxlength="20" clearable/>
        <div class="form-section"><span class="form-label">类别</span>
          <van-radio-group v-model="newCategory" direction="horizontal"><van-radio name="subject">学科</van-radio><van-radio name="skill">技能</van-radio><van-radio name="other">其他</van-radio></van-radio-group>
        </div>
        <div class="form-section"><span class="form-label">颜色</span>
          <div class="color-grid"><div v-for="c in PRESET_COLORS" :key="c" class="color-item" :class="{active:c===newColor}" :style="{backgroundColor:c}" @click="newColor=c"><van-icon v-if="c===newColor" name="success" color="#fff" size="14"/></div></div>
        </div>
        <div class="popup-actions"><van-button type="primary" round block @click="confirmAdd">添加并选中</van-button><van-button type="default" round block @click="showAddForm=false">取消</van-button></div>
      </div>
    </van-popup>

    <!-- 保存弹窗 -->
    <van-popup v-model:show="showSavePopup" position="bottom" round @click-overlay="handleCancelSave">
      <div class="popup"><h3 class="popup-title">保存记录</h3>
        <div class="save-info"><div><span class="label">科目</span><span>{{ timer.selectedSubject.value?.name }}</span></div><div><span class="label">时长</span><span class="duration">{{ timer.elapsedMinutes.value }}分钟</span></div></div>
        <van-field v-model="note" label="备注" placeholder="添加备注（可选）" type="textarea" rows="3" maxlength="500"/>
        <div class="popup-actions"><van-button round block type="primary" @click="handleSave">保存</van-button><van-button round block plain type="default" @click="handleCancelSave">丢弃</van-button></div>
      </div>
    </van-popup>

    <!-- ====== 专注模式全屏遮罩 ====== -->
    <div v-if="showFocusOverlay" class="focus-overlay" :style="getBg('lockscreen') ? { backgroundImage: `url(${getBg('lockscreen')})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}">
      <div class="focus-content">
        <div class="focus-icon" v-if="!getBg('lockscreen')">🌸</div>
        <div class="focus-title">专注学习中</div>
        <div class="focus-subject">{{ timer.selectedSubject.value?.name }}</div>
        <div class="focus-time">{{ timer.displayTimeFull.value }}</div>
        <div class="focus-hint-text">手机屏幕已锁定，请专心学习</div>
        <van-button
          type="danger"
          size="large"
          round
          class="focus-exit-btn"
          @click="handleFocusExitTap"
        >
          {{ getFocusExitHint() }}
        </van-button>
        <div class="focus-dots">
          <span v-for="i in focusExitTarget" :key="i" class="focus-dot" :class="{ filled: i <= focusExitCount }"></span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timer-page { background: linear-gradient(180deg, #FFF0F3 0%, #FFF5F6 50%); }
.subject-select-section { width: 100%; background: #fff; border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
.timer-display {
  width: 100%; text-align: center;
  font-size: 60px; font-weight: 800; font-variant-numeric: tabular-nums;
  color: var(--c-text); margin: 48px 0 28px; letter-spacing: 4px;
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
}
.timer-btn-group { display: flex; gap: 20px; }
.dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 10px; align-self: center; flex-shrink: 0; }
.popup { padding: 12px 0 24px; max-height: 80vh; overflow-y: auto; }
.popup-title { font-size: 16px; font-weight: 600; text-align: center; padding: 12px 0 8px; }
.empty-hint { padding: 30px; text-align: center; color: #999; }
.subject-list { max-height: 40vh; overflow-y: auto; }
.popup-actions { padding: 16px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid #f0f0f0; margin-top: 8px; }
.form-section { padding: 12px 16px; }
.form-label { font-size: 14px; color: #646566; display: block; margin-bottom: 8px; }
.color-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.color-item { width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; border: 3px solid transparent; transition: border-color 0.2s; }
.color-item.active { border-color: #333; }
.save-info { background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin: 0 16px 16px; }
.save-info>div { display: flex; justify-content: space-between; padding: 6px 0; }
.label { color: #999; }
.duration { font-weight: 600; color: var(--c-primary); }

/* ====== 专注模式开关 ====== */
.focus-toggle { padding: 0 4px 12px; }
.focus-toggle-row { display: flex; align-items: center; justify-content: space-between; background: rgba(99,102,241,0.06); border-radius: 10px; padding: 10px 14px; cursor: pointer; }
.focus-label { font-size: 14px; font-weight: 600; color: var(--c-text); }
.focus-hint { font-size: 11px; color: var(--c-text-muted); margin-top: 6px; padding-left: 4px; }

/* ====== 专注遮罩 ====== */
.focus-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0f172a; z-index: 9999; display: flex; align-items: center; justify-content: center; }
.focus-content { text-align: center; color: #fff; padding: 40px; }
.focus-icon { font-size: 64px; margin-bottom: 16px; }
.focus-title { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
.focus-subject { font-size: 16px; color: #a5b4fc; margin-bottom: 24px; }
.focus-time { font-size: 64px; font-weight: 800; font-family: 'SF Mono','Menlo',monospace; letter-spacing: 4px; margin-bottom: 32px; color: #e0e7ff; }
.focus-hint-text { font-size: 13px; color: #64748b; margin-bottom: 28px; }
.focus-exit-btn { opacity: 0.85; }
.focus-dots { display: flex; justify-content: center; gap: 8px; margin-top: 16px; }
.focus-dot { width: 10px; height: 10px; border-radius: 50%; background: #334155; transition: background 0.2s; }
.focus-dot.filled { background: #ef4444; }
</style>
