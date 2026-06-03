import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
    },
    {
      path: '/timer',
      name: 'timer',
      component: () => import('../views/TimerStudyView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('../views/StatsView.vue'),
    },
    {
      path: '/journal',
      name: 'journal',
      component: () => import('../views/JournalView.vue'),
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
