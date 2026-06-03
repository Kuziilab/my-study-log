import { db } from '../db/database'
import type { Subject } from '../db/schema'

export interface SubjectStat {
  subjectId: number
  subjectName: string
  color: string
  totalMinutes: number
}

export interface DailyStat {
  date: string
  totalMinutes: number
}

// ========== 统计聚合 ==========

export function useStats() {
  // 获取某一天按科目分组的统计
  async function getStatsByDate(date: string): Promise<SubjectStat[]> {
    const sessions = await db.sessions.where('date').equals(date).toArray()
    return aggregateBySubject(sessions)
  }

  // 获取日期范围内的按科目分组统计
  async function getStatsByDateRange(start: string, end: string): Promise<SubjectStat[]> {
    const sessions = await db.sessions
      .where('date')
      .between(start, end, true, true)
      .toArray()
    return aggregateBySubject(sessions)
  }

  // 获取日期范围内每天的统计
  async function getDailyStatsInRange(start: string, end: string): Promise<DailyStat[]> {
    const sessions = await db.sessions
      .where('date')
      .between(start, end, true, true)
      .toArray()

    const dailyMap = new Map<string, number>()
    for (const s of sessions) {
      dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + s.durationMinutes)
    }

    // 填充范围内的每一天
    const result: DailyStat[] = []
    const startDate = new Date(start)
    const endDate = new Date(end)
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10)
      result.push({
        date: dateStr,
        totalMinutes: dailyMap.get(dateStr) || 0,
      })
    }
    return result
  }

  // 聚合：按科目分组求和
  async function aggregateBySubject(sessions: { subjectId: number; durationMinutes: number }[]): Promise<SubjectStat[]> {
    const subjectMap = new Map<number, number>()
    for (const s of sessions) {
      subjectMap.set(s.subjectId, (subjectMap.get(s.subjectId) || 0) + s.durationMinutes)
    }

    // 获取科目信息
    const subjectIds = Array.from(subjectMap.keys())
    const subjects = await db.subjects.bulkGet(subjectIds)
    const subjectLookup = new Map<number, Subject>()
    for (const s of subjects) {
      if (s) subjectLookup.set(s.id!, s)
    }

    return Array.from(subjectMap.entries())
      .map(([subjectId, totalMinutes]) => {
        const subject = subjectLookup.get(subjectId)
        return {
          subjectId,
          subjectName: subject?.name || '未知科目',
          color: subject?.color || '#999',
          totalMinutes,
        }
      })
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
  }

  return { getStatsByDate, getStatsByDateRange, getDailyStatsInRange, aggregateBySubject }
}

// ========== 图表配置构建 ==========

// 构建柱状图配置 (echarts)
export function buildBarChartOption(
  stats: SubjectStat[],
  title?: string
) {
  if (stats.length === 0) return null

  return {
    title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
    tooltip: {
      trigger: 'axis' as const,
      valueFormatter: (value: number) => `${value} 分钟`,
    },
    grid: {
      left: 10,
      right: 10,
      top: title ? 40 : 10,
      bottom: 30,
    },
    xAxis: {
      type: 'category' as const,
      data: stats.map((s) => s.subjectName),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value' as const,
      name: '分钟',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar' as const,
        data: stats.map((s) => ({
          value: s.totalMinutes,
          itemStyle: { color: s.color },
        })),
        barMaxWidth: 40,
      },
    ],
  }
}

// 构建饼图配置 (echarts)
export function buildPieChartOption(stats: SubjectStat[]) {
  if (stats.length === 0) return null

  return {
    tooltip: {
      trigger: 'item' as const,
      valueFormatter: (value: number) => `${value} 分钟`,
    },
    legend: {
      orient: 'horizontal' as const,
      bottom: 0,
      textStyle: { fontSize: 11 },
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        data: stats.map((s) => ({
          name: s.subjectName,
          value: s.totalMinutes,
          itemStyle: { color: s.color },
        })),
        label: {
          formatter: '{b}\n{d}%',
          fontSize: 11,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  }
}

// 构建每日趋势图
export function buildDailyTrendOption(dailyStats: DailyStat[]) {
  if (dailyStats.length === 0) return null

  return {
    tooltip: {
      trigger: 'axis' as const,
      valueFormatter: (value: number) => `${value} 分钟`,
    },
    grid: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 30,
    },
    xAxis: {
      type: 'category' as const,
      data: dailyStats.map((s) => s.date.slice(5)), // MM-DD
      axisLabel: { fontSize: 10, rotate: 30 },
    },
    yAxis: {
      type: 'value' as const,
      name: '分钟',
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: 'bar' as const,
        data: dailyStats.map((s) => ({
          value: s.totalMinutes,
          itemStyle: { color: '#4A90D9' },
        })),
        barMaxWidth: 20,
      },
    ],
  }
}
