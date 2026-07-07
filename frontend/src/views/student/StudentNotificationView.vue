<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications.api'
import type { StudentNotification } from '@/types/notification'

const notifications = ref<StudentNotification[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const markingNotificationId = ref<string | null>(null)
const isMarkingAll = ref(false)

const unreadCount = computed(
  () => notifications.value.filter((notification) => !notification.isRead).length,
)

function formatNotificationTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 1) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
  }

  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function notificationTone(notification: StudentNotification) {
  const text = `${notification.title} ${notification.message}`.toLowerCase()

  if (text.includes('deadline') || text.includes('reminder')) return 'deadline'
  if (text.includes('complete') || text.includes('approved')) return 'success'
  if (text.includes('document') || text.includes('file')) return 'document'
  if (text.includes('advisor')) return 'advisor'
  if (text.includes('system') || text.includes('maintenance')) return 'system'
  return 'milestone'
}

async function loadNotifications() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    notifications.value = await getMyNotifications()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load notifications'
  } finally {
    isLoading.value = false
  }
}

function updateNotificationReadStatus(notificationId: string, readAt = new Date().toISOString()) {
  notifications.value = notifications.value.map((notification) =>
    notification.notificationId === notificationId
      ? { ...notification, isRead: true, readAt }
      : notification,
  )
}

async function markOneAsRead(notification: StudentNotification) {
  if (notification.isRead) return

  markingNotificationId.value = notification.notificationId
  errorMessage.value = ''

  try {
    const result = await markNotificationAsRead(notification.notificationId)
    updateNotificationReadStatus(notification.notificationId, result.readAt)
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to mark notification as read'
  } finally {
    markingNotificationId.value = null
  }
}

async function markAllAsRead() {
  if (!unreadCount.value) return

  isMarkingAll.value = true
  errorMessage.value = ''

  try {
    await markAllNotificationsAsRead()
    const readAt = new Date().toISOString()
    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      isRead: true,
      readAt: notification.readAt ?? readAt,
    }))
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to mark all notifications as read'
  } finally {
    isMarkingAll.value = false
  }
}

onMounted(() => {
  void loadNotifications()
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">Notification</h1>
        <p class="mt-1 text-sm text-slate-500">
          Stay updated with your milestones and advisor messages.
        </p>
      </div>

      <button
        type="button"
        :disabled="isMarkingAll || unreadCount === 0"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60"
        @click="markAllAsRead"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Mark all as read
      </button>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <section
      class="mt-5 rounded-lg border border-slate-200 bg-white px-4 py-4 shadow-[0_2px_4px_rgba(0,0,0,0.12)] sm:px-5 sm:py-5"
    >
      <div v-if="isLoading" class="py-8 text-center text-sm text-slate-500">
        Loading notifications...
      </div>

      <div
        v-else-if="notifications.length === 0"
        class="py-10 text-center text-sm text-slate-500"
      >
        No notifications yet.
      </div>

      <template v-else>
        <article
          v-for="notification in notifications"
          :key="notification.notificationId"
          class="grid gap-3 border-b border-slate-200 py-4 last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="mt-4 size-1.5 shrink-0 rounded-full"
              :class="notification.isRead ? 'bg-transparent' : 'bg-[#8b2a23]'"
              aria-hidden="true"
            ></span>

            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-[#f8e7e7] text-[#b12a24]': notificationTone(notification) === 'milestone',
                'bg-[#fff4d8] text-[#d09a10]': notificationTone(notification) === 'deadline',
                'bg-[#ecf7df] text-[#6b9c2f]': notificationTone(notification) === 'success',
                'bg-[#e6f0ff] text-[#2f7de1]': notificationTone(notification) === 'document',
                'bg-[#fde9e5] text-[#b84b3f]': notificationTone(notification) === 'advisor',
                'bg-[#efe3ff] text-[#8a4de8]': notificationTone(notification) === 'system',
              }"
              aria-hidden="true"
            >
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <template v-if="notificationTone(notification) === 'deadline'">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </template>
                <template v-else-if="notificationTone(notification) === 'document'">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <path d="M17 8 12 3 7 8" />
                  <path d="M12 3v12" />
                </template>
                <template v-else-if="notificationTone(notification) === 'advisor'">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </template>
                <template v-else-if="notificationTone(notification) === 'system'">
                  <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
                </template>
                <template v-else>
                  <rect x="5" y="4" width="14" height="16" rx="3" />
                  <path d="m9 12 2 2 4-5" />
                  <path d="M9 3v3M15 3v3" />
                </template>
              </svg>
            </span>

            <div class="min-w-0">
              <h2 class="break-words text-base font-bold leading-snug text-black">
                {{ notification.title }}
              </h2>
              <p class="mt-1 break-words text-sm leading-snug text-slate-500">
                {{ notification.message }}
              </p>
            </div>
          </div>

          <time class="text-sm text-slate-500 md:min-w-32">
            {{ formatNotificationTime(notification.sentAt ?? notification.createdAt) }}
          </time>

          <div class="flex flex-wrap items-center gap-2 md:justify-end">
            <button
              v-if="!notification.isRead"
              type="button"
              :disabled="markingNotificationId === notification.notificationId"
              class="inline-flex h-7 items-center justify-center rounded-lg border border-[#ead0d0] px-3 text-xs font-semibold text-[#8b2a23] hover:bg-[#f8eeee] disabled:cursor-not-allowed disabled:opacity-60"
              @click="markOneAsRead(notification)"
            >
              Mark as read
            </button>
          </div>
        </article>

        <p class="pt-4 text-sm text-slate-500">
          Showing {{ notifications.length }} notification{{ notifications.length === 1 ? '' : 's' }}
        </p>
      </template>
    </section>
  </div>
</template>
