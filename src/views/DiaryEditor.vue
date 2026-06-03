<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast, showDialog } from 'vant'
import { useDiaryDatabase } from '../composables/useDatabase'
import { todayISO } from '../utils/date'

const router = useRouter()
const route = useRoute()
const { getByDate, saveEntry, deleteEntry, getDatesWithEntries } = useDiaryDatabase()

const currentDate = ref(route.params.date as string || todayISO())
const mood = ref('😊')
const weather = ref('☀️')
const time = ref('')
const content = ref('')
const diaryDates = ref<string[]>([])

const MOODS = ['😊','😄','😐','😢','😡','🥰','😴','🤩','😭','😎','🤔','😤']
const WEATHERS = ['☀️','⛅','☁️','🌧️','⛈️','🌨️','🌈','🌪️','❄️','🌤️','🌙','⭐']

const showMoodPicker = ref(false)
const showWeatherPicker = ref(false)
const showDatePicker = ref(false)
const jumpDate = ref('')
const editorRef = ref<HTMLDivElement>()

function openDatePicker() { jumpDate.value = currentDate.value; showDatePicker.value = true }
function jumpToDate() { if (jumpDate.value) { currentDate.value = jumpDate.value; loadEntry() } showDatePicker.value = false }

async function loadEntry() {
  try {
    const entry = await getByDate(currentDate.value)
    if (entry) {
      mood.value = entry.mood || '😊'
      weather.value = entry.weather || '☀️'
      time.value = entry.time || ''
      content.value = entry.content || ''
    } else {
      const now = new Date()
      time.value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      mood.value = '😊'; weather.value = '☀️'; content.value = ''
    }
    showMoodPicker.value = false; showWeatherPicker.value = false
    // 恢复编辑器内容
    await nextTick()
    if (editorRef.value) editorRef.value.innerHTML = content.value
  } catch (e) { console.error('加载失败:', e) }
}

onMounted(async () => {
  await loadEntry()
  try { diaryDates.value = await getDatesWithEntries() } catch {}
})

// 监听编辑器变化，同步到 content
function onEditorInput() {
  if (editorRef.value) content.value = editorRef.value.innerHTML
}

function goToPrevDay() { const d = new Date(currentDate.value); d.setDate(d.getDate()-1); currentDate.value = d.toISOString().slice(0,10); loadEntry() }
function goToNextDay() { const d = new Date(currentDate.value); d.setDate(d.getDate()+1); currentDate.value = d.toISOString().slice(0,10); loadEntry() }

// ====== 插入图片 ======
function insertImage() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*'; input.multiple = true
  input.onchange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files; if (!files) return
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        if (!base64 || !editorRef.value) return
        editorRef.value.focus()
        // 插入可拖拽的图片元素
        const wrapper = document.createElement('span')
        wrapper.className = 'inline-img-wrapper'
        wrapper.contentEditable = 'false'
        wrapper.innerHTML = `
          <span class="inline-img-bar">
            <span class="inline-img-btn" data-action="remove">✕ 删除</span>
          </span>
          <img src="${base64}" class="inline-img" style="max-width:100%;max-height:300px;border-radius:6px" />
        `
        wrapper.addEventListener('click', (ev: Event) => {
          const target = ev.target as HTMLElement
          if (target.getAttribute('data-action') === 'remove') {
            wrapper.remove()
            onEditorInput()
          } else {
            wrapper.classList.toggle('selected')
          }
        })
        // 插入到光标位置
        const sel = window.getSelection()
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)
          range.insertNode(wrapper)
          range.collapse(false)
        } else {
          editorRef.value.appendChild(wrapper)
        }
        // 在图片后加一个换行和空文本节点
        const br = document.createElement('br')
        wrapper.after(br)
        onEditorInput()
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

// ====== 保存 ======
async function handleSave() {
  const html = editorRef.value?.innerHTML || ''
  const text = editorRef.value?.innerText || ''
  if (!text.trim() && !html.includes('<img')) { showToast('请输入内容'); return }
  try {
    await saveEntry({ date: currentDate.value, mood: mood.value, weather: weather.value, time: time.value, content: html, images: [] as any })
    showToast('已保存')
    try { diaryDates.value = await getDatesWithEntries() } catch {}
  } catch (e: any) {
    showDialog({ title: '保存失败', message: String(e?.message || e), confirmButtonText: '知道了' })
  }
}

async function handleDelete() {
  showDialog({ title: '删除日记', message: '确定删除？' }).then(async () => {
    const e = await getByDate(currentDate.value)
    if (e) { await deleteEntry(e.id!, currentDate.value); showToast('已删除'); router.back() }
  }).catch(() => {})
}

function goBack() { router.back() }

