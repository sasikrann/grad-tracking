<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import LanguageSwitch from './LanguageSwitch.vue'
import { useLanguage } from '@/composables/useLanguage'
import { getUnreadNotificationCount } from '@/services/notifications.api'
import type { CurrentUser } from '@/types/user'

defineOptions({ name: 'AppNavbar' })

// ชนิดข้อมูลที่ใช้สร้างเมนูของแต่ละ role
type MenuRole = 'admin' | 'advisor' | 'student'
type MenuIcon = 'dashboard' | 'student' | 'advisor' | 'milestone' | 'notification'

interface MenuItem {
  label: string
  to: string
  icon: MenuIcon
  activePaths?: string[]
}

// รับข้อมูลผู้ใช้ที่เข้าสู่ระบบมาจาก component แม่ เช่น App.vue
const props = defineProps<{
  user: CurrentUser
}>()

const route = useRoute()
const { setLanguage, t } = useLanguage()
const isMobileMenuOpen = ref(false)
const notificationUnreadCount = ref(0)
let unreadCountTimer: number | undefined
let bodyOverflowBeforeMenuOpen = ''
const emit = defineEmits<{
  logout: []
}>()

// รายการเมนูที่จะแสดงแยกตาม role
const menus: Record<MenuRole, MenuItem[]> = {
  admin: [
    {
      label: 'nav.studentManagement',
      to: '/admin/student-dashboard',
      icon: 'dashboard',
      activePaths: ['/admin/students/'],
    },
    { label: 'nav.advisorManagement', to: '/admin/advisor-dashboard', icon: 'advisor' },
    { label: 'nav.milestoneManagement', to: '/milestones', icon: 'milestone' },
    { label: 'nav.notificationManagement', to: '/admin/notifications', icon: 'notification' },
  ],
  advisor: [
    {
      label: 'Student Overall',
      to: '/advisor/student-overall',
      icon: 'dashboard',
      activePaths: ['/advisor/students/'],
    },
    { label: 'Milestone Summary', to: '/advisor/summary', icon: 'milestone' },
  ],
  student: [
    { label: 'Student Information', to: '/student/information', icon: 'student' },
    { label: 'Milestone', to: '/student/milestones', icon: 'milestone' },
    { label: 'Notification', to: '/notifications', icon: 'notification' },
  ],
}

const menuRole = computed<MenuRole>(() => props.user.role)

// เลือกรายการเมนูให้ตรงกับ role ของผู้ใช้
const menuItems = computed(() => menus[menuRole.value])
const routePath = computed(() => route?.path ?? '')
const shouldShowNotificationBadge = computed(
  () => menuRole.value === 'student' && notificationUnreadCount.value > 0,
)
const canChangeLanguage = computed(() => props.user.role === 'admin')

function menuLabel(item: MenuItem) {
  return menuRole.value === 'admin' ? t(item.label as Parameters<typeof t>[0]) : item.label
}

const userInitials = computed(() => {
  const normalizedName = props.user.fullName
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^(?:(?:Asst\.?\s*Prof\.?|Assoc\.?\s*Prof\.?|Prof\.?|Dr\.?)\s*)+/i, '')
    .replace(/^(?:นาย|นางสาว|นาง)\s*/, '')
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*/i, '')
    .trim()

  const names = normalizedName
    .split(/\s+/)

  const firstName = names[0] ?? ''
  const lastName = names[names.length - 1] ?? ''
  const initialNames = lastName && lastName !== firstName ? [firstName, lastName] : [firstName]

  return initialNames.map((name) => name.charAt(0).toUpperCase()).join('')
})

function isActiveItem(item: MenuItem) {
  return (
    routePath.value === item.to ||
    item.activePaths?.some((path) => routePath.value.startsWith(path))
  )
}

async function loadNotificationUnreadCount() {
  if (menuRole.value !== 'student') {
    notificationUnreadCount.value = 0
    return
  }

  try {
    const result = await getUnreadNotificationCount()
    notificationUnreadCount.value = result.count
  } catch {
    notificationUnreadCount.value = 0
  }
}

function handleNotificationUnreadCountChanged(event: Event) {
  const count = (event as CustomEvent<{ count?: unknown }>).detail?.count
  if (typeof count === 'number') {
    notificationUnreadCount.value = Math.max(0, count)
  }
}

function refreshUnreadCountWhenVisible() {
  if (document.visibilityState === 'visible') void loadNotificationUnreadCount()
}

onMounted(() => {
  void loadNotificationUnreadCount()
  unreadCountTimer = window.setInterval(() => {
    void loadNotificationUnreadCount()
  }, 15_000)
  window.addEventListener('focus', refreshUnreadCountWhenVisible)
  document.addEventListener('visibilitychange', refreshUnreadCountWhenVisible)
  window.addEventListener(
    'notifications:unread-count-changed',
    handleNotificationUnreadCountChanged,
  )
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflowBeforeMenuOpen
  if (unreadCountTimer) window.clearInterval(unreadCountTimer)
  window.removeEventListener('focus', refreshUnreadCountWhenVisible)
  document.removeEventListener('visibilitychange', refreshUnreadCountWhenVisible)
  window.removeEventListener(
    'notifications:unread-count-changed',
    handleNotificationUnreadCountChanged,
  )
})

