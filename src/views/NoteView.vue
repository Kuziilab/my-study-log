<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { useNoteDatabase } from '../composables/useDatabase'
import { formatDateCN } from '../utils/date'
import type { StudyNote } from '../db/schema'

const router = useRouter()
const { notes, fetchNotes, deleteNote } = useNoteDatabase()
const searchText = ref('')

onMounted(() => {
  fetchNotes()
})

const filteredNotes = ref<StudyNote[]>([])

import { watch } from 'vue'

watch([notes, searchText], () => {
  const q = searchText.value.toLowerCase()
  filteredNotes.value = q
    ? notes.value.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      )
    : notes.value
}, { immediate: true })

function goToNew() {
  router.push('/notes/new')
}

function goToEdit(id: number) {
  router.push(`/notes/${id}`)
}

async function handleDelete(note: StudyNote) {
  await deleteNote(note.id!)
  showToast('已删除')
}
</script>

<template>
  <div class="page-content">
    <div class="page-content--with-padding">
      <div class="home-header">
        <h3 style="font-size:20px;font-weight:700">📝 学习笔记</h3>
      </div>

      <van-search
        v-model="searchText"
        placeholder="搜索笔记"
        shape="round"
      />

      <div v-if="filteredNotes.length === 0" class="empty-state-wrapper">
        <van-empty description="还没有笔记" />
      </div>

      <van-swipe-cell v-for="note in filteredNotes" :key="note.id">
        <div class="note-card" @click="goToEdit(note.id!)">
          <div class="note-card__title text-ellipsis">{{ note.title }}</div>
          <div class="note-card__preview text-ellipsis">{{ note.content }}</div>
          <div class="note-card__date">{{ formatDateCN(note.createdAt) }}</div>
        </div>
        <template #right>
          <van-button
            square
            type="danger"
            text="删除"
            @click="handleDelete(note)"
          />
        </template>
      </van-swipe-cell>
    </div>

    <!-- 悬浮新建按钮 -->
    <van-floating-bubble
      axis="xy"
      magnetic="x"
      icon="add"
      @click="goToNew"
    />
  </div>
</template>

<style scoped>
.note-card {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.note-card__title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.note-card__preview {
  font-size: 13px;
  color: #999;
  margin-bottom: 8px;
}

.note-card__date {
  font-size: 11px;
  color: #bbb;
}
</style>
