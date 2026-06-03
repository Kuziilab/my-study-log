// 数据库 schema 类型定义

export type SubjectCategory = 'subject' | 'skill' | 'other'

export interface Subject {
  id?: number
  name: string
  category: SubjectCategory
  color: string
  icon?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StudySession {
  id?: number
  subjectId: number
  date: string // YYYY-MM-DD
  startTime: string
  endTime: string
  durationMinutes: number
  note?: string
  createdAt: string
  updatedAt: string
}

// ====== 每日任务 ======
export interface DailyTask {
  id?: number
  date: string // YYYY-MM-DD
  title: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

// ====== 长期目标 ======
export interface LongTermGoal {
  id?: number
  title: string
  description?: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ====== 日记 ======
export interface DiaryEntry {
  id?: number
  date: string // YYYY-MM-DD
  mood: string // 心情 emoji
  weather: string // 天气 emoji
  time: string // HH:mm
  content: string // 日记内容（纯文本）
  images: any[] // 图片数组 [{data: base64, position: 'block'|'background'}]
  createdAt: string
  updatedAt: string
}

// ====== 倒计时 ======
export interface Countdown {
  id?: number
  name: string
  targetDate: string // YYYY-MM-DD
  targetTime: string // HH:mm
  createdAt: string
  updatedAt: string
}

// ====== 笔记 ======
export interface StudyNote {
  id?: number
  sessionId?: number
  subjectId?: number
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

// ====== 备份数据结构 ======
export interface BackupData {
  version: number
  exportedAt: string
  data: {
    subjects: Subject[]
    sessions: StudySession[]
    dailyTasks: DailyTask[]
    longTermGoals: LongTermGoal[]
    diaryEntries: DiaryEntry[]
    countdowns: Countdown[]
    notes: StudyNote[]
  }
}
