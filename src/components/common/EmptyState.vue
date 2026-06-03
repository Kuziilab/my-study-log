<script setup lang="ts">
defineProps<{
  description?: string
  image?: string
}>()
</script>

<template>
  <div class="empty-state-wrapper">
    <van-empty :description="description || '暂无数据'" :image="image || 'default'" />
  </div>
</template>
