import { createRouter, createWebHistory } from 'vue-router'
import { currentUser } from '@/services/auth'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { hideNavbar: true },
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !currentUser.value) {
    return { name: 'login' }
  }

  if (to.name === 'login' && currentUser.value) {
    return { name: 'home' }
  }
})

export default router
