// 预定义科目颜色调色板
export const SUBJECT_COLORS = [
  '#4A90D9', // 蓝
  '#7B68EE', // 紫蓝
  '#52C41A', // 绿
  '#FA8C16', // 橙
  '#F5222D', // 红
  '#13C2C2', // 青
  '#EB2F96', // 粉
  '#2F54EB', // 深蓝
  '#FAAD14', // 金
  '#A0D911', // 黄绿
  '#722ED1', // 紫
  '#FA541C', // 橘红
]

// 将 hex 颜色转为 rgba
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// 获取类别标签颜色
export function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    subject: '#4A90D9',
    skill: '#52C41A',
    other: '#FA8C16',
  }
  return map[category] || '#999'
}

// 获取类别中文名
export function getCategoryName(category: string): string {
  const map: Record<string, string> = {
    subject: '学科',
    skill: '技能',
    other: '其他',
  }
  return map[category] || category
}
