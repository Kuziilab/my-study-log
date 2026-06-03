import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TimerStudyView from '../views/TimerStudyView.vue'
import StatsView from '../views/StatsView.vue'
import JournalView from '../views/JournalView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/timer',
      name: 'timer',
      component: TimerStudyView,
    },
    {
      path: '/stats',
      name: 'stats',
      component: StatsView,
    },
    {
      path: '/journal',
      name: 'journal',
      component: JournalView,
    },
    {
      path: '/diary/:date',
      name: 'diary',
      component: () => import('../views/DiaryEditor.vue'),
    },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('../views/SessionListView.vue'),
    },
    {
      path: '/subjects',
      name: 'subjects',
      component: () => import('../views/SubjectManageView.vue'),
    },
    {
      path: '/notes',
      name: 'notes',
      component: () => import('../views/NoteView.vue'),
    },
    {
      path: '/notes/new',
      name: 'note-new',
      component: () => import('../views/NoteEditView.vue'),
    },
    {
      path: '/notes/:id',
      name: 'note-edit',
      component: () => import('../views/NoteEditView.vue'),
    },
  ],
})

export default router
