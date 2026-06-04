<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'

const route = useRoute()

// ====== PWA 更新提示 ======
const showUpdate = ref(false)

function checkPwaUpdate() {
  if ((window as any).__pwaNeedRefresh) {
    showUpdate.value = true
  }
}

function handleUpdate() {
  const updateFn = (window as any).__pwaUpdate
  if (updateFn) {
    updateFn()
    showToast('应用已更新')
  }
  showUpdate.value = false
}

onMounted(() => {
  checkPwaUpdate()
  // 每30秒检查一次更新
  setInterval(checkPwaUpdate, 30000)
})

const tabs = [
  { name: 'home', path: '/', icon: 'home-o', label: '浅浅' },
  { name: 'timer', path: '/timer', icon: 'clock-o', label: '时钟' },
  { name: 'stats', path: '/stats', icon: 'chart-trending-o', label: '统计' },
  { name: 'journal', path: '/journal', icon: 'gem-o', label: '记录' },
]

const activeTab = computed(() => tabs.findIndex(t => t.path === route.path))
const showTabbar = ref(true)
const hideTabbarRoutes = ['sessions', 'subjects', 'notes', 'note-new', 'note-edit', 'diary']

watch(() => route.name, (name) => {
  showTabbar.value = !hideTabbarRoutes.includes(name as string)
}, { immediate: true })

// Vant 主题定制
const themeVars = {
  primaryColor: '#E8738A',
  successColor: '#98D8C8',
  warningColor: '#F5A623',
  dangerColor: '#D94040',
  tabbarItemActiveColor: '#E8738A',
  buttonPrimaryBackground: '#E8738A',
  buttonPrimaryBorderColor: '#E8738A',
  cellFontSize: '15px',
  cellTextColor: '#3D2C33',
  cellLabelColor: '#B8A8AC',
  navBarIconColor: '#E8738A',
  navBarTextColor: '#3D2C33',
  navBarTitleFontSize: '17px',
  tabFontSize: '13px',
  tabActiveTextColor: '#E8738A',
  tabbarHeight: '54px',
  tabbarItemFontSize: '13px',
  tabbarItemIconSize: '22px',
  tagPrimaryColor: '#E8738A',
  circleColor: '#E8738A',
  progressColor: '#E8738A',
}
</script>

<template>
  <van-config-provider theme="light" :theme-vars="themeVars">
    <div id="app-container">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </div>

    <van-tabbar
      v-if="showTabbar"
      :model-value="activeTab"
      :placeholder="true"
      :safe-area-inset-bottom="true"
      route
      active-color="#E8738A"
    >
      <van-tabbar-item
        v-for="tab in tabs"
        :key="tab.name"
        :to="tab.path"
        :icon="tab.icon"
      >
        {{ tab.label }}
      </van-tabbar-item>
    </van-tabbar>

    <!-- PWA 更新提示 -->
    <div v-if="showUpdate" class="pwa-update-bar">
      <span class="pwa-update-text">有新版本可用</span>
      <van-button size="small" type="primary" round @click="handleUpdate">更新</van-button>
      <van-icon name="close" size="18" color="#999" @click="showUpdate = false" />
    </div>
  </van-config-provider>
</template>

<style>
#app-container {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}

/* PWA 更新提示条 */
.pwa-update-bar {
  position: fixed;
  bottom: 70px;
  left: 16px;
  right: 16px;
  z-index: 9990;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 10px 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.pwa-update-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}
</style>
