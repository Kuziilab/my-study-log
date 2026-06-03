<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import PageHeader from '../components/common/PageHeader.vue'
import { useSessionDatabase, useSubjectDatabase } from '../composables/useDatabase'
import { formatDateCN, formatDuration } from '../utils/date'
import type { StudySession, Subject } from '../db/schema'

const { sessions, loading, fetchAll, deleteSession } = useSessionDatabase()
const { subjects, fetchSubjects } = useSubjectDatabase()

const subjectMap = ref<Map<number, Subject>>(new Map())

onMounted(async () => {
  await Promise.all([fetchAll(200), fetchSubjects()])
  subjectMap.value = new Map(subjects.value.map(s => [s.id!, s]))
})

function getSubjectName(subjectId: number): string {
  return subjectMap.value.get(subjectId)?.name || '未知'
}

function getSubjectColor(subjectId: number): string {
  return subjectMap.value.get(subjectId)?.color || '#999'
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function handleDelete(session: StudySession) {
  await deleteSession(session.id!)
  sessions.value = sessions.value.filter(s => s.id !== session.id)
  showToast('已删除')
}
</script>

<template>
  <div class="page-content">
    <PageHeader title="学习记录" show-back />

    <div class="page-content--with-padding">
      <van-pull-refresh v-model="loading" @refresh="fetchAll(200)">
        <div v-if="sessions.length === 0" class="empty-state-wrapper">
          <van-empty description="还没有学习记录" />
        </div>

        <div v-else class="session-list">
          <van-swipe-cell v-for="session in sessions" :key="session.id">
            <div
              class="session-item"
              :style="{ borderLeftColor: getSubjectColor(session.subjectId) }"
            >
              <div class="session-item__top">
                <div class="session-item__info">
                  <van-tag
                    :color="getSubjectColor(session.subjectId)"
                    size="medium"
                  >
                    {{ getSubjectName(session.subjectId) }}
                  </van-tag>
                  <span class="session-item__date">
                    {{ formatDateCN(session.date) }}
                    {{ formatTime(session.startTime) }} - {{ formatTime(session.endTime) }}
                  </span>
                </div>
                <span class="session-item__duration">
                  {{ formatDuration(session.durationMinutes) }}
                </span>
              </div>
              <div v-if="session.note" class="session-item__note">
                💬 {{ session.note }}
              </div>
            </div>
            <template #right>
              <van-button
                square
                type="danger"
                text="删除"
                @click="handleDelete(session)"
              />
            </template>
          </van-swipe-cell>
        </div>
      </van-pull-refresh>
    </div>
  </div>
</template>

<style scoped>
.session-item {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border-left: 4px solid #4A90D9;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.session-item__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.session-item__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-item__date {
  font-size: 12px;
  color: #999;
}

.session-item__duration {
  font-weight: 700;
  color: #333;
  font-size: 16px;
}

.session-item__note {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}
</style>
