<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  resolveNotificationAttachmentUrl,
} from '@/services/notifications.api'
import type { StudentNotification } from '@/types/notification'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useLanguage()

const notifications = ref<StudentNotification[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const markingNotificationId = ref<string | null>(null)
const isMarkingAll = ref(false)
const isDetailOpen = ref(false)
const selectedNotification = ref<StudentNotification | null>(null)
const isAttachmentPreviewOpen = ref(false)
const isLoadingAttachmentPreview = ref(false)
const attachmentPreviewUrl = ref('')
const attachmentPreviewName = ref('')
const attachmentPreviewType = ref<'image' | 'pdf' | null>(null)
const attachmentPreviewError = ref('')
const currentPage = ref(1)
const notificationsPerPage = 10
let notificationRefreshTimer: number | undefined

const unreadCount = computed(
  () => notifications.value.filter((notification) => !notification.isRead).length,
)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(notifications.value.length / notificationsPerPage)),
)
const pageNumbers = computed(() =>
  Array.from({ length: totalPages.value }, (_, index) => index + 1),
)
const paginatedNotifications = computed(() => {
  const startIndex = (currentPage.value - 1) * notificationsPerPage
  return notifications.value.slice(startIndex, startIndex + notificationsPerPage)
})
const currentPageStart = computed(() => {
  if (!notifications.value.length) return 0
  return (currentPage.value - 1) * notificationsPerPage + 1
})
const currentPageEnd = computed(() =>
  Math.min(currentPage.value * notificationsPerPage, notifications.value.length),
)

function syncUnreadCountBadge() {
  window.dispatchEvent(
    new CustomEvent('notifications:unread-count-changed', {
      detail: { count: unreadCount.value },
    }),
  )
}

function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

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

function formatDateTime(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function attachmentName(value: string | null) {
  if (!value) return ''

  const path = value.split('?')[0] ?? value
  const rawName = decodeURIComponent(path.split('/').pop() ?? value)
  return rawName.replace(/^\d+-/, '')
}

function canOpenAttachment(value: string | null) {
  return Boolean(
    value &&
    (value.startsWith('/uploads/') ||
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('data:image/')),
  )
}

function attachmentHref(value: string) {
  if (value.startsWith('data:image/')) return value
  return resolveNotificationAttachmentUrl(value)
}

function closeAttachmentPreview() {
  if (attachmentPreviewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(attachmentPreviewUrl.value)
  }
  isAttachmentPreviewOpen.value = false
  isLoadingAttachmentPreview.value = false
  attachmentPreviewUrl.value = ''
  attachmentPreviewName.value = ''
  attachmentPreviewType.value = null
  attachmentPreviewError.value = ''
}

async function openAttachmentPreview(value: string) {
  closeAttachmentPreview()
  attachmentPreviewName.value = attachmentName(value) || 'Attachment'
  isAttachmentPreviewOpen.value = true
  isLoadingAttachmentPreview.value = true

  try {
    if (value.startsWith('data:image/')) {
      attachmentPreviewUrl.value = value
      attachmentPreviewType.value = 'image'
      return
    }

    const response = await fetch(attachmentHref(value), { credentials: 'include' })
    if (!response.ok) throw new Error('Unable to open attachment')

    const blob = await response.blob()
    const fileName = attachmentPreviewName.value.toLowerCase()
    const isImage =
      blob.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName)
    const isPdf = blob.type === 'application/pdf' || fileName.endsWith('.pdf')

    if (!isImage && !isPdf) {
      closeAttachmentPreview()
      await downloadAttachment(value)
      return
    }

    attachmentPreviewUrl.value = URL.createObjectURL(blob)
    attachmentPreviewType.value = isPdf ? 'pdf' : 'image'
  } catch (error) {
    attachmentPreviewError.value =
      error instanceof Error ? error.message : 'Unable to open attachment'
  } finally {
    isLoadingAttachmentPreview.value = false
  }
}

