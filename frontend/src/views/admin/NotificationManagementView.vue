<script setup lang="ts">
import { computed, ref, useTemplateRef, onBeforeUnmount, onMounted } from 'vue'

import {
  createNotification,
  getNotifications,
  resolveNotificationAttachmentUrl,
  uploadNotificationAttachment,
} from '@/services/notifications.api'
import type { Notification, NotificationInput, NotificationTargetAudience } from '@/types/notification'

type AudienceFilter = NotificationTargetAudience | 'all'

const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isPanelOpen = ref(false)
const isDetailOpen = ref(false)
const selectedNotification = ref<Notification | null>(null)
const selectedFilter = ref<AudienceFilter>('all')
const isFilterOpen = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const formError = ref('')
const title = ref('')
const message = ref('')
const targetAudience = ref<NotificationTargetAudience>('All Students')
const sendEmail = ref(false)
const attachmentFile = ref<File | null>(null)
const attachmentInput = useTemplateRef<HTMLInputElement>('attachmentInput')
let toastTimer: ReturnType<typeof window.setTimeout> | undefined

const audienceOptions: { label: string; value: NotificationTargetAudience }[] = [
  { label: 'All Students', value: 'All Students' },
  { label: 'Ph.D.', value: 'Doctoral Students' },
  { label: 'Master', value: 'Master Students' },
]

const filterOptions: { label: string; value: AudienceFilter }[] = [
  { label: 'All Program', value: 'all' },
  { label: 'Ph.D.', value: 'Doctoral Students' },
  { label: 'Master', value: 'Master Students' },
]

const selectedFilterLabel = computed(
  () => filterOptions.find((option) => option.value === selectedFilter.value)?.label ?? 'All Program',
)

const messageLength = computed(() => message.value.length)
const toastMessage = computed(() => errorMessage.value || successMessage.value)

function showToast(text: string, type: 'success' | 'error' = 'success') {
  successMessage.value = type === 'success' ? text : ''
  errorMessage.value = type === 'error' ? text : ''
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    successMessage.value = ''
    errorMessage.value = ''
  }, 5000)
}

function audienceLabel(value: NotificationTargetAudience) {
  if (value === 'Doctoral Students') return 'Ph.D.'
  if (value === 'Master Students') return 'Master'
  return 'All Programs'
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

function selectFilter(value: AudienceFilter) {
  selectedFilter.value = value
  isFilterOpen.value = false
  void loadNotifications()
}

function closeDropdown() {
  isFilterOpen.value = false
}

async function loadNotifications() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    notifications.value = await getNotifications(
      selectedFilter.value === 'all' ? undefined : selectedFilter.value,
    )
  } catch (error) {
    notifications.value = []
    showToast(error instanceof Error ? error.message : 'Unable to load notifications', 'error')
  } finally {
    isLoading.value = false
  }
}

function openAddPanel() {
  resetForm()
  isPanelOpen.value = true
}

function closeAddPanel() {
  if (isSubmitting.value) return
  isPanelOpen.value = false
  formError.value = ''
}

function resetForm() {
  title.value = ''
  message.value = ''
  targetAudience.value = 'All Students'
  sendEmail.value = false
  attachmentFile.value = null
  formError.value = ''
  if (attachmentInput.value) attachmentInput.value.value = ''
}

function chooseAttachment() {
  attachmentInput.value?.click()
}

function updateAttachment(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  if (file && file.size > 10 * 1024 * 1024) {
    formError.value = 'Attachment must not exceed 10 MB'
    input.value = ''
    attachmentFile.value = null
    return
  }

  formError.value = ''
  attachmentFile.value = file
}

async function submitNotification() {
  const trimmedTitle = title.value.trim()
  const trimmedMessage = message.value.trim()

  if (!trimmedTitle) {
    formError.value = 'Title is required'
    return
  }

  if (!trimmedMessage) {
    formError.value = 'Description is required'
    return
  }

  if (message.value.length > 5000) {
    formError.value = 'Description must not exceed 5000 characters'
    return
  }

  isSubmitting.value = true
  formError.value = ''

  try {
    const uploadedAttachment = attachmentFile.value
      ? await uploadNotificationAttachment(attachmentFile.value)
      : null
    const input: NotificationInput = {
      title: trimmedTitle,
      message: trimmedMessage,
      targetAudience: targetAudience.value,
      attachmentUrl: uploadedAttachment?.url ?? null,
      sendEmail: sendEmail.value,
    }

    await createNotification(input)
    isPanelOpen.value = false
    resetForm()
    showToast('Notification sent successfully')
    await loadNotifications()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Unable to send notification'
  } finally {
    isSubmitting.value = false
  }
}

function openDetail(notification: Notification) {
  selectedNotification.value = notification
  isDetailOpen.value = true
}

