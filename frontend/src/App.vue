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
  <div class="flex min-h-screen">
    <Navbar :user="currentUser" />

    <main class="min-w-0 flex-1">
      <RouterView />
    </main>
  </div>
</template>
