<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import Navbar from '@/components/navbar.vue'
import { currentUser, logout } from '@/services/auth'

const route = useRoute()
const router = useRouter()
const showNavbar = computed(() => Boolean(currentUser.value) && !route.meta.hideNavbar)

async function handleLogout() {
  window.google?.accounts.id.disableAutoSelect()
  logout()
  await router.push('/login')
}
</script>

<template>
  <Navbar v-if="showNavbar && currentUser" :user="currentUser" @logout="handleLogout" />

  <main :class="{ 'ml-64': showNavbar }">
    <RouterView />
  </main>
</template>
