import { createRouter, createWebHistory } from 'vue-router'

import { currentUser, initializeAuth } from '@/services/auth'
import AdvisorDashboardView from '@/views/admin/AdvisorDashboardView.vue'
import StudentDashboardView from '@/views/admin/StudentDashboardView.vue'

function normalizeRole(role: string | undefined) {
  return role === 'lecturer' ? 'advisor' : role
}

function getDefaultRoute() {
  const role = normalizeRole(currentUser.value?.role)

  if (role === 'student') {
    return { name: 'student-information' }
  }

  if (role === 'advisor') {
    return { name: 'advisor-student-overall' }
  }

  if (role === 'admin') {
    return { name: 'admin-student-dashboard' }
  }

  return { name: 'access-unavailable' }
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
      path: '/unavailable',
      name: 'access-unavailable',
      component: () => import('../views/AccessUnavailableView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin/student-dashboard',
      name: 'admin-student-dashboard',
      component: StudentDashboardView,
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/admin/students/:studentId/milestones',
      name: 'admin-student-milestones',
      component: () => import('../views/admin/AdminStudentMilestoneView.vue'),
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/student/information',
      name: 'student-information',
      component: () => import('../views/student/StudentInformationView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/admin/advisor-dashboard',
      alias: '/advisor-dashboard',
      name: 'admin-advisor-dashboard',
      component: AdvisorDashboardView,
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/milestones',
      name: 'admin-milestone-management',
      component: () => import('../views/admin/MilestoneManagementView.vue'),
      meta: { requiresAuth: true, role: 'admin' },
    },
    {
      path: '/student/milestones',
      name: 'student-milestones',
      component: () => import('../views/student/StudentMilestoneView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/notifications',
      name: 'student-notifications',
      component: () => import('../views/student/StudentNotificationView.vue'),
      meta: { requiresAuth: true, role: 'student' },
    },
    {
      path: '/advisor/student-overall',
      alias: '/advisor',
      name: 'advisor-student-overall',
      component: () => import('../views/lecturer/LecturerStudentOverallView.vue'),
      meta: { requiresAuth: true, role: 'advisor' },
    },
    {
      path: '/advisor/summary',
      name: 'advisor-milestone-summary',
      component: () => import('../views/lecturer/LecturerMilestoneSummaryView.vue'),
      meta: { requiresAuth: true, role: 'advisor' },
    },
    {
      path: '/advisor/students/:studentId/milestones',
      name: 'advisor-student-milestones',
      component: () => import('../views/lecturer/LecturerStudentMilestoneView.vue'),
      meta: { requiresAuth: true, role: 'advisor' },
    },
  ],
})

router.beforeEach(async (to) => {
  await initializeAuth()

  if (to.meta.requiresAuth && !currentUser.value) {
    return { name: 'login' }
  }

  if (to.name === 'login' && currentUser.value) {
    return getDefaultRoute()
  }

  const requiredRole = typeof to.meta.role === 'string' ? to.meta.role : undefined
  const userRole = normalizeRole(currentUser.value?.role)

  if (requiredRole && userRole !== requiredRole) {
    return getDefaultRoute()
  }
})

export default router
