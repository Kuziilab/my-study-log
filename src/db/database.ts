import Dexie, { type Table } from 'dexie'
import type { Subject, StudySession, DailyTask, LongTermGoal, DiaryEntry, Countdown, StudyNote } from './schema'

// 主数据库
export class StudyLogDatabase extends Dexie {
  subjects!: Table<Subject, number>
  sessions!: Table<StudySession, number>
  dailyTasks!: Table<DailyTask, number>
  longTermGoals!: Table<LongTermGoal, number>
  notes!: Table<StudyNote, number>

  constructor() {
    super('MyStudyLogDB')
    this.version(1).stores({
      subjects: '++id',
      sessions: '++id, subjectId, date',
      dailyTasks: '++id, date',
      longTermGoals: '++id',
      notes: '++id',
    })
  }
}

// 日记 + 倒计时 独立数据库（完全隔离，避免迁移冲突）
export class JournalDatabase extends Dexie {
  diaryEntries!: Table<DiaryEntry, number>
  countdowns!: Table<Countdown, number>

  constructor() {
    super('MyStudyJournal')
    this.version(1).stores({
      diaryEntries: '++id, date',
      countdowns: '++id',
    })
  }
}

export const db = new StudyLogDatabase()
export const journalDb = new JournalDatabase()
