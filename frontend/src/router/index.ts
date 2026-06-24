import { createRouter, createWebHistory } from 'vue-router'

import { currentUser } from '@/services/auth'
import StudentDashboardView from '@/views/admin/StudentDashboardView.vue'

function getDefaultRoute() {
  if (currentUser.value?.role === 'advisor' || currentUser.value?.role === 'lecturer') {
    return { name: 'advisor-student-overall' }
  }

  return { name: 'admin-student-dashboard' }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      redirect: getDefaultRoute,
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { hideNavbar: true },
    },
    {
      path: '/admin/student-dashboard',
      name: 'admin-student-dashboard',
      component: StudentDashboardView,
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/advisor/student-overall',
      alias: '/advisor',
      name: 'advisor-student-overall',
      component: () => import('../views/lecturer/LecturerStudentOverallView.vue'),
      meta: { requiresAuth: true, role: 'advisor' },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !currentUser.value) {
    return { name: 'login' }
  }

  if (to.name === 'login' && currentUser.value) {
    return getDefaultRoute()
  }
})

export default router
