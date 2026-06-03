<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { showDialog, showToast } from 'vant'
import PageHeader from '../components/common/PageHeader.vue'
import SubjectForm from '../components/subject/SubjectForm.vue'
import { useSubjectDatabase } from '../composables/useDatabase'
import { getCategoryName } from '../utils/color'
import type { Subject, SubjectCategory } from '../db/schema'

const { subjects, fetchSubjects, addSubject, updateSubject, deleteSubject } = useSubjectDatabase()

const showForm = ref(false)
const editingSubject = ref<Subject | null>(null)

onMounted(() => {
  fetchSubjects()
})

function handleAdd() {
  editingSubject.value = null
  showForm.value = true
}

function handleEdit(subject: Subject) {
  editingSubject.value = { ...subject }
  showForm.value = true
}

function handleDelete(subject: Subject) {
  showDialog({
    title: '删除科目',
    message: `确定删除「${subject.name}」吗？相关的学习记录不会被删除。`,
  }).then(() => {
    deleteSubject(subject.id!)
    showToast('已删除')
  }).catch(() => {})
}

async function handleSave(data: { name: string; category: SubjectCategory; color: string }) {
  if (editingSubject.value) {
    await updateSubject(editingSubject.value.id!, data)
    showToast('已更新')
  } else {
    await addSubject(data)
    showToast('已添加')
  }
  showForm.value = false
}
</script>

<template>
  <div class="page-content">
    <PageHeader title="科目管理" show-back />

    <div class="page-content--with-padding">
      <van-cell-group inset>
        <van-swipe-cell v-for="subject in subjects" :key="subject.id">
          <van-cell
            :title="subject.name"
            :label="getCategoryName(subject.category)"
            is-link
            @click="handleEdit(subject)"
          >
            <template #icon>
              <div
                class="color-dot"
                :style="{ backgroundColor: subject.color }"
              />
            </template>
          </van-cell>
          <template #right>
            <van-button
              square
              type="danger"
              text="删除"
              @click="handleDelete(subject)"
            />
          </template>
        </van-swipe-cell>
      </van-cell-group>

      <div v-if="subjects.length === 0" class="empty-state-wrapper">
        <van-empty description="还没有科目，点击下方按钮添加" />
      </div>

      <div class="mt-16 flex-center">
        <van-button type="primary" round block @click="handleAdd">
          添加科目
        </van-button>
      </div>
    </div>

    <SubjectForm
      v-model:show="showForm"
      :subject="editingSubject"
      @save="handleSave"
    />
  </div>
</template>

<style scoped>
.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 12px;
  align-self: center;
}
</style>
