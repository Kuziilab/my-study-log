import dayjs from 'dayjs'

// 格式化日期为 YYYY-MM-DD
export function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD')
}

// 获取今天的日期字符串
export function todayISO(): string {
  return dayjs().format('YYYY-MM-DD')
}

// 获取当前 ISO 时间戳
export function nowISO(): string {
  return new Date().toISOString()
}

// 获取本周范围 (周一到周日)
export function getWeekRange(date?: string): { start: string; end: string } {
  const d = date ? dayjs(date) : dayjs()
  const start = d.startOf('week').add(1, 'day') // 周一
  const end = d.endOf('week').add(1, 'day') // 周日
  return {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD'),
  }
}

// 获取本月范围
export function getMonthRange(date?: string): { start: string; end: string } {
  const d = date ? dayjs(date) : dayjs()
  return {
    start: d.startOf('month').format('YYYY-MM-DD'),
    end: d.endOf('month').format('YYYY-MM-DD'),
  }
}

// 格式化时长 (分钟 -> X小时Y分钟)
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

// 格式化秒数为 MM:SS
export function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// 获取星期几的中文名称
export function getDayName(date: string): string {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[dayjs(date).day()]
}

// 格式化日期为中文显示
export function formatDateCN(date: string): string {
  return dayjs(date).format('M月D日')
}
