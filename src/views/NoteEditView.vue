<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import PageHeader from '../components/common/PageHeader.vue'
import { useNoteDatabase, useSubjectDatabase } from '../composables/useDatabase'

const router = useRouter()
const route = useRoute()

const { getNoteById, addNote, updateNote } = useNoteDatabase()
const { subjects, fetchSubjects } = useSubjectDatabase()

const title = ref('')
const content = ref('')
const subjectId = ref<number | undefined>()
const isEditing = ref(false)
const editingId = ref<number | undefined>()

onMounted(async () => {
  await fetchSubjects()

  const id = route.params.id as string
  if (id) {
    isEditing.value = true
    editingId.value = Number(id)
    const note = await getNoteById(Number(id))
    if (note) {
      title.value = note.title
      content.value = note.content
      subjectId.value = note.subjectId
    }
  }
})

async function handleSave() {
  if (!title.value.trim()) {
    showToast('请输入标题')
    return
  }

  if (isEditing.value && editingId.value) {
    await updateNote(editingId.value, {
      title: title.value.trim(),
      content: content.value.trim(),
      subjectId: subjectId.value,
    })
    showToast('已更新')
  } else {
    await addNote({
      title: title.value.trim(),
      content: content.value.trim(),
      subjectId: subjectId.value,
    })
    showToast('已保存')
  }

  router.back()
}
</script>

<template>
  <div class="page-content">
    <PageHeader
      :title="isEditing ? '编辑笔记' : '新建笔记'"
      show-back
      right-text="保存"
      @click-right="handleSave"
    />

    <div class="page-content--with-padding">
      <van-field
        v-model="title"
        label="标题"
        placeholder="输入笔记标题"
        maxlength="200"
      />

      <van-field
        v-model="subjectId"
        label="关联科目"
        is-link
        readonly
        clickable
      >
        <template #input>
          <van-radio-group v-model="subjectId">
            <van-radio
              v-for="s in subjects"
              :key="s.id"
              :name="s.id"
            >
              {{ s.name }}
            </van-radio>
          </van-radio-group>
        </template>
      </van-field>

      <van-field
        v-model="content"
        label="内容"
        placeholder="输入笔记内容..."
        type="textarea"
        rows="12"
        maxlength="10000"
        show-word-limit
      />
    </div>
  </div>
</template>
