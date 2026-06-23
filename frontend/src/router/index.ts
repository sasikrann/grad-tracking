import { createRouter, createWebHistory } from 'vue-router'
import StudentDashboardView from '@/views/admin/StudentDashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'admin-student-dashboard',
      component: StudentDashboardView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/lecturer/student-overall',
      name: 'lecturer-student-overall',
      component: () => import('../views/LecturerStudentOverallView.vue'),
    },
  ],
})

export default router
