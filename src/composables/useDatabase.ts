import { ref } from 'vue'
import { db } from '../db/database'
import type { Subject, StudySession, DailyTask, LongTermGoal, DiaryEntry, Countdown, StudyNote } from '../db/schema'
import { nowISO } from '../utils/date'

// ========== 科目 CRUD ==========

export function useSubjectDatabase() {
  const subjects = ref<Subject[]>([])
  const loading = ref(false)

  async function fetchSubjects() {
    loading.value = true
    const all = await db.subjects.toArray()
    subjects.value = all.filter(s => s.isActive)
    loading.value = false
  }

  async function addSubject(data: Omit<Subject, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = nowISO()
    const id = await db.subjects.add({
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    await fetchSubjects()
    return id as number
  }

  async function updateSubject(id: number, data: Partial<Subject>): Promise<void> {
    await db.subjects.update(id, { ...data, updatedAt: nowISO() })
    await fetchSubjects()
  }

  async function deleteSubject(id: number): Promise<void> {
    await db.subjects.update(id, { isActive: false, updatedAt: nowISO() })
    await fetchSubjects()
  }

  return { subjects, loading, fetchSubjects, addSubject, updateSubject, deleteSubject }
}

// ========== 学习记录 CRUD ==========

export function useSessionDatabase() {
  const sessions = ref<StudySession[]>([])
  const loading = ref(false)

  async function fetchByDate(date: string) {
    loading.value = true
    sessions.value = await db.sessions
      .where('date')
      .equals(date)
      .reverse()
      .toArray()
    loading.value = false
  }

  async function fetchByDateRange(start: string, end: string) {
    loading.value = true
    sessions.value = await db.sessions
      .where('date')
      .between(start, end, true, true)
      .reverse()
      .toArray()
    loading.value = false
  }

  async function fetchAll(limit = 100) {
    loading.value = true
    sessions.value = await db.sessions
      .orderBy('id')
      .reverse()
      .limit(limit)
      .toArray()
    loading.value = false
  }

  async function addSession(data: Omit<StudySession, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = nowISO()
    const id = await db.sessions.add({
      ...data,
      createdAt: now,
      updatedAt: now,
    })
    return id as number
  }

  async function deleteSession(id: number): Promise<void> {
    await db.sessions.delete(id)
  }

  return { sessions, loading, fetchByDate, fetchByDateRange, fetchAll, addSession, deleteSession }
}

// ========== 每日任务 CRUD ==========

export function useDailyTaskDatabase() {
  const tasks = ref<DailyTask[]>([])
  const loading = ref(false)

  async function fetchByDate(date: string) {
    loading.value = true
    const all = await db.dailyTasks.where('date').equals(date).toArray()
    tasks.value = all.sort((a, b) => (a.id || 0) - (b.id || 0))
    loading.value = false
  }

  async function addTask(title: string, date: string): Promise<number> {
    const now = nowISO()
    const id = await db.dailyTasks.add({
      date,
      title,
      completed: false,
      createdAt: now,
      updatedAt: now,
    })
    await fetchByDate(date)
    return id as number
  }

  async function toggleTask(id: number, date: string) {
    const task = await db.dailyTasks.get(id)
    if (task) {
      await db.dailyTasks.update(id, { completed: !task.completed, updatedAt: nowISO() })
      await fetchByDate(date)
    }
  }

  async function deleteTask(id: number, date: string) {
    await db.dailyTasks.delete(id)
    await fetchByDate(date)
  }

  return { tasks, loading, fetchByDate, addTask, toggleTask, deleteTask }
}

// ========== 长期目标 CRUD ==========

export function useLongTermGoalDatabase() {
  const goals = ref<LongTermGoal[]>([])
  const loading = ref(false)

  async function fetchGoals() {
    loading.value = true
    const all = await db.longTermGoals.toArray()
    goals.value = all.filter(g => g.isActive).sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
    loading.value = false
  }

  async function addGoal(data: {
    title: string
    description?: string
    startDate: string
    endDate: string
  }): Promise<number> {
    const now = nowISO()
    const id = await db.longTermGoals.add({
      ...data,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    await fetchGoals()
    return id as number
  }

  async function deleteGoal(id: number) {
    await db.longTermGoals.update(id, { isActive: false, updatedAt: nowISO() })
    await fetchGoals()
  }

  return { goals, loading, fetchGoals, addGoal, deleteGoal }
}

// ========== 日记 CRUD ==========

// localStorage key
const DIARY_KEY = 'mystudy_diary'
const CD_KEY = 'mystudy_countdown'

export function useDiaryDatabase() {
  const entries = ref<DiaryEntry[]>([])
  const loading = ref(false)

  function loadAll(): DiaryEntry[] {
    try {
      const raw = localStorage.getItem(DIARY_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  }

  function saveAll(list: DiaryEntry[]) {
    localStorage.setItem(DIARY_KEY, JSON.stringify(list))
  }

  async function fetchByDate(date: string) {
    loading.value = true
    entries.value = loadAll().filter(e => e.date === date)
    loading.value = false
  }

  async function getByDate(date: string): Promise<DiaryEntry | undefined> {
    return loadAll().find(e => e.date === date)
  }

  async function saveEntry(data: {
    date: string
    mood: string
    weather: string
    time: string
    content: string
    images: any[]
  }): Promise<number> {
    // 检查大图片
    let totalSize = 0
    for (const img of data.images) {
      totalSize += typeof img === 'string' ? img.length : (img?.data?.length || 0)
    }
    if (totalSize > 3 * 1024 * 1024) {
      throw new Error('图片总大小超过3MB限制')
    }

    const all = loadAll()
    const idx = all.findIndex(e => e.date === data.date)
    const now = new Date().toISOString()

    if (idx >= 0) {
      all[idx] = { ...all[idx], ...data, updatedAt: now }
    } else {
      const newId = all.length > 0 ? Math.max(...all.map(e => e.id || 0)) + 1 : 1
      all.push({ id: newId, ...data, createdAt: now, updatedAt: now } as DiaryEntry)
    }

    saveAll(all)
    await fetchByDate(data.date)
    return all.find(e => e.date === data.date)?.id || 1
  }

  async function deleteEntry(id: number, date: string) {
    const all = loadAll().filter(e => e.id !== id)
    saveAll(all)
    await fetchByDate(date)
  }

  async function getDatesWithEntries(): Promise<string[]> {
    return [...new Set(loadAll().map(e => e.date))]
  }

  return { entries, loading, fetchByDate, getByDate, saveEntry, deleteEntry, getDatesWithEntries }
}

// ========== 倒计时 CRUD ==========

export function useCountdownDatabase() {
  const countdown = ref<Countdown | null>(null)

  function load(): Countdown | null {
    try {
      const raw = localStorage.getItem(CD_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  function save(data: Countdown | null) {
    if (data) {
      localStorage.setItem(CD_KEY, JSON.stringify(data))
    } else {
      localStorage.removeItem(CD_KEY)
    }
  }

  async function fetchCountdown() {
    countdown.value = load()
  }

  async function saveCountdown(data: { name: string; targetDate: string; targetTime: string }) {
    const now = new Date().toISOString()
    const existing = load()
    const toSave: Countdown = existing
      ? { ...existing, ...data, updatedAt: now }
      : { id: 1, ...data, createdAt: now, updatedAt: now }
    save(toSave)
    await fetchCountdown()
  }

  async function deleteCountdown() {
    save(null)
    countdown.value = null
  }

  return { countdown, fetchCountdown, saveCountdown, deleteCountdown }
}

// ========== 笔记 CRUD ==========

export function useNoteDatabase() {
  const notes = ref<StudyNote[]>([])
  const loading = ref(false)

  async function fetchNotes() {
    loading.value = true
    notes.value = await db.notes.orderBy('id').reverse().toArray()
    loading.value = false
  }

  async function getNoteById(id: number): Promise<StudyNote | undefined> {
    return db.notes.get(id)
  }

  async function addNote(data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = nowISO()
    const id = await db.notes.add({ ...data, createdAt: now, updatedAt: now })
    await fetchNotes()
    return id as number
  }

  async function updateNote(id: number, data: Partial<StudyNote>): Promise<void> {
    await db.notes.update(id, { ...data, updatedAt: nowISO() })
    await fetchNotes()
  }

  async function deleteNote(id: number): Promise<void> {
    await db.notes.delete(id)
    await fetchNotes()
  }

  return { notes, loading, fetchNotes, getNoteById, addNote, updateNote, deleteNote }
}
