import { db } from '../db/database'
import type { BackupData } from '../db/schema'
import { validateBackupData } from '../utils/validation'
import { nowISO, todayISO } from '../utils/date'

export function useBackup() {
  async function exportAllData(): Promise<void> {
    // 从 localStorage 读取日记和倒计时
    let diaryEntries: any[] = []
    let countdowns: any[] = []
    try {
      diaryEntries = JSON.parse(localStorage.getItem('mystudy_diary') || '[]')
      const cd = localStorage.getItem('mystudy_countdown')
      if (cd) countdowns = [JSON.parse(cd)]
    } catch {}

    const [subjects, sessions, dailyTasks, longTermGoals, notes] = await Promise.all([
      db.subjects.toArray(),
      db.sessions.toArray(),
      db.dailyTasks.toArray(),
      db.longTermGoals.toArray(),
      db.notes.toArray(),
    ])

    const backup: BackupData = {
      version: 1,
      exportedAt: nowISO(),
      data: {
        subjects: subjects.map(({ id, ...rest }) => rest),
        sessions: sessions.map(({ id, ...rest }) => rest),
        dailyTasks: dailyTasks.map(({ id, ...rest }) => rest),
        longTermGoals: longTermGoals.map(({ id, ...rest }) => rest),
        diaryEntries: diaryEntries.map(({ id, ...rest }) => rest),
        countdowns: countdowns.map(({ id, ...rest }) => rest),
        notes: notes.map(({ id, ...rest }) => rest),
      },
    }

    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MyStudyLog_backup_${todayISO()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function importData(file: File): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const json = JSON.parse(e.target?.result as string)
          const validation = validateBackupData(json)
          if (!validation.valid || !validation.backup) {
            resolve({ success: false, message: validation.message })
            return
          }

          const { data } = validation.backup
          const now = nowISO()

          await db.transaction('rw', [db.subjects, db.sessions, db.dailyTasks, db.longTermGoals, db.notes], async () => {
            await db.subjects.clear(); await db.sessions.clear()
            await db.dailyTasks.clear(); await db.longTermGoals.clear(); await db.notes.clear()
            if (data.subjects) await db.subjects.bulkAdd(data.subjects.map((s: any) => ({ ...s, updatedAt: now })))
            if (data.sessions) await db.sessions.bulkAdd(data.sessions.map((s: any) => ({ ...s, updatedAt: now })))
            if (data.dailyTasks) await db.dailyTasks.bulkAdd(data.dailyTasks.map((t: any) => ({ ...t, updatedAt: now })))
            if (data.longTermGoals) await db.longTermGoals.bulkAdd(data.longTermGoals.map((g: any) => ({ ...g, updatedAt: now })))
            if (data.notes) await db.notes.bulkAdd(data.notes.map((n: any) => ({ ...n, updatedAt: now })))
          })

          // 日记和倒计时写回 localStorage
          try {
            if (data.diaryEntries) localStorage.setItem('mystudy_diary', JSON.stringify(data.diaryEntries.map((e: any) => ({ ...e, updatedAt: now }))))
            if (data.countdowns?.length) localStorage.setItem('mystudy_countdown', JSON.stringify({ ...data.countdowns[0], updatedAt: now }))
          } catch {}

          const tasksCount = data.dailyTasks?.length || 0
          const goalsCount = data.longTermGoals?.length || 0
          resolve({
            success: true,
            message: `导入成功：${data.subjects?.length || 0} 个科目，${data.sessions?.length || 0} 条记录，${tasksCount} 个任务，${goalsCount} 个长期目标，${data.notes?.length || 0} 条笔记`,
          })
        } catch (err) {
          resolve({ success: false, message: `导入失败：${err instanceof Error ? err.message : '未知错误'}` })
        }
      }
      reader.onerror = () => resolve({ success: false, message: '文件读取失败' })
      reader.readAsText(file)
    })
  }

  return { exportAllData, importData }
}