watch(isMobileMenuOpen, (isOpen) => {
  if (isOpen) {
    bodyOverflowBeforeMenuOpen = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = bodyOverflowBeforeMenuOpen
})

watch(
  () => [menuRole.value, routePath.value],
  () => {
    void loadNotificationUnreadCount()
  },
)

watch(
  () => props.user.role,
  (role) => {
    setLanguage(role === 'admin' ? 'th' : 'en')
  },
  { immediate: true },
)
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-17 w-full items-center justify-between bg-[#7D2923] px-3 text-white md:hidden"
  >
    <div class="flex min-w-0 items-center gap-2">
      <button
        type="button"
        class="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-[#720008]"
        aria-label="Open navigation menu"
        :aria-expanded="isMobileMenuOpen"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
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
      <div class="flex size-8 shrink-0 items-center justify-center rounded bg-[#750008]">
        <img src="@/assets/logomfu.png" alt="MFU Logo" class="size-7 object-contain" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-base font-semibold leading-tight">ADT GRAD Tracking</p>
        <p class="text-[10px] text-white/75">Progress System</p>
      </div>
    </div>

    <div class="flex shrink-0 items-center">
      <div class="[&>div]:mb-0 [&_[role=group]]:w-14 [&_button]:px-1">
        <LanguageSwitch :enabled="canChangeLanguage" />
      </div>
      <RouterLink
        v-if="menuRole === 'student'"
        to="/notifications"
        class="relative flex size-8 items-center justify-center rounded-lg hover:bg-[#720008]"
        aria-label="Open notifications"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        <span
          v-if="shouldShowNotificationBadge"
          class="absolute right-0.5 top-0.5 size-2 rounded-full border border-[#7D2923] bg-[#f6c35b]"
          aria-label="Unread notifications"
        ></span>
      </RouterLink>
    </div>
  </header>

  <button
    v-if="isMobileMenuOpen"
    type="button"
    class="fixed inset-x-0 bottom-0 top-17 z-40 bg-black/40 md:hidden"
    aria-label="Close navigation menu"
    @click="isMobileMenuOpen = false"
  ></button>

  <aside
    class="fixed bottom-0 left-0 top-17 z-50 flex w-[70vw] max-w-[280px] shrink-0 -translate-x-full flex-col justify-between bg-[#7D2923] px-3 py-2.5 text-white shadow-xl transition-transform duration-200 md:sticky md:top-0 md:z-auto md:h-screen md:w-72 md:max-w-72 md:translate-x-0 md:px-3 md:py-3 md:shadow-none"
    :class="{ 'translate-x-0': isMobileMenuOpen }"
  >
    <div>
      <!-- ส่วนโลโก้และชื่อระบบ -->
      <div class="hidden items-center justify-between gap-3 md:flex">
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#750008] md:size-14 md:rounded-xl"
          >
            <img
              src="@/assets/logomfu.png"
              alt="MFU Logo"
              class="size-9 object-contain md:size-12"
            />
          </div>

          <div class="min-w-0">
            <h1 class="truncate text-base font-semibold leading-tight md:text-xl">
              ADT GRAD Tracking
            </h1>
            <p class="mt-0.5 text-[10px] text-white/80 md:text-sm">Progress System</p>
          </div>
        </div>
      </div>

      <!-- ส่วนเมนู: สร้างรายการตาม role ด้วย v-for -->
      <nav class="-mt-4 md:mt-3">
        <p class="mb-1 px-1 py-1 text-sm text-white/60">
          {{ menuRole === 'admin' ? t('nav.overview') : 'Overview' }}
        </p>

        <RouterLink
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-[5px] px-2 py-3 text-sm transition-colors hover:bg-[#720008]"
          :class="{ 'bg-[#720008]': isActiveItem(item) }"
          exact-active-class="bg-[#720008]"
          @click="isMobileMenuOpen = false"
        >
          <!-- เลือกไอคอนให้ตรงกับประเภทของเมนู -->
          <span class="relative flex size-4 shrink-0 items-center justify-center">
            <svg
              class="size-4"
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

              <template v-else-if="item.icon === 'advisor'">
                <circle cx="9" cy="7" r="3.5" />
                <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
                <path d="M16 4.2a3.5 3.5 0 0 1 0 6.7" />
                <path d="M17.5 14a5 5 0 0 1 3.5 4.8V21" />
              </template>

              <template v-else-if="item.icon === 'milestone'">
                <rect x="4" y="3" width="16" height="18" rx="4" />
                <path d="m8 12 2 2 5-5M8 7h8M14 16h2" />
              </template>

              <template v-else>
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </template>
            </svg>
            <span
              v-if="item.icon === 'notification' && shouldShowNotificationBadge"
              class="absolute -right-1 -top-1 size-2 rounded-full border border-[#7D2923] bg-[#f6c35b]"
              aria-label="Unread notifications"
            ></span>
          </span>

          <span class="flex min-w-0 flex-1 items-center gap-2">
            <span class="-translate-y-0.5 whitespace-nowrap leading-none">{{
              menuLabel(item)
            }}</span>
          </span>
        </RouterLink>
      </nav>
    </div>

    <!-- ส่วนข้อมูลผู้ใช้ที่แสดงด้านล่างสุดของ Navbar -->
    <div>
      <div class="hidden md:block md:[&>div]:mb-2 md:[&_[role=group]]:w-24">
        <LanguageSwitch :enabled="canChangeLanguage" />
      </div>
      <div class="flex items-center gap-2">
        <div
          class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#720008] text-[10px] md:size-8 md:text-xs"
        >
          {{ userInitials }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium">{{ user.fullName }}</p>
          <p class="truncate text-[10px] text-white/70">{{ user.email }}</p>
        </div>

        <button
          type="button"
          :aria-label="menuRole === 'admin' ? t('nav.signOut') : 'Sign out'"
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
    </div>
  </aside>
</template>
