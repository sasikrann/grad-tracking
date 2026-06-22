<script setup lang="ts">
import Navbar from '@/components/navbar.vue'
import type { CurrentUser } from '@/types/user'
import { RouterView } from 'vue-router'

// ข้อมูลตัวอย่าง เมื่อมีระบบ login ให้เปลี่ยนเป็น user จาก auth store หรือ API
const currentUser: CurrentUser = {
  fullName: 'Mr.John Smith',
  email: 'johndoe@lamduan.mfu.ac.th',
  role: 'admin',
  initials: 'JM',
}
</script>

<template>
  <Navbar :user="currentUser" />
  <main class="ml-64 min-h-screen">
    <RouterView />
  </main>
</template>
