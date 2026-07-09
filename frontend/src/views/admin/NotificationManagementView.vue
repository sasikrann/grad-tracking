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
const messageEditor = useTemplateRef<HTMLDivElement>('messageEditor')
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

const messageLength = computed(() => plainNotificationMessage(message.value).length)
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

function plainNotificationMessage(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<li[^>]*>/gi, ' ')
    .replace(/<\/(p|div)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/<u>(.*?)<\/u>/g, '$1')
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
  return escapeHtml(value)
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
  return plainNotificationMessage(value).match(/\bDeadline:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\.?/i)?.[1] ?? ''
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

function sanitizeEditorHtml(html: string) {
  return html
    .replace(/<(\/?)b(\s[^>]*)?>/gi, '<$1strong>')
    .replace(/<(\/?)i(\s[^>]*)?>/gi, '<$1em>')
    .replace(/<(\/?)(strike|s)(\s[^>]*)?>/gi, '<$1s>')
    .replace(/<(\/?)(strong|em|u|s|ul|ol|li)(\s[^>]*)?>/gi, '<$1$2>')
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/<\/(div|p)>/gi, '<br>')
    .replace(/<(div|p)(\s[^>]*)?>/gi, '')
    .replace(/<(?!\/?(strong|em|u|s|ul|ol|li)\b|br\b)[^>]*>/gi, '')
    .replace(/(<br>){3,}/gi, '<br><br>')
    .replace(/^(<br>)+|(<br>)+$/gi, '')
}

function syncMessageFromEditor() {
  message.value = sanitizeEditorHtml(messageEditor.value?.innerHTML ?? '')
}

function applyMessageFormat(
  format: 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat',
) {
  const editor = messageEditor.value
  if (!editor) return

  editor.focus()
  document.execCommand(format)
  syncMessageFromEditor()
}

function pasteMessageText(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text/plain') ?? ''
  document.execCommand('insertText', false, text)
  syncMessageFromEditor()
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
      const response = await fetch(href)
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
  if (messageEditor.value) messageEditor.value.innerHTML = ''
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
  syncMessageFromEditor()
  const trimmedTitle = title.value.trim()
  const trimmedMessage = sanitizeEditorHtml(message.value.trim())
  const trimmedPlainMessage = plainNotificationMessage(trimmedMessage)

  if (!trimmedTitle) {
    formError.value = 'Title is required'
    return
  }

  if (!trimmedPlainMessage) {
    formError.value = 'Description is required'
    return
  }

  if (trimmedPlainMessage.length > 5000) {
    formError.value = 'Description must not exceed 5000 characters'
    return
  }

  isSubmitting.value = true
  formError.value = ''

  try {
    const uploadedAttachment = attachmentFile.value
      ? await uploadNotificationAttachment(attachmentFile.value)
      : null

    if (attachmentFile.value && !uploadedAttachment?.url) {
      throw new Error('Attachment upload did not return a file URL')
    }

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
        Add Notification
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
                <p class="mt-1 truncate text-xs text-slate-500">
                  {{ plainNotificationMessage(notification.message) }}
                </p>
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
                  class="inline-flex items-center gap-1.5 rounded-md px-1 py-2 text-xs font-semibold text-sky-500 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                <div class="flex h-8 items-center gap-1.5 border-b border-slate-100 px-3 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Bold selected text"
                    @mousedown.prevent="applyMessageFormat('bold')"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded italic hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Italic selected text"
                    @mousedown.prevent="applyMessageFormat('italic')"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded underline hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Underline selected text"
                    @mousedown.prevent="applyMessageFormat('underline')"
                  >
                    U
                  </button>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded line-through hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Strike through selected text"
                    @mousedown.prevent="applyMessageFormat('strikeThrough')"
                  >
                    S
                  </button>
                  <span class="mx-1 h-4 w-px bg-slate-200" aria-hidden="true"></span>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Bullet list"
                    @mousedown.prevent="applyMessageFormat('insertUnorderedList')"
                  >
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      aria-hidden="true"
                    >
                      <path d="M8 6h13M8 12h13M8 18h13" />
                      <path d="M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Numbered list"
                    @mousedown.prevent="applyMessageFormat('insertOrderedList')"
                  >
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      aria-hidden="true"
                    >
                      <path d="M10 6h11M10 12h11M10 18h11" />
                      <path d="M4 6h1v4M3.5 10h2M3.5 14h2c0-1 .5-2 2-2H4M4 18h1.5a1 1 0 0 1 0 2H4" />
                    </svg>
                  </button>
                  <span class="mx-1 h-4 w-px bg-slate-200" aria-hidden="true"></span>
                  <button
                    type="button"
                    class="flex size-6 items-center justify-center rounded hover:bg-slate-100 hover:text-[#8b2a23]"
                    aria-label="Clear formatting"
                    @mousedown.prevent="applyMessageFormat('removeFormat')"
                  >
                    Tx
                  </button>
                </div>
                <div
                  id="notification-message"
                  ref="messageEditor"
                  class="h-32 w-full overflow-y-auto px-4 py-3 text-sm outline-none empty:before:text-slate-400 empty:before:content-['Type_your_description_here...']"
                  contenteditable="true"
                  role="textbox"
                  aria-multiline="true"
                  @input="syncMessageFromEditor"
                  @paste.prevent="pasteMessageText"
                ></div>
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
      <section class="relative w-full max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-xl">
        <button
          type="button"
          class="absolute right-5 top-5 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
            <h2 id="notification-detail-title" class="break-words text-base font-semibold leading-tight text-slate-950">
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
          <p class="text-xs font-semibold text-black">Description</p>
          <div
            class="mt-2 break-words text-xs leading-5 text-slate-900 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            v-html="formattedNotificationMessage(notificationDescription(selectedNotification.message))"
          ></div>

          <div v-if="notificationDeadline(selectedNotification.message)" class="mt-5">
            <p class="text-xs font-semibold text-black">
              Deadline:
              <span class="ml-2 font-medium text-slate-900">
                {{ formatNotificationDeadline(notificationDeadline(selectedNotification.message)) }}
              </span>
            </p>
          </div>

          <div v-if="selectedNotification.attachmentUrl" class="mt-5">
            <p class="text-xs font-semibold text-black">Attachment</p>
              <div
                v-if="canOpenAttachment(selectedNotification.attachmentUrl)"
                class="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-[#dfcccc] hover:bg-[#fff8f8]"
              >
                <a
                  :href="attachmentHref(selectedNotification.attachmentUrl)"
                  target="_blank"
                  rel="noreferrer"
                  class="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600">
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
                </a>
                <button
                  type="button"
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#dfcccc] hover:text-[#8b2a23]"
                  aria-label="Download attachment"
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
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600">
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