const displayDate = computed(() => {
  const d = new Date(currentDate.value)
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 星期${['日','一','二','三','四','五','六'][d.getDay()]}`
})
const hasEntry = computed(() => diaryDates.value.includes(currentDate.value))
</script>

<template>
  <div class="de">
    <van-nav-bar :title="displayDate" left-text="返回" right-text="保存" fixed placeholder @click-left="goBack" @click-right="handleSave" />
    <div class="de-body">
      <div class="de-nav">
        <van-icon name="arrow-left" size="20" color="#4A90D9" @click="goToPrevDay" />
        <span class="de-nav-date" @click="openDatePicker">{{ displayDate }} <van-icon name="arrow-down" size="10" color="#999" /></span>
        <van-icon name="arrow" size="20" color="#4A90D9" @click="goToNextDay" />
      </div>

      <div class="de-meta">
        <div class="de-chip" @click="showMoodPicker=!showMoodPicker;showWeatherPicker=false">
          <span class="de-emoji">{{ mood }}</span><span class="de-label">心情</span><van-icon name="arrow-down" size="8" color="#bbb" />
        </div>
        <div class="de-chip" @click="showWeatherPicker=!showWeatherPicker;showMoodPicker=false">
          <span class="de-emoji">{{ weather }}</span><span class="de-label">天气</span><van-icon name="arrow-down" size="8" color="#bbb" />
        </div>
        <input type="time" v-model="time" class="de-time" />
        <van-icon name="photo-o" size="18" color="#4A90D9" style="cursor:pointer;margin-left:auto" @click="insertImage" />
      </div>

      <div v-if="showMoodPicker" class="de-expand"><span v-for="m in MOODS" :key="m" class="de-emo-btn" :class="{on:m===mood}" @click="mood=m;showMoodPicker=false">{{ m }}</span></div>
      <div v-if="showWeatherPicker" class="de-expand"><span v-for="w in WEATHERS" :key="w" class="de-emo-btn" :class="{on:w===weather}" @click="weather=w;showWeatherPicker=false">{{ w }}</span></div>

      <!-- 内容编辑区 Word 风格 -->
      <div class="de-text">
        <div class="de-toolbar">
          <span class="tb-btn" @click="insertImage">🖼️ 插入图片</span>
          <span class="tb-hint">点击✕删除图片</span>
        </div>
        <div
          ref="editorRef"
          class="de-editor"
          contenteditable="true"
          placeholder="今天发生了什么..."
          @input="onEditorInput"
        ></div>
      </div>
    </div>

    <div class="de-foot">
      <van-button type="primary" round block @click="handleSave">保存日记</van-button>
      <van-button v-if="hasEntry" type="danger" size="small" round plain icon="delete-o" @click="handleDelete">删除此篇</van-button>
    </div>

    <van-popup v-model:show="showDatePicker" round position="bottom">
      <div style="padding:20px 16px 30px">
        <h3 style="text-align:center;margin-bottom:12px">跳转到日期</h3>
        <div style="padding:12px 0"><input type="date" v-model="jumpDate" style="border:1px solid #ddd;border-radius:6px;padding:8px 12px;font-size:16px;width:100%;text-align:center" /></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <van-button type="primary" round block @click="jumpToDate">跳转</van-button>
          <van-button round block plain @click="showDatePicker=false">取消</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style>
/* 全局样式 — 编辑器内图片 */
.inline-img-wrapper {
  display: inline-block;
  vertical-align: middle;
  margin: 4px;
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  transition: border-color 0.15s;
  user-select: none;
}
.inline-img-wrapper.selected,
.inline-img-wrapper:hover {
  border-color: #4A90D9;
}
.inline-img-bar {
  position: absolute;
  top: 2px;
  left: 2px;
  z-index: 10;
  display: none;
  gap: 4px;
}
.inline-img-wrapper:hover .inline-img-bar {
  display: flex;
}
.inline-img-btn {
  font-size: 12px;
  background: rgba(0,0,0,0.65);
  color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}
.inline-img {
  max-width: 100%;
  max-height: 300px;
  border-radius: 6px;
  display: block;
}
</style>

<style scoped>
.de { min-height:100vh; background:#f7f8fa; }
.de-body { padding:8px 14px 100px; }
.de-nav { display:flex; align-items:center; justify-content:space-between; padding:6px 0 10px; }
.de-nav-date { font-size:14px; font-weight:600; color:#333; display:flex; align-items:center; gap:4px; cursor:pointer; }
.de-meta { display:flex; align-items:center; gap:8px; padding:8px 0; border-bottom:1px solid #eee; margin-bottom:4px; }
.de-chip { display:flex; align-items:center; gap:3px; background:#fff; border:1px solid #e5e5e5; border-radius:8px; padding:4px 10px; cursor:pointer; }
.de-emoji { font-size:20px; }
.de-label { font-size:11px; color:#999; }
.de-time { border:1px solid #e5e5e5; border-radius:8px; padding:4px 8px; font-size:13px; background:#fff; width:96px; }
.de-expand { background:#fff; border-radius:10px; padding:10px; display:flex; flex-wrap:wrap; gap:4px; margin-bottom:4px; }
.de-emo-btn { font-size:26px; padding:6px; border-radius:8px; cursor:pointer; border:2px solid transparent; }
.de-emo-btn.on { border-color:#4A90D9; background:rgba(74,144,217,0.08); }

/* 工具栏 */
.de-toolbar { display:flex; align-items:center; gap:8px; padding:8px 12px; background:#f9fafb; border-bottom:1px solid #eee; flex-wrap:wrap; }
.tb-btn { font-size:13px; color:#4A90D9; cursor:pointer; padding:4px 10px; background:#fff; border:1px solid #4A90D9; border-radius:6px; white-space:nowrap; }
.tb-hint { font-size:11px; color:#bbb; }

/* 编辑器 */
.de-text { background:#fff; border-radius:10px; overflow:hidden; margin-top:6px; min-height:350px; display:flex; flex-direction:column; }
.de-editor {
  flex:1; min-height:320px; padding:14px; outline:none;
  font-size:15px; line-height:1.8; color:#333;
  font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;
  overflow-y:auto; word-break:break-word;
}
.de-editor:empty::before {
  content: '今天发生了什么...'; color: #ccc;
}

.de-foot { position:fixed; bottom:0; left:0; right:0; padding:10px 16px; background:#fff; box-shadow:0 -2px 8px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:6px; }
</style>
