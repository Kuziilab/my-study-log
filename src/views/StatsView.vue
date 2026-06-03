<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'

import { db } from '../db/database'
import { todayISO, getWeekRange, getMonthRange } from '../utils/date'
import type { Subject } from '../db/schema'

// ====== Tab 状态 ======
const activeTab = ref(0)
const loading = ref(false)

// ====== 数据 ======
const totalMinutes = ref(0)
const totalSessions = ref(0)
const avgDailyMinutes = ref(0)
const subjects = ref<Subject[]>([])

// ====== 图表 refs ======
const barChartRef = ref<HTMLDivElement>()
const pieChartRef = ref<HTMLDivElement>()
const trendChartRef = ref<HTMLDivElement>()
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let trendChart: echarts.ECharts | null = null

// ====== 加载数据 ======
async function loadData() {
  loading.value = true
  let start: string, end: string
  let label: string

  if (activeTab.value === 0) {
    start = end = todayISO()
    label = '今日'
  } else if (activeTab.value === 1) {
    const r = getWeekRange(); start = r.start; end = r.end
    label = '本周'
  } else {
    const r = getMonthRange(); start = r.start; end = r.end
    label = '本月'
  }

  // 获取科目
  subjects.value = (await db.subjects.toArray()).filter(s => s.isActive)

  // 获取学习记录
  const sessions = await db.sessions.where('date').between(start, end, true, true).toArray()
  totalMinutes.value = sessions.reduce((s, r) => s + r.durationMinutes, 0)
  totalSessions.value = sessions.length
  studiedSubjects.value = new Set(sessions.map(s => s.subjectId)).size

  // 科目统计
  const subjectStats = new Map<number, { name: string; color: string; minutes: number }>()
  for (const s of sessions) {
    if (!subjectStats.has(s.subjectId)) {
      const sub = subjects.value.find(x => x.id === s.subjectId)
      subjectStats.set(s.subjectId, { name: sub?.name || '未知', color: sub?.color || '#999', minutes: 0 })
    }
    subjectStats.get(s.subjectId)!.minutes += s.durationMinutes
  }

  // 每日趋势
  const dailyMap = new Map<string, number>()
  const startDate = new Date(start)
  const endDate = new Date(end)
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dailyMap.set(d.toISOString().slice(0, 10), 0)
  }
  for (const s of sessions) { dailyMap.set(s.date, (dailyMap.get(s.date) || 0) + s.durationMinutes) }

  // 日均
  const days = Math.max(1, dailyMap.size)
  avgDailyMinutes.value = Math.round(totalMinutes.value / days)

  // 先结束 loading，让 DOM 渲染出来
  loading.value = false
  await nextTick()
  await nextTick() // 双重 nextTick 确保 v-if/v-else 已切换

  if (totalMinutes.value > 0) {
    renderBarChart(subjectStats, label)
    renderPieChart(subjectStats)
    renderTrendChart(dailyMap, label)
  }
}

