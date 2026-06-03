import type { BackupData } from '../db/schema'

export function validateBackupData(data: unknown): {
  valid: boolean
  message: string
  backup?: BackupData
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, message: '数据格式无效：不是有效的 JSON 对象' }
  }

  const d = data as Record<string, unknown>

  if (typeof d.version !== 'number' || d.version !== 1) {
    return { valid: false, message: '数据版本不支持：仅支持版本 1' }
  }

  if (typeof d.exportedAt !== 'string') {
    return { valid: false, message: '缺少导出时间' }
  }

  const inner = d.data as Record<string, unknown> | undefined
  if (!inner || typeof inner !== 'object') {
    return { valid: false, message: '缺少数据字段' }
  }

  // 基本字段检查（兼容新旧格式）
  if (inner.subjects !== undefined && !Array.isArray(inner.subjects)) {
    return { valid: false, message: '科目数据格式不正确' }
  }
  if (inner.sessions !== undefined && !Array.isArray(inner.sessions)) {
    return { valid: false, message: '学习记录数据格式不正确' }
  }

  return { valid: true, message: '数据验证通过', backup: d as unknown as BackupData }
}
