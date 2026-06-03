<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  showBack?: boolean
  rightText?: string
}>()

const emit = defineEmits<{
  (e: 'click-right'): void
}>()

const router = useRouter()

function goBack() {
  router.back()
}
</script>

<template>
  <van-nav-bar
    :title="title"
    :left-arrow="showBack"
    :right-text="rightText"
    fixed
    placeholder
    @click-left="goBack"
    @click-right="emit('click-right')"
  />
</template>
