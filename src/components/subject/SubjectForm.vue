<script setup lang="ts">
import { ref } from 'vue'
import type { Subject, SubjectCategory } from '../../db/schema'

const props = defineProps<{
  show: boolean
  subject: Subject | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', data: { name: string; category: SubjectCategory; color: string }): void
}>()

const PRESET_COLORS = [
  '#4A90D9', '#7B68EE', '#52C41A', '#FA8C16',
  '#F5222D', '#13C2C2', '#EB2F96', '#2F54EB',
  '#FAAD14', '#A0D911', '#722ED1', '#FA541C',
]

const CATEGORIES = [
  { text: '学科', value: 'subject' },
  { text: '技能', value: 'skill' },
  { text: '其他', value: 'other' },
]

const name = ref(props.subject?.name || '')
const category = ref(props.subject?.category || 'subject' as SubjectCategory)
const color = ref(props.subject?.color || PRESET_COLORS[0])

// 当 subject 变化时重置
import { watch } from 'vue'
watch(() => props.subject, (s) => {
  name.value = s?.name || ''
  category.value = s?.category || 'subject' as SubjectCategory
  color.value = s?.color || PRESET_COLORS[0]
})

function handleClose() {
  emit('update:show', false)
}

function handleSave() {
  if (!name.value.trim()) return
  emit('save', {
    name: name.value.trim(),
    category: category.value as SubjectCategory,
    color: color.value,
  })
}
</script>

<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    @click-overlay="handleClose"
  >
    <div class="subject-form">
      <h3 class="subject-form__title">
        {{ subject ? '编辑科目' : '添加科目' }}
      </h3>

      <van-field
        v-model="name"
        label="名称"
        placeholder="输入科目名称"
        maxlength="20"
      />

      <van-field
        v-model="category"
        label="类别"
        is-link
        readonly
        clickable
      >
        <template #input>
          <div class="category-select">
            <van-radio-group v-model="category" direction="horizontal">
              <van-radio
                v-for="cat in CATEGORIES"
                :key="cat.value"
                :name="cat.value"
              >
                {{ cat.text }}
              </van-radio>
            </van-radio-group>
          </div>
        </template>
      </van-field>

      <div class="color-picker">
        <div class="color-picker__label">颜色</div>
        <div class="color-picker__grid">
          <div
            v-for="c in PRESET_COLORS"
            :key="c"
            class="color-picker__item"
            :class="{ 'color-picker__item--active': c === color }"
            :style="{ backgroundColor: c }"
            @click="color = c"
          >
            <van-icon v-if="c === color" name="success" color="#fff" size="16" />
          </div>
        </div>
      </div>

      <div class="subject-form__actions">
        <van-button round block type="primary" @click="handleSave">
          保存
        </van-button>
      </div>
    </div>
  </van-popup>
</template>

<style scoped>
.subject-form {
  padding: 20px 16px 30px;
}

.subject-form__title {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
}

.category-select {
  padding: 8px 0;
}

.color-picker {
  padding: 16px;
}

.color-picker__label {
  font-size: 14px;
  color: #646566;
  margin-bottom: 12px;
}

.color-picker__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.color-picker__item {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid transparent;
  transition: border-color 0.2s;
}

.color-picker__item--active {
  border-color: #333;
}

.subject-form__actions {
  margin-top: 20px;
}
</style>