function plainNotificationMessage(value: string) {
  return value
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<li[^>]*>/gi, ' ')
    .replace(/<\/(p|div)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formattedNotificationMessage(value: string) {
  return escapeHtml(value.replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ').replace(/\u00a0/g, ' '))
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/&lt;(strong|b)&gt;(.*?)&lt;\/\1&gt;/g, '<strong>$2</strong>')
    .replace(/&lt;(em|i)&gt;(.*?)&lt;\/\1&gt;/g, '<em>$2</em>')
    .replace(/&lt;(strike|s)&gt;(.*?)&lt;\/\1&gt;/g, '<s>$2</s>')
    .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>')
    .replace(/&lt;(ul|ol)&gt;/g, '<$1>')
    .replace(/&lt;\/(ul|ol)&gt;/g, '</$1>')
    .replace(/&lt;li&gt;/g, '<li>')
    .replace(/&lt;\/li&gt;/g, '</li>')
    .replace(/&lt;br\s*\/?&gt;/g, '<br>')
    .replace(/\n/g, '<br>')
}

function notificationDeadline(value: string) {
  return (
    plainNotificationMessage(value).match(/\bDeadline:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\.?/i)?.[1] ??
    ''
  )
}

function formatNotificationDeadline(value: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function notificationFooterNotice(value: string) {
  const message = plainNotificationMessage(value)
  if (message.includes('Please review the milestone details and prepare the required documents.')) {
    return 'Please review the milestone details and prepare the required documents.'
  }

  if (message.includes('Please review your progress and prepare your submission.')) {
    return 'Please review your progress and prepare your submission.'
  }

  if (message.includes('Please complete the required work before the deadline.')) {
    return 'Please review your progress and prepare your submission.'
  }

  return ''
}

function notificationDescription(value: string) {
  return value
    .replace(/\s*Please review the milestone details and prepare the required documents\.?/gi, '')
    .replace(/\s*Please review your progress and prepare your submission\.?/gi, '')
    .replace(/\s*Please complete the required work before the deadline\.?/gi, '')
    .replace(/\s*Deadline:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\.?/gi, '')
    .trim()
}

async function downloadAttachment(value: string) {
  const href = attachmentHref(value)
  const fileName = attachmentName(value) || 'attachment'

  try {
    const link = document.createElement('a')
    link.download = fileName

    if (href.startsWith('data:image/')) {
      link.href = href
    } else {
      const response = await fetch(href, { credentials: 'include' })
      if (!response.ok) throw new Error('Unable to download attachment')

      const blobUrl = URL.createObjectURL(await response.blob())
      link.href = blobUrl
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
    }

    document.body.append(link)
    link.click()
    link.remove()
  } catch {
    window.open(href, '_blank', 'noreferrer')
  }
}

function notificationTone(notification: StudentNotification) {
  const title = notification.title.toLowerCase()

  if (
    ['deadline', 'reminder', 'announcement', 'scholarship', 'urgent', 'important', 'due'].some(
      (keyword) => title.includes(keyword),
    )
  ) {
    return 'deadline'
  }

  if (
    ['document', 'submission', 'evidence', 'attachment', 'upload'].some((keyword) =>
      title.includes(keyword),
    )
  ) {
    return 'document'
  }

  if (['advisor', 'adviser'].some((keyword) => title.includes(keyword))) return 'advisor'
  if (['system', 'maintenance', 'server'].some((keyword) => title.includes(keyword))) {
    return 'system'
  }

  return 'milestone'
}

async function loadNotifications({ silent = false } = {}) {
  if (!silent) {
    isLoading.value = true
    errorMessage.value = ''
  }

  try {
    const nextNotifications = await getMyNotifications()
    notifications.value = nextNotifications
    if (selectedNotification.value) {
      selectedNotification.value =
        nextNotifications.find(
          (notification) =>
            notification.notificationId === selectedNotification.value?.notificationId,
        ) ?? selectedNotification.value
    }
    syncUnreadCountBadge()
  } catch (error) {
    if (!silent) {
      errorMessage.value = error instanceof Error ? error.message : 'Unable to load notifications'
    }
  } finally {
    if (!silent) {
      isLoading.value = false
    }
  }
}

function updateNotificationReadStatus(notificationId: string, readAt = new Date().toISOString()) {
  notifications.value = notifications.value.map((notification) =>
    notification.notificationId === notificationId
      ? { ...notification, isRead: true, readAt }
      : notification,
  )
  syncUnreadCountBadge()
}

async function markOneAsRead(notification: StudentNotification) {
  if (notification.isRead) return

  markingNotificationId.value = notification.notificationId
  errorMessage.value = ''
  updateNotificationReadStatus(notification.notificationId)

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
    syncUnreadCountBadge()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Unable to mark all notifications as read'
  } finally {
    isMarkingAll.value = false
  }
}

function openDetail(notification: StudentNotification) {
  selectedNotification.value = notification
  isDetailOpen.value = true

  if (!notification.isRead) {
    void markOneAsRead(notification)
  }
}

function closeDetail() {
  closeAttachmentPreview()
  isDetailOpen.value = false
  selectedNotification.value = null
}

function refreshNotificationsSilently() {
  void loadNotifications({ silent: true })
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') refreshNotificationsSilently()
}

onMounted(() => {
  void loadNotifications()
  notificationRefreshTimer = window.setInterval(refreshNotificationsSilently, 15_000)
  window.addEventListener('focus', refreshNotificationsSilently)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  closeAttachmentPreview()
  if (notificationRefreshTimer) window.clearInterval(notificationRefreshTimer)
  window.removeEventListener('focus', refreshNotificationsSilently)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

watch(totalPages, (nextTotalPages) => {
  if (currentPage.value > nextTotalPages) {
    currentPage.value = nextTotalPages
  }
})
</script>

<template>
  <div
    class="min-h-screen bg-[#f7f7f7] px-3 pt-3 pb-6 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8"
  >
    <header class="flex items-start justify-between gap-2 sm:flex-wrap sm:gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-bold tracking-tight text-black sm:text-3xl">
          {{ t('studentPortal.notificationTitle') }}
        </h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('studentPortal.notificationDescription') }}
        </p>
      </div>

      <button
        type="button"
        :disabled="isMarkingAll || unreadCount === 0"
        class="inline-flex shrink-0 items-center justify-center gap-1 rounded-md bg-[#8b2a23] px-2 py-1.5 text-[9px] font-medium text-white shadow-sm transition-colors hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60 sm:gap-2 sm:rounded-lg sm:px-4 sm:py-2 sm:text-sm"
        @click="markAllAsRead"
      >
        <svg
          class="size-3.5 sm:size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        {{ t('studentPortal.markAllAsRead') }}
      </button>
    </header>

    <p v-if="errorMessage" class="mt-4 text-sm text-red-600" role="alert">
      {{ errorMessage }}
    </p>

    <section
      class="mt-5 bg-transparent sm:rounded-lg sm:border sm:border-slate-200 sm:bg-white sm:px-5 sm:py-5 sm:shadow-[0_2px_4px_rgba(0,0,0,0.12)]"
    >
      <div v-if="isLoading" class="py-8 text-center text-sm text-slate-500">
        {{ t('studentPortal.loadingNotifications') }}
      </div>

      <div v-else-if="notifications.length === 0" class="py-10 text-center text-sm text-slate-500">
        {{ t('studentPortal.noNotifications') }}
      </div>

      <template v-else>
        <article
          v-for="notification in paginatedNotifications"
          :key="notification.notificationId"
          class="relative mb-3 cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_2px_6px_rgba(15,23,42,0.06)] last:mb-0 hover:bg-slate-50 sm:mb-0 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:border-b sm:bg-transparent sm:px-0 sm:py-4 sm:shadow-none sm:last:border-b-0"
          role="button"
          tabindex="0"
          @click="openDetail(notification)"
          @keydown.enter.prevent="openDetail(notification)"
          @keydown.space.prevent="openDetail(notification)"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="absolute right-3 top-3 size-2 shrink-0 rounded-full sm:static sm:mt-4 sm:size-1.5"
              :class="notification.isRead ? 'bg-transparent' : 'bg-[#8b2a23]'"
              aria-hidden="true"
            ></span>

            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg"
              :class="{
                'bg-[#f8e7e7] text-[#b12a24]': notificationTone(notification) === 'milestone',
                'bg-[#fff4d8] text-[#d09a10]': notificationTone(notification) === 'deadline',
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
                  <path
                    d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z"
                  />
                </template>
                <template v-else>
                  <rect x="5" y="4" width="14" height="16" rx="3" />
                  <path d="m9 12 2 2 4-5" />
                  <path d="M9 3v3M15 3v3" />
                </template>
              </svg>
            </span>

            <div
              class="grid min-w-0 flex-1 grid-cols-1 items-start gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-0"
            >
              <div class="min-w-0">
                <h2
                  class="line-clamp-2 pr-3 text-sm font-semibold leading-snug text-slate-950 sm:truncate sm:pr-0 sm:font-medium"
                >
                  {{ notification.title }}
                </h2>

                <p
                  class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 sm:truncate sm:leading-snug"
                >
                  {{ plainNotificationMessage(notification.message) }}
                </p>
              </div>

              <div
                class="flex w-full shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:w-[12.5rem] sm:justify-end sm:border-0 sm:pt-0"
              >
                <time class="whitespace-nowrap text-xs text-slate-700">
                  {{ formatNotificationTime(notification.sentAt ?? notification.createdAt) }}
                </time>

                <button
                  v-if="!notification.isRead"
                  type="button"
                  :disabled="markingNotificationId === notification.notificationId"
                  class="inline-flex h-7 items-center justify-center whitespace-nowrap rounded-lg border border-[#ead0d0] px-3 text-xs font-semibold text-[#8b2a23] hover:bg-[#f8eeee] disabled:cursor-not-allowed disabled:opacity-60"
                  @click.stop="markOneAsRead(notification)"
                >
                  {{ t('studentPortal.markAsRead') }}
                </button>
              </div>
            </div>
          </div>
        </article>

        <div
          class="flex flex-col gap-3 px-1 pt-2 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-0 sm:pt-4 sm:text-sm"
        >
          <p>
            {{
              t('studentPortal.showingNotifications', {
                start: currentPageStart,
                end: currentPageEnd,
                count: notifications.length,
              })
            }}
          </p>

          <nav
            v-if="totalPages > 1"
            class="flex flex-wrap items-center gap-1"
            :aria-label="t('studentPortal.notificationPages')"
          >
            <button
              v-for="page in pageNumbers"
              :key="page"
              type="button"
              class="flex size-8 items-center justify-center rounded-lg border text-sm font-semibold transition-colors"
              :class="
                page === currentPage
                  ? 'border-[#8b2a23] bg-[#8b2a23] text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-[#d7b2ad] hover:text-[#8b2a23]'
              "
              :aria-current="page === currentPage ? 'page' : undefined"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
          </nav>
        </div>
      </template>
    </section>

    <div
      v-if="isDetailOpen && selectedNotification"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-detail-title"
      @click.self="closeDetail"
    >
      <section
        class="relative w-full max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-xl"
      >
        <button
          type="button"
          class="absolute right-5 top-5 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          :aria-label="t('studentPortal.closeNotificationDetail')"
          @click="closeDetail"
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

        <div class="flex gap-4 px-6 pb-3 pt-5 pr-12">
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f9eeee] text-[#8b2a23]"
            aria-hidden="true"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </span>

          <div class="min-w-0">
            <h2
              id="notification-detail-title"
              class="break-words text-base font-semibold leading-tight text-slate-950"
            >
              {{ selectedNotification.title }}
            </h2>
            <p class="mt-0.5 inline-flex max-w-full items-center gap-1.5 text-xs text-slate-500">
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="M8 2v4M16 2v4M3 10h18" />
                <rect x="3" y="4" width="18" height="18" rx="3" />
              </svg>
              {{ formatDateTime(selectedNotification.sentAt ?? selectedNotification.createdAt) }}
            </p>
          </div>
        </div>

        <div class="px-6 pb-6 pt-0">
          <p class="text-xs font-semibold text-black">{{ t('common.description') }}</p>
          <div
            class="mt-2 break-words text-xs leading-5 text-slate-900 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            v-html="
              formattedNotificationMessage(notificationDescription(selectedNotification.message))
            "
          ></div>

          <div v-if="notificationDeadline(selectedNotification.message)" class="mt-5">
            <p class="text-xs font-semibold text-black">
              {{ t('common.deadline') }}:
              <span class="ml-2 font-medium text-slate-900">
                {{ formatNotificationDeadline(notificationDeadline(selectedNotification.message)) }}
              </span>
            </p>
          </div>

          <div v-if="selectedNotification.attachmentUrl" class="mt-5">
            <p class="text-xs font-semibold text-black">{{ t('notification.attachment') }}</p>
            <div
              v-if="canOpenAttachment(selectedNotification.attachmentUrl)"
              class="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-[#dfcccc] hover:bg-[#fff8f8]"
            >
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-3"
                @click="openAttachmentPreview(selectedNotification.attachmentUrl)"
              >
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                >
                  <svg
                    class="size-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.7"
                    aria-hidden="true"
                  >
                    <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v5h5" />
                    <path d="M9 13h6M9 17h6M9 9h1" />
                  </svg>
                </span>
                <span class="min-w-0 flex-1 truncate text-xs font-medium text-slate-950">
                  {{ attachmentName(selectedNotification.attachmentUrl) }}
                </span>
              </button>
              <button
                type="button"
                class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#dfcccc] hover:text-[#8b2a23]"
                :aria-label="t('studentPortal.downloadAttachment')"
                @click="downloadAttachment(selectedNotification.attachmentUrl)"
              >
                <svg
                  class="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  aria-hidden="true"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </button>
            </div>
            <div
              v-else
              class="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <span
                class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
              >
                <svg
                  class="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  aria-hidden="true"
                >
                  <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v5h5" />
                  <path d="M9 13h6M9 17h6M9 9h1" />
                </svg>
              </span>
              <span class="min-w-0 flex-1 truncate text-xs font-medium text-slate-950">
                {{ attachmentName(selectedNotification.attachmentUrl) }}
              </span>
            </div>
          </div>

          <p
            v-if="notificationFooterNotice(selectedNotification.message)"
            class="mt-5 text-xs font-semibold leading-5 text-red-600"
          >
            {{ notificationFooterNotice(selectedNotification.message) }}
          </p>
        </div>
      </section>
    </div>

    <div
      v-if="isAttachmentPreviewOpen"
      class="fixed inset-0 z-[60] flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="attachment-preview-title"
    >
      <header class="flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-sm">
        <h2
          id="attachment-preview-title"
          class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950"
        >
          {{ attachmentPreviewName }}
        </h2>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          :aria-label="t('studentPortal.closeAttachmentPreview')"
          @click="closeAttachmentPreview"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          {{ t('notification.back') }}
        </button>
      </header>

      <div class="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
        <p v-if="isLoadingAttachmentPreview" class="text-sm font-medium text-white">
          {{ t('notification.loadingAttachment') }}
        </p>
        <p
          v-else-if="attachmentPreviewError"
          class="rounded-lg bg-white px-4 py-3 text-sm text-red-600"
        >
          {{ attachmentPreviewError }}
        </p>
        <img
          v-else-if="attachmentPreviewType === 'image'"
          :src="attachmentPreviewUrl"
          :alt="attachmentPreviewName"
          class="max-h-full max-w-full rounded-lg bg-white object-contain shadow-xl"
        />
        <iframe
          v-else-if="attachmentPreviewType === 'pdf'"
          :src="attachmentPreviewUrl"
          :title="attachmentPreviewName"
          class="h-full w-full max-w-5xl rounded-lg bg-white shadow-xl"
        ></iframe>
      </div>
    </div>
  </div>
</template>
