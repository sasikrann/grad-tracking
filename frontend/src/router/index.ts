import { createRouter, createWebHistory } from 'vue-router'
import StudentDashboardView from '@/views/admin/StudentDashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/admin/student-dashboard',
      name: 'admin-student-dashboard',
      component: StudentDashboardView,
      meta: { role: 'admin' },
    },
    {
      path: '/advisor/student-overall',
      name: 'advisor-student-overall',
      component: () => import('../views/lecturer/LecturerStudentOverallView.vue'),
      meta: { role: 'advisor' },
    },
    {
      path: '/advisor/summary',
      name: 'advisor-milestone-summary',
      component: () => import('../views/lecturer/LecturerMilestoneSummaryView.vue'),
      meta: { role: 'advisor' },
    },
  ],
})

export default router