function renderBarChart(subjectStats: Map<number, any>, label: string) {
  if (!barChartRef.value) { console.warn('barChartRef not ready'); return }
  if (barChart) barChart.dispose()
  barChart = echarts.init(barChartRef.value)
  const stats = [...subjectStats.values()].sort((a, b) => b.minutes - a.minutes)
  barChart.setOption({
    title: { text: `${label}各科目学习时长`, left: 'center', textStyle: { fontSize: 14, color: '#1e293b' } },
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Math.round(v)} 分钟` },
    grid: { left: 8, right: 12, top: 40, bottom: 24 },
    xAxis: { type: 'category', data: stats.map(s => s.name), axisLabel: { fontSize: 11 } },
    yAxis: { type: 'value', name: '分钟', axisLabel: { fontSize: 11 } },
    series: [{ type: 'bar', data: stats.map(s => ({ value: s.minutes, itemStyle: { color: s.color, borderRadius: [6, 6, 0, 0] } })), barMaxWidth: 36 }],
  }, true)
}

function renderPieChart(subjectStats: Map<number, any>) {
  if (!pieChartRef.value) { console.warn('pieChartRef not ready'); return }
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)
  const stats = [...subjectStats.values()].filter(s => s.minutes > 0)
  pieChart.setOption({
    tooltip: { trigger: 'item', valueFormatter: (v: number) => `${Math.round(v)} 分钟` },
    legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11 } },
    series: [{
      type: 'pie', radius: ['45%', '70%'], center: ['50%', '43%'],
      data: stats.map(s => ({ name: s.name, value: s.minutes, itemStyle: { color: s.color } })),
      label: { formatter: '{b}\n{d}%', fontSize: 11 },
    }],
  }, true)
}

function renderTrendChart(dailyMap: Map<string, number>, _label: string) {
  if (!trendChartRef.value) { console.warn('trendChartRef not ready'); return }
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)
  const entries = [...dailyMap.entries()]
  trendChart.setOption({
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => `${Math.round(v)} 分钟` },
    grid: { left: 8, right: 12, top: 12, bottom: 24 },
    xAxis: { type: 'category', data: entries.map(([d]) => d.slice(5)), axisLabel: { fontSize: 10, rotate: activeTab.value === 2 ? 30 : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [{
      type: 'bar', data: entries.map(([, v]) => ({ value: v, itemStyle: { color: '#6366f1', borderRadius: [4, 4, 0, 0] } })),
      barMaxWidth: activeTab.value === 0 ? 48 : 18,
    }],
  }, true)
}

// ====== 监听 Tab 切换 ======
async function onTabChange(tab: number) {
  if (tab === activeTab.value) return
  // 销毁旧图表
  barChart?.dispose(); barChart = null
  pieChart?.dispose(); pieChart = null
  trendChart?.dispose(); trendChart = null
  activeTab.value = tab
  loadData()
}

onMounted(() => loadData())

const totalHours = computed(() => Math.floor(totalMinutes.value / 60))
const totalMins = computed(() => totalMinutes.value % 60)
const studiedSubjects = ref(0) // 实际学过的科目数
</script>

<template>
  <div class="page-content page-content--with-padding">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:20px;font-weight:700;color:var(--c-text);margin:0">📊 学习统计</h3>
      <van-button size="small" icon="replay" round plain type="primary" :loading="loading" @click="loadData">刷新</van-button>
    </div>

    <!-- 摘要卡片 -->
    <div class="summary-row">
      <div class="summary-card">
        <div class="summary-num">{{ totalHours }}<span class="summary-unit-sm">h</span> {{ totalMins }}<span class="summary-unit-sm">m</span></div>
        <div class="summary-label">总时长</div>
      </div>
      <div class="summary-card">
        <div class="summary-num">{{ totalSessions }}</div>
        <div class="summary-label">学习次数</div>
      </div>
      <div class="summary-card">
        <div class="summary-num">{{ avgDailyMinutes }}<span class="summary-unit-sm">m</span></div>
        <div class="summary-label">日均时长</div>
      </div>
      <div class="summary-card">
        <div class="summary-num">{{ studiedSubjects }}</div>
        <div class="summary-label">学习科目</div>
      </div>
    </div>

    <!-- Tab -->
    <van-tabs :active="activeTab" @click-tab="({ name }: any) => onTabChange(name as number)">
      <van-tab :name="0" title="日" />
      <van-tab :name="1" title="周" />
      <van-tab :name="2" title="月" />
    </van-tabs>

    <div v-if="loading" style="text-align:center;padding:40px">
      <van-loading size="24" color="#6366f1" />
    </div>

    <div v-else-if="totalMinutes === 0" class="empty-state-wrapper">
      <van-empty description="这个时间段还没有学习记录" />
    </div>

    <div v-else class="stats-content">
      <!-- 柱状图 -->
      <div class="card-section">
        <div ref="barChartRef" class="chart-box"></div>
      </div>

      <!-- 饼图 -->
      <div class="card-section">
        <div ref="pieChartRef" class="chart-box"></div>
      </div>

      <!-- 趋势图 -->
      <div class="card-section">
        <div class="card-section__title">📈 每日趋势</div>
        <div ref="trendChartRef" class="chart-box"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 摘要 */
.summary-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.summary-card {
  background: var(--c-card);
  border-radius: var(--c-radius-sm);
  padding: 16px 12px;
  text-align: center;
  box-shadow: var(--c-shadow);
}
.summary-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--c-primary);
  line-height: 1.2;
}
.summary-unit-sm { font-size: 14px; font-weight: 500; color: var(--c-text-secondary); }
.summary-label { font-size: 12px; color: var(--c-text-muted); margin-top: 4px; }

/* 图表 */
.chart-box {
  width: 100%;
  height: 280px;
}
.stats-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 20px;
}
.stats-content .card-section { margin-bottom: 0; }

/* 适配 Vant Tabs */
:deep(.van-tabs__wrap) { margin-bottom: 12px; }
</style>
