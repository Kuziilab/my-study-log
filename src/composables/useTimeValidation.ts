export function useTimeValidation() {
  // 检查当前时间是否在允许范围内 (6:00 - 24:00)
  function isWithinAllowedWindow(): { valid: boolean; message: string } {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()

    if (hours < 6) {
      return {
        valid: false,
        message: `当前时间 ${hours}:${String(minutes).padStart(2, '0')}，学习时间从早上 6:00 开始`,
      }
    }

    return { valid: true, message: '' }
  }

  // 检查是否接近 24:00（需要在 24:00 前自动停止）
  function isNearMidnight(): boolean {
    const now = new Date()
    return now.getHours() === 23 && now.getMinutes() >= 59
  }

  return { isWithinAllowedWindow, isNearMidnight }
}