function closeDetail() {
  isDetailOpen.value = false
  selectedNotification.value = null
}

onMounted(() => {
  void loadNotifications()
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
  if (toastTimer) window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold tracking-tight text-black">Notification Management</h1>
        <p class="mt-1 text-sm text-slate-500">
          View and manage all notifications sent to students
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#7a211c]"
        @click="openAddPanel"
      >
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        Add Notifications
      </button>
    </header>

    <section
      class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 class="text-base font-semibold text-slate-950">Notification History</h2>
          <p class="mt-2 text-xs text-slate-500">
            {{ notifications.length }} Notification History
          </p>
        </div>

        <div class="relative" @click.stop>
          <button
            type="button"
            class="flex h-9 min-w-32 items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 text-left text-xs shadow-sm outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
            :class="{ 'border-[#8a2b25]': isFilterOpen }"
            :aria-expanded="isFilterOpen"
            @click="isFilterOpen = !isFilterOpen"
          >
            <span class="whitespace-nowrap">{{ selectedFilterLabel }}</span>
            <svg
              class="size-4 shrink-0 text-slate-500 transition-transform"
              :class="{ 'rotate-180': isFilterOpen }"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              aria-hidden="true"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>

          <div
            v-if="isFilterOpen"
            class="absolute right-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-slate-100 bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
          >
            <button
              v-for="option in filterOptions"
              :key="option.value"
              type="button"
              class="flex w-full items-center justify-between gap-4 whitespace-nowrap rounded-md px-3 py-2 text-left text-xs hover:bg-[#f8eeee]"
              :class="{ 'bg-[#f8eeee]': selectedFilter === option.value }"
              @click="selectFilter(option.value)"
            >
              {{ option.label }}
              <svg
                v-if="selectedFilter === option.value"
                class="size-4 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-5 overflow-x-auto">
        <table class="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-xs text-slate-950">
              <th class="px-1 py-3 font-semibold">Title</th>
              <th class="px-1 py-3 text-center font-semibold">Program</th>
              <th class="px-1 py-3 text-center font-semibold">Scheduled Date</th>
              <th class="px-1 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="4" class="px-1 py-8 text-center text-sm text-slate-500">
                Loading notifications...
              </td>
            </tr>
            <tr v-else-if="!notifications.length">
              <td colspan="4" class="px-1 py-8 text-center text-sm text-slate-500">
                No notifications found for {{ selectedFilterLabel }}.
              </td>
            </tr>
            <tr
              v-for="notification in notifications"
              v-else
              :key="notification.notificationId"
              class="border-b border-slate-100 last:border-0"
            >
              <td class="max-w-[320px] px-1 py-4">
                <p class="truncate font-medium text-slate-950">{{ notification.title }}</p>
                <p class="mt-1 truncate text-xs text-slate-500">{{ notification.message }}</p>
              </td>
              <td class="px-1 py-4 text-center">
                <span class="inline-flex min-w-24 justify-center rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700">
                  {{ audienceLabel(notification.targetAudience) }}
                </span>
              </td>
              <td class="px-1 py-4 text-center text-xs text-slate-700">
                {{ formatDateTime(notification.sentAt ?? notification.createdAt) }}
              </td>
              <td class="px-1 py-4 text-center">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-[#8b2a23]"
                  @click="openDetail(notification)"
                >
                  <svg
                    class="size-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  View
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div
      v-if="isPanelOpen"
      class="fixed inset-0 z-40 bg-black/15"
      aria-hidden="true"
      @click="closeAddPanel"
    ></div>

    <aside
      v-if="isPanelOpen"
      class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white px-6 py-7 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-notification-title"
    >
      <div class="min-h-0 flex-1 overflow-y-auto pr-1">
        <h2 id="send-notification-title" class="text-lg font-semibold text-slate-950">
          Send Notification
        </h2>
        <p class="mt-2 text-sm text-slate-500">Create a new notification to send to students</p>

        <form class="mt-5" @submit.prevent="submitNotification">
          <fieldset :disabled="isSubmitting" class="space-y-5">
            <section>
              <h3 class="text-lg font-semibold text-slate-950">Basic Information</h3>

              <label class="mt-2 block text-sm font-medium text-slate-900" for="notification-title">
                Title <span class="text-[#8b2a23]">*</span>
              </label>
              <input
                id="notification-title"
                v-model="title"
                type="text"
                class="mt-1 h-10 w-full rounded-md border border-slate-200 px-4 text-sm outline-none focus:border-[#8a2b25]"
                placeholder="Enter Notification title"
              />

              <label class="mt-4 block text-sm font-medium text-slate-900" for="notification-message">
                Description <span class="text-[#8b2a23]">*</span>
              </label>
              <div class="mt-1 overflow-hidden rounded-md border border-slate-200">
                <div class="flex h-8 items-center gap-4 border-b border-slate-100 px-3 text-xs font-semibold text-slate-500">
                  <span>B</span>
                  <span class="italic">I</span>
                  <span class="underline">U</span>
                  <span>≡</span>
                  <span>≣</span>
                  <span>↗</span>
                </div>
                <textarea
                  id="notification-message"
                  v-model="message"
                  maxlength="5000"
                  class="h-32 w-full resize-none px-4 py-3 text-sm outline-none"
                  placeholder="Type your description here..."
                ></textarea>
                <p class="px-3 pb-2 text-right text-xs text-slate-500">{{ messageLength }}/5000</p>
              </div>
            </section>

            <section class="border-t border-slate-200 pt-5">
              <h3 class="text-lg font-semibold text-slate-950">Target Audience</h3>
              <div class="mt-3 space-y-2">
                <label
                  v-for="option in audienceOptions"
                  :key="option.value"
                  class="flex w-fit items-center gap-3 text-sm text-slate-900"
                >
                  <input
                    v-model="targetAudience"
                    type="radio"
                    :value="option.value"
                    class="size-4 accent-[#8b2a23]"
                  />
                  {{ option.label }}
                </label>
              </div>
            </section>

            <section class="border-t border-slate-200 pt-5">
              <h3 class="text-lg font-semibold text-slate-950">Attachment (Optional)</h3>
              <input
                ref="attachmentInput"
                type="file"
                class="hidden"
                @change="updateAttachment"
              />
              <button
                type="button"
                class="mt-3 rounded-md bg-[#F4EAEA] px-4 py-2 text-sm font-semibold text-[#8b2a23]"
                @click="chooseAttachment"
              >
                Upload File
              </button>
              <p class="mt-3 text-xs text-slate-500">Max file size 10 MB</p>
              <p v-if="attachmentFile" class="mt-2 break-words text-xs text-slate-700">
                {{ attachmentFile.name }}
              </p>

              <label class="mt-4 flex w-fit items-center gap-3 text-sm text-slate-900">
                <input v-model="sendEmail" type="checkbox" class="size-4 accent-[#8b2a23]" />
                Send via email
              </label>
            </section>
          </fieldset>

          <p v-if="formError" class="mt-4 text-sm text-red-600" role="alert">
            {{ formError }}
          </p>
        </form>
      </div>

      <div class="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5">
        <button
          type="button"
          class="h-10 rounded-md border border-[#8b2a23] px-6 text-sm font-semibold text-[#8b2a23] disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          :disabled="isSubmitting"
          @click="closeAddPanel"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-2 rounded-md bg-[#8b2a23] px-6 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="isSubmitting"
          @click="submitNotification"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            <path d="M22 2 11 13" />
          </svg>
          {{ isSubmitting ? 'Sending...' : 'Send' }}
        </button>
      </div>
    </aside>

    <div
      v-if="isDetailOpen && selectedNotification"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-detail-title"
      @click.self="closeDetail"
    >
      <section class="relative w-full max-w-[480px] rounded-lg bg-white px-6 py-8 shadow-xl">
        <button
          type="button"
          class="absolute right-4 top-4 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close notification detail"
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

        <div class="pr-8">
          <h2 id="notification-detail-title" class="text-xl font-semibold leading-tight text-slate-950">
            {{ selectedNotification.title }}
          </h2>
          <p class="mt-1 text-xs text-slate-500">
            {{ formatDateTime(selectedNotification.sentAt ?? selectedNotification.createdAt) }}
          </p>
        </div>

        <div class="mt-5 space-y-5 text-sm leading-6 text-slate-900">
          <div class="grid gap-2 sm:grid-cols-[auto_1fr]">
            <p class="font-semibold">Description :</p>
            <p class="whitespace-pre-line break-words">
              {{ selectedNotification.message }}
            </p>
          </div>

          <div v-if="selectedNotification.attachmentUrl" class="grid gap-2 sm:grid-cols-[auto_1fr]">
            <p class="font-semibold">Attachment :</p>
            <div>
              <a
                v-if="canOpenAttachment(selectedNotification.attachmentUrl)"
                :href="attachmentHref(selectedNotification.attachmentUrl)"
                target="_blank"
                rel="noreferrer"
                class="break-words text-black underline-offset-2 hover:underline"
              >
                {{ attachmentName(selectedNotification.attachmentUrl) }}
              </a>
              <span v-else class="break-words">
                {{ attachmentName(selectedNotification.attachmentUrl) }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div
      v-if="toastMessage"
      class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border bg-white px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
      :class="errorMessage ? 'border-red-200 text-red-600' : 'border-[#8b2a23]/30 text-[#8b2a23]'"
      role="status"
      aria-live="polite"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>
