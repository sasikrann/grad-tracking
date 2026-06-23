<script setup lang="ts">
import { computed } from 'vue'
import Navbar from '@/components/navbar.vue'
import type { CurrentUser } from '@/types/user'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()

// ข้อมูลทดสอบชั่วคราว เมื่อมีระบบ Login ให้เปลี่ยนเป็น user จาก Auth Store หรือ API
const demoUsers: Record<'admin' | 'advisor', CurrentUser> = {
  admin: {
    fullName: 'Mr.John Smith',
    email: 'johndoe@lamduan.mfu.ac.th',
    role: 'admin',
    initials: 'JM',
  },
  advisor: {
    fullName: 'Dr. John Doe',
    email: 'johndoe@lamduan.mfu.ac.th',
    role: 'advisor',
    initials: 'JD',
  },
}

// เลือก Navbar ตาม role ที่กำหนดไว้ใน route meta
const currentUser = computed(() =>
  route.meta.role === 'advisor' ? demoUsers.advisor : demoUsers.admin,
)
</script>

<template>
  <div class="flex min-h-screen">
    <Navbar :user="currentUser" />

    <main class="min-w-0 flex-1">
      <RouterView />
    </main>
  </div>
</template>
