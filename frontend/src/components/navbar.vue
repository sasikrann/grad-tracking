<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CurrentUser } from '@/types/user'

defineOptions({ name: 'AppNavbar' })

// ชนิดข้อมูลที่ใช้สร้างเมนูของแต่ละ role
type MenuRole = 'admin' | 'lecturer' | 'student'
type MenuIcon = 'dashboard' | 'student' | 'milestone' | 'notification'

interface MenuItem {
  label: string
  to: string
  icon: MenuIcon
}

// รับข้อมูลผู้ใช้ที่เข้าสู่ระบบมาจาก component แม่ เช่น App.vue
const props = defineProps<{
  user: CurrentUser
}>()

const isMobileMenuOpen = ref(false)
const emit = defineEmits<{
  logout: []
}>()

// รายการเมนูที่จะแสดงแยกตาม role
const menus: Record<MenuRole, MenuItem[]> = {
  admin: [
    { label: 'Student Dashboard', to: '/admin/student-dashboard', icon: 'dashboard' },
    { label: 'Advisor Dashboard', to: '/admin/advisor-dashboard', icon: 'dashboard' },
    { label: 'Milestone Management', to: '/milestones', icon: 'milestone' },
    { label: 'Notification Management', to: '/notifications', icon: 'notification' },
  ],
  lecturer: [
    { label: 'Student Overall', to: '/advisor/student-overall', icon: 'dashboard' },
    { label: 'Milestone Summary', to: '/advisor/summary', icon: 'milestone' },
  ],
  student: [
    { label: 'Student Information', to: '/', icon: 'student' },
    { label: 'Milestone', to: '/milestones', icon: 'milestone' },
    { label: 'Notification', to: '/notifications', icon: 'notification' },
  ],
}

// Backend ใช้ชื่อ advisor แต่หน้าเว็บเรียกว่า lecturer จึงให้ใช้เมนูชุดเดียวกัน
const menuRole = computed<MenuRole>(() =>
  props.user.role === 'advisor' ? 'lecturer' : props.user.role,
)

// เลือกรายการเมนูให้ตรงกับ role ของผู้ใช้
const menuItems = computed(() => menus[menuRole.value])

// ใช้ initials ที่ส่งมา หรือสร้างจากชื่อผู้ใช้ให้อัตโนมัติ เช่น John Doe เป็น JD
const userInitials = computed(() => {
  if (props.user.initials) return props.user.initials

  const names = props.user.fullName
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)

  return names
    .slice(0, 2)
    .map((name) => name.charAt(0).toUpperCase())
    .join('')
})
</script>

<template>
  <header
    class="flex h-16 w-full items-center justify-between bg-[#7D2923] px-4 text-white md:hidden"
  >
    <div class="flex items-center gap-3">
      <div class="flex size-10 items-center justify-center rounded-lg bg-[#750008]">
        <img src="@/assets/logomfu.png" alt="MFU Logo" class="size-9 object-contain" />
      </div>
      <div>
        <p class="text-base font-semibold leading-tight">Thesis Tracker</p>
        <p class="text-xs text-white/75">Progress System</p>
      </div>
    </div>

    <button
      type="button"
      class="flex size-10 items-center justify-center rounded-lg hover:bg-[#720008]"
      aria-label="Open navigation menu"
      :aria-expanded="isMobileMenuOpen"
      @click="isMobileMenuOpen = true"
    >
      <svg
        class="size-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  </header>

  <button
    v-if="isMobileMenuOpen"
    type="button"
    class="fixed inset-0 z-40 bg-black/40 md:hidden"
    aria-label="Close navigation menu"
    @click="isMobileMenuOpen = false"
  ></button>

  <aside
    class="fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 -translate-x-full flex-col justify-between bg-[#7D2923] px-3 py-3 text-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 md:shadow-none"
    :class="{ 'translate-x-0': isMobileMenuOpen }"
  >
    <div>
      <!-- ส่วนโลโก้และชื่อระบบ -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="flex size-14 items-center justify-center rounded-xl bg-[#750008]">
            <img src="@/assets/logomfu.png" alt="MFU Logo" class="size-12 object-contain" />
          </div>

          <div>
            <h1 class="text-xl font-semibold leading-tight">Thesis Tracker</h1>
            <p class="mt-0.5 text-sm text-white/80">Progress System</p>
          </div>
        </div>

        <button
          type="button"
          class="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-[#720008] md:hidden"
          aria-label="Close navigation menu"
          @click="isMobileMenuOpen = false"
        >
          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <!-- ส่วนเมนู: สร้างรายการตาม role ด้วย v-for -->
      <nav class="mt-3">
        <p class="mb-1 px-1 py-1 text-sm text-white/60">Overview</p>

        <RouterLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-[5px] px-2 py-3 text-sm transition-colors hover:bg-[#720008]"
          exact-active-class="bg-[#720008]"
          @click="isMobileMenuOpen = false"
        >
          <!-- เลือกไอคอนให้ตรงกับประเภทของเมนู -->
          <svg
            class="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
          >
            <template v-if="item.icon === 'dashboard'">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </template>

            <template v-else-if="item.icon === 'student'">
              <path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Z" />
              <path d="M7 17h12M9 7h6" />
            </template>

            <template v-else-if="item.icon === 'milestone'">
              <rect x="4" y="3" width="16" height="18" rx="4" />
              <path d="m8 12 2 2 5-5M8 7h8M14 16h2" />
            </template>

            <template v-else>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </template>
          </svg>

          <span class="-translate-y-0.5 leading-none">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <!-- ส่วนข้อมูลผู้ใช้ที่แสดงด้านล่างสุดของ Navbar -->
    <div class="flex items-center gap-2">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#720008] text-xs"
      >
        {{ userInitials }}
      </div>

      <div class="flex-1">
        <p class="text-xs font-medium">{{ user.fullName }}</p>
        <p class="text-[10px] text-white/70">{{ user.email }}</p>
      </div>

      <button
        type="button"
        aria-label="Sign out"
        class="rounded p-1.5 hover:bg-[#720008]"
        @click="emit('logout')"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        </svg>
      </button>
    </div>
  </aside>
</template>
