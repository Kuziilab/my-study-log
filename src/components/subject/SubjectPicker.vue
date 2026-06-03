<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Subject } from '../../db/schema'
import { useSubjectDatabase } from '../../composables/useDatabase'

defineProps<{
  modelValue: Subject | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: Subject): void
  (e: 'select', subject: Subject): void
  (e: 'want-add'): void
}>()

const { subjects, fetchSubjects } = useSubjectDatabase()
const show = ref(false)

onMounted(() => {
  fetchSubjects()
})

watch(show, (val) => {
  if (val) fetchSubjects()
})

function selectSubject(subject: Subject) {
  emit('update:modelValue', subject)
  emit('select', subject)
  show.value = false
}

function handleWantAdd() {
  show.value = false
  emit('want-add')
}
</script>

<template>
  <div>
    <van-cell
      :title="modelValue?.name || '选择科目'"
      is-link
      @click="show = true"
    >
      <template #icon>
        <div
          v-if="modelValue"
          class="picker-dot"
          :style="{ backgroundColor: modelValue.color }"
        />
      </template>
    </van-cell>

    <van-popup v-model:show="show" round position="bottom">
      <div class="picker-popup">
        <h3 class="picker-title">选择科目</h3>

        <div v-if="subjects.length === 0" class="empty-hint">
          还没有科目，点击下方按钮添加
        </div>

        <div class="subject-list" v-else>
          <van-cell
            v-for="subject in subjects"
            :key="subject.id"
            :title="subject.name"
            @click="selectSubject(subject)"
          >
            <template #icon>
              <div class="picker-dot" :style="{ backgroundColor: subject.color }" />
            </template>
            <template #right-icon>
              <van-icon
                v-if="modelValue?.id === subject.id"
                name="success"
                color="#4A90D9"
              />
            </template>
          </van-cell>
        </div>

        <div class="picker-actions">
          <van-button
            icon="plus"
            type="primary"
            round
            block
            plain
            @click="handleWantAdd"
          >
            自定义添加科目
          </van-button>
          <van-button
            type="default"
            round
            block
            style="margin-top:8px"
            @click="show = false"
          >
            取消
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.picker-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
  align-self: center;
  flex-shrink: 0;
}
.picker-popup {
  padding: 12px 0 20px;
  max-height: 80vh;
  overflow-y: auto;
}
.picker-title {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  padding: 12px 0 8px;
}
.empty-hint {
  padding: 30px;
  text-align: center;
  color: #999;
}
.subject-list {
  max-height: 40vh;
  overflow-y: auto;
}
.picker-actions {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
}
</style>
