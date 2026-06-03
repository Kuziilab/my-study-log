import { db } from './database'

export async function seedDefaultSubjects(): Promise<void> {
  const count = await db.subjects.count()
  if (count > 0) return

  const now = new Date().toISOString()

  await db.subjects.bulkAdd([
    {
      name: '数学',
      category: 'subject' as const,
      color: '#4A90D9',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: '英语',
      category: 'subject' as const,
      color: '#7B68EE',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: '编程',
      category: 'skill' as const,
      color: '#52C41A',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: '阅读',
      category: 'other' as const,
      color: '#FA8C16',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ])
}
