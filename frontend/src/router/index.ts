import { createRouter, createWebHistory } from 'vue-router'
import StudentDashboardView from '@/views/admin/StudentDashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'admin-student-dashboard',
      component: StudentDashboardView,
      meta: { role: 'admin' },
    },
    {
      path: '/lecturer/student-overall',
      name: 'lecturer-student-overall',
      component: () => import('../views/lecturer/LecturerStudentOverallView.vue'),
      meta: { role: 'advisor' },
    },
  ],
})

export default router
