<script setup lang="ts">
import { computed, ref, useTemplateRef, onBeforeUnmount, onMounted, watch } from 'vue'

import {
  createNotification,
  getNotifications,
  resolveNotificationAttachmentUrl,
  uploadNotificationAttachment,
} from '@/services/notifications.api'
import type {
  Notification,
  NotificationInput,
  NotificationTargetAudience,
} from '@/types/notification'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { getStudents } from '@/services/students.api'
import type { Student } from '@/types/student'
const { isThai, t } = useLanguage()

type AudienceFilter = NotificationTargetAudience | 'all'
type TargetDropdown = 'program' | 'plan' | 'year'

const notifications = ref<Notification[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const isPanelOpen = ref(false)
const isDetailOpen = ref(false)
const selectedNotification = ref<Notification | null>(null)
const isAttachmentPreviewOpen = ref(false)
const isLoadingAttachmentPreview = ref(false)
const attachmentPreviewUrl = ref('')
const attachmentPreviewName = ref('')
const attachmentPreviewType = ref<'image' | 'pdf' | null>(null)
const attachmentPreviewError = ref('')
const selectedFilter = ref<AudienceFilter>('all')
const isFilterOpen = ref(false)
const currentPage = ref(1)
const notificationsPerPage = 10
const errorMessage = ref('')
const successMessage = ref('')
const formError = ref('')
const title = ref('')
const message = ref('')
const targetAudience = ref<NotificationTargetAudience>('All Students')
const targetProgram = ref('all')
const targetPlan = ref('all')
const targetAcademicYear = ref('all')
const openTargetDropdown = ref<TargetDropdown | null>(null)
const audienceStudents = ref<Student[]>([])
const sendEmail = ref(false)
const attachmentFile = ref<File | null>(null)
const attachmentInput = useTemplateRef<HTMLInputElement>('attachmentInput')
let bodyOverflowBeforePanelOpen = ''
const messageEditor = useTemplateRef<HTMLDivElement>('messageEditor')
let toastTimer: ReturnType<typeof window.setTimeout> | undefined

const audienceOptions = computed<{ label: string; value: NotificationTargetAudience }[]>(() => [
  { label: t('notification.allStudents'), value: 'All Students' },
  { label: t('common.doctoral'), value: 'Doctoral Students' },
  { label: t('common.master'), value: 'Master Students' },
])

const selectedDegree = computed(() => {
  if (targetAudience.value === 'Doctoral Students') return 'Ph. D.'
  if (targetAudience.value === 'Master Students') return 'Master'
  return null
})

const studentsForSelectedDegree = computed(() =>
  selectedDegree.value
    ? audienceStudents.value.filter((student) => student.degree === selectedDegree.value)
    : [],
)

const targetProgramOptions = computed(() =>
  Array.from(new Set(studentsForSelectedDegree.value.map((student) => student.program)))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right)),
)

const targetPlanOptions = computed(() => {
  const allowedPlans = selectedDegree.value === 'Ph. D.' ? ['2.1', '2.2'] : ['A1', 'A2', 'B']
  const availablePlans = new Set(
    studentsForSelectedDegree.value.map((student) => student.educationPlan),
  )
  return allowedPlans.filter((plan) => availablePlans.has(plan))
})

const targetAcademicYearOptions = computed(() =>
  Array.from(
    new Set(studentsForSelectedDegree.value.map((student) => student.enrollmentAcademicYear)),
  ).sort((left, right) => Number(right) - Number(left)),
)

const selectedTargetProgramLabel = computed(() =>
  targetProgram.value === 'all' ? t('student.allProgram') : targetProgram.value,
)

function targetPlanLabel(plan: string) {
  const planTranslationKeys = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  } as const

  return planTranslationKeys[plan as keyof typeof planTranslationKeys]
    ? t(planTranslationKeys[plan as keyof typeof planTranslationKeys])
    : plan
}

const selectedTargetPlanLabel = computed(() =>
  targetPlan.value === 'all' ? t('student.allPlan') : targetPlanLabel(targetPlan.value),
)
const selectedTargetAcademicYearLabel = computed(() =>
  targetAcademicYear.value === 'all' ? t('student.allYear') : targetAcademicYear.value,
)
const mobileTargetProgramLabel = computed(() =>
  isThai.value && targetProgram.value === 'all' ? 'หลักสูตร' : selectedTargetProgramLabel.value,
)
const mobileTargetPlanLabel = computed(() =>
  isThai.value && targetPlan.value === 'all' ? 'แผน' : selectedTargetPlanLabel.value,
)
const mobileTargetAcademicYearLabel = computed(() =>
  isThai.value && targetAcademicYear.value === 'all' ? 'ปี' : selectedTargetAcademicYearLabel.value,
)

function toggleTargetDropdown(dropdown: TargetDropdown) {
  openTargetDropdown.value = openTargetDropdown.value === dropdown ? null : dropdown
}

function selectTargetDropdown(dropdown: TargetDropdown, value: string) {
  if (dropdown === 'program') targetProgram.value = value
  if (dropdown === 'plan') targetPlan.value = value
  if (dropdown === 'year') targetAcademicYear.value = value
  openTargetDropdown.value = null
}

const filterOptions = computed<{ label: string; value: AudienceFilter }[]>(() => [
  { label: t('notification.allProgram'), value: 'all' },
  { label: t('common.doctoral'), value: 'Doctoral Students' },
  { label: t('common.master'), value: 'Master Students' },
])

const selectedFilterLabel = computed(
  () =>
    filterOptions.value.find((option) => option.value === selectedFilter.value)?.label ??
    t('notification.allProgram'),
)

const messageLength = computed(() => plainNotificationMessage(message.value).length)
const toastMessage = computed(() => errorMessage.value || successMessage.value)
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
const currentPageStart = computed(() =>
  notifications.value.length ? (currentPage.value - 1) * notificationsPerPage + 1 : 0,
)
const currentPageEnd = computed(() =>
  Math.min(currentPage.value * notificationsPerPage, notifications.value.length),
)

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
  return t('notification.allProgram')
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(isThai.value ? 'th-TH' : 'en-GB', {
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
  attachmentPreviewName.value = attachmentName(value) || t('notification.attachment')
  isAttachmentPreviewOpen.value = true
  isLoadingAttachmentPreview.value = true

  try {
    if (value.startsWith('data:image/')) {
      attachmentPreviewUrl.value = value
      attachmentPreviewType.value = 'image'
      return
    }

    const response = await fetch(attachmentHref(value), { credentials: 'include' })
    if (!response.ok) throw new Error(t('notification.unableOpenAttachment'))

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
      error instanceof Error ? error.message : t('notification.unableOpenAttachment')
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

  return new Intl.DateTimeFormat(isThai.value ? 'th-TH' : 'en-GB', {
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
    .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
    .replace(/\u00a0/g, ' ')
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
  format:
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikeThrough'
    | 'insertUnorderedList'
    | 'insertOrderedList'
    | 'removeFormat',
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

function selectFilter(value: AudienceFilter) {
  selectedFilter.value = value
  currentPage.value = 1
  isFilterOpen.value = false
  void loadNotifications()
}

function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
}

function closeDropdown() {
  isFilterOpen.value = false
  openTargetDropdown.value = null
}

async function loadNotifications({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  if (!silent) errorMessage.value = ''

  try {
    notifications.value = await getNotifications(
      selectedFilter.value === 'all' ? undefined : selectedFilter.value,
    )
    currentPage.value = Math.min(currentPage.value, totalPages.value)
  } catch (error) {
    notifications.value = []
    showToast(
      isThai.value && error instanceof Error
        ? t('toast.notificationsLoadFailed')
        : error instanceof Error
          ? error.message
          : t('toast.notificationsLoadFailed'),
      'error',
    )
  } finally {
    if (!silent) isLoading.value = false
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
  targetProgram.value = 'all'
  targetPlan.value = 'all'
  targetAcademicYear.value = 'all'
  sendEmail.value = false
  attachmentFile.value = null
  formError.value = ''
  if (attachmentInput.value) attachmentInput.value.value = ''
  if (messageEditor.value) messageEditor.value.innerHTML = ''
}

function chooseAttachment() {
  attachmentInput.value?.click()
}

function removeAttachment() {
  attachmentFile.value = null
  formError.value = ''
  if (attachmentInput.value) attachmentInput.value.value = ''
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
    showToast(t('toast.notificationSent'))
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
  closeAttachmentPreview()
  isDetailOpen.value = false
  selectedNotification.value = null
}

onMounted(() => {
  void loadNotifications()
  void getStudents()
    .then((students) => {
      audienceStudents.value = students
    })
    .catch(() => {
      audienceStudents.value = []
    })
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  if (isPanelOpen.value) document.body.style.overflow = bodyOverflowBeforePanelOpen
  closeAttachmentPreview()
  document.removeEventListener('click', closeDropdown)
  if (toastTimer) window.clearTimeout(toastTimer)
})

watch(isPanelOpen, (isOpen) => {
  if (isOpen) {
    bodyOverflowBeforePanelOpen = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = bodyOverflowBeforePanelOpen
})

watch(targetAudience, () => {
  targetProgram.value = 'all'
  targetPlan.value = 'all'
  targetAcademicYear.value = 'all'
  openTargetDropdown.value = null
})

useAutoRefresh(() => loadNotifications({ silent: true }), {
  canRefresh: () => !isPanelOpen.value && !isSubmitting.value,
})
</script>

<template>
  <div
    class="min-h-screen bg-[#f7f7f7] px-4 pt-3 pb-6 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8"
  >
    <header class="flex items-start justify-between gap-3 sm:gap-4">
      <div class="min-w-0">
        <h1 class="text-xl font-bold tracking-tight text-black sm:text-3xl">
          {{ t('notification.pageTitle') }}
        </h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('notification.pageDescription') }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#7a211c] sm:gap-2 sm:px-4 sm:text-sm"
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
        {{ t('notification.add') }}
      </button>
    </header>

    <section
      class="mt-5 rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    >
      <div class="flex items-start justify-between gap-3 sm:gap-4">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-slate-950">{{ t('notification.history') }}</h2>
          <p class="mt-2 text-xs text-slate-500">
            {{ t('notification.historyCount', { count: notifications.length }) }}
          </p>
        </div>

        <div class="relative shrink-0" @click.stop>
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

      <div class="mt-5 space-y-3 sm:hidden">
        <p v-if="isLoading" class="py-8 text-center text-sm text-slate-500">
          Loading notifications...
        </p>

        <p v-else-if="!notifications.length" class="py-8 text-center text-sm text-slate-500">
          {{ t('notification.noHistoryFor', { filter: selectedFilterLabel }) }}
        </p>

        <article
          v-for="notification in paginatedNotifications"
          v-else
          :key="notification.notificationId"
          class="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="break-words text-sm font-semibold leading-snug text-slate-950">
                {{ notification.title }}
              </h3>
              <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {{ plainNotificationMessage(notification.message) }}
              </p>
            </div>

            <span
              class="inline-flex shrink-0 items-center justify-center rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700"
            >
              {{ audienceLabel(notification.targetAudience) }}
            </span>
          </div>

          <div class="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span class="inline-flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500">
              <svg
                class="size-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>
              <span class="truncate">
                {{ formatDateTime(notification.sentAt ?? notification.createdAt) }}
              </span>
            </span>

            <button
              type="button"
              class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-sky-200 px-2.5 py-1.5 text-xs font-semibold text-sky-500 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
              {{ t('common.view') }}
            </button>
          </div>
        </article>
      </div>

      <div class="mt-5 hidden overflow-x-auto sm:block">
        <table class="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-100 text-xs text-slate-950">
              <th class="px-1 py-3 font-semibold">{{ t('common.title') }}</th>
              <th class="px-1 py-3 text-center font-semibold">{{ t('common.program') }}</th>
              <th class="px-1 py-3 text-center font-semibold">{{ t('common.scheduledDate') }}</th>
              <th class="px-1 py-3 text-center font-semibold">{{ t('common.actions') }}</th>
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
                {{ t('notification.noHistoryFor', { filter: selectedFilterLabel }) }}
              </td>
            </tr>
            <tr
              v-for="notification in paginatedNotifications"
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
                <span
                  class="inline-flex min-w-24 justify-center rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700"
                >
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
                  {{ t('common.view') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="!isLoading && notifications.length"
        class="mt-4 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-sm"
      >
        <p>
          {{
            t('notification.showingCount', {
              start: currentPageStart,
              end: currentPageEnd,
              count: notifications.length,
            })
          }}
        </p>

        <nav
          v-if="totalPages > 1"
          class="flex flex-wrap items-center gap-1"
          :aria-label="t('notification.pagesLabel')"
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
    </section>

    <div
      v-if="isPanelOpen"
      class="fixed inset-0 z-40 bg-black/35 sm:bg-black/15"
      aria-hidden="true"
      @click="closeAddPanel"
    ></div>

    <aside
      v-if="isPanelOpen"
      class="fixed inset-3 z-50 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-2xl bg-white px-4 py-5 shadow-2xl sm:inset-y-4 sm:left-auto sm:right-4 sm:max-h-[calc(100dvh-2rem)] sm:w-[34rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-[18px] sm:px-6 sm:py-7"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-notification-title"
    >
      <div class="min-h-0 flex-1 overflow-y-auto pr-1">
        <h2 id="send-notification-title" class="text-base font-semibold text-slate-950 sm:text-lg">
          {{ t('notification.send') }}
        </h2>
        <p class="mt-2 text-sm text-slate-500">{{ t('notification.createDescription') }}</p>

        <form class="mt-5" @submit.prevent="submitNotification">
          <fieldset :disabled="isSubmitting" class="space-y-5">
            <section>
              <h3 class="text-base font-semibold text-slate-950 sm:text-lg">
                {{ t('notification.basicInformation') }}
              </h3>

              <label class="mt-2 block text-sm font-medium text-slate-900" for="notification-title">
                {{ t('common.title') }} <span class="text-[#8b2a23]">*</span>
              </label>
              <input
                id="notification-title"
                v-model="title"
                type="text"
                class="mt-1 h-10 w-full rounded-md border border-slate-200 px-4 text-sm outline-none focus:border-[#8a2b25]"
                :placeholder="t('notification.enterTitle')"
              />

              <label
                class="mt-4 block text-sm font-medium text-slate-900"
                for="notification-message"
              >
                {{ t('common.description') }} <span class="text-[#8b2a23]">*</span>
              </label>
              <div class="mt-1 overflow-hidden rounded-md border border-slate-200">
                <div
                  class="flex h-8 items-center gap-1.5 border-b border-slate-100 px-3 text-xs font-semibold text-slate-600"
                >
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
                      <path
                        d="M4 6h1v4M3.5 10h2M3.5 14h2c0-1 .5-2 2-2H4M4 18h1.5a1 1 0 0 1 0 2H4"
                      />
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
                  class="h-32 w-full overflow-y-auto px-4 py-3 text-sm outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
                  :data-placeholder="t('notification.enterDescription')"
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
              <h3 class="text-base font-semibold text-slate-950 sm:text-lg">
                {{ t('notification.targetAudience') }}
              </h3>
              <div class="mt-3 space-y-3">
                <div v-for="option in audienceOptions" :key="option.value">
                  <label
                    class="flex w-fit cursor-pointer items-center gap-3 text-sm text-slate-900"
                  >
                    <input
                      v-model="targetAudience"
                      type="radio"
                      :value="option.value"
                      class="size-4 accent-[#8b2a23]"
                    />
                    {{ option.label }}
                  </label>

                  <div
                    v-if="option.value === targetAudience && option.value !== 'All Students'"
                    class="ml-7 mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2.5"
                  >
                    <div class="relative min-w-0 text-xs font-medium text-slate-600" @click.stop>
                      <button
                        type="button"
                        class="flex h-9 w-full items-center justify-between gap-1 rounded-lg border border-slate-100 bg-white px-2 text-left text-xs font-normal text-slate-800 shadow-sm outline-none transition hover:border-[#dfcccc] focus:border-[#8b2a23] sm:gap-2 sm:px-3"
                        :class="{ 'border-[#8b2a23]': openTargetDropdown === 'program' }"
                        :aria-expanded="openTargetDropdown === 'program'"
                        @click="toggleTargetDropdown('program')"
                      >
                        <span class="min-w-0 truncate sm:hidden">{{
                          mobileTargetProgramLabel
                        }}</span>
                        <span class="hidden min-w-0 truncate sm:inline">{{
                          selectedTargetProgramLabel
                        }}</span>
                        <svg
                          class="size-4 shrink-0 text-slate-500 transition-transform duration-200"
                          :class="{ 'rotate-180': openTargetDropdown === 'program' }"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          aria-hidden="true"
                        >
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </button>
                      <Transition
                        enter-active-class="transition duration-150 ease-out"
                        enter-from-class="-translate-y-1 opacity-0"
                        enter-to-class="translate-y-0 opacity-100"
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="translate-y-0 opacity-100"
                        leave-to-class="-translate-y-1 opacity-0"
                      >
                        <div
                          v-if="openTargetDropdown === 'program'"
                          class="absolute left-1/2 top-[calc(100%+6px)] z-40 max-h-40 w-40 -translate-x-1/2 overflow-y-auto overscroll-contain rounded-lg border border-slate-100 bg-white p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.14)] sm:left-0 sm:right-0 sm:max-h-44 sm:w-auto sm:translate-x-0 sm:shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
                        >
                          <button
                            v-for="program in ['all', ...targetProgramOptions]"
                            :key="program"
                            type="button"
                            class="flex w-full items-center justify-between gap-1 rounded-md px-3 py-2.5 text-left text-xs font-normal text-slate-800 hover:bg-[#f8eeee] sm:px-2.5 sm:py-2"
                            :class="{ 'bg-[#f8eeee]': targetProgram === program }"
                            @click="selectTargetDropdown('program', program)"
                          >
                            <span class="min-w-0 flex-1 whitespace-nowrap">{{
                              program === 'all' ? t('student.allProgram') : program
                            }}</span
                            ><svg
                              v-if="targetProgram === program"
                              class="size-4 shrink-0 text-slate-500"
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
                      </Transition>
                    </div>

                    <div class="relative min-w-0 text-xs font-medium text-slate-600" @click.stop>
                      <button
                        type="button"
                        class="flex h-9 w-full items-center justify-between gap-1 rounded-lg border border-slate-100 bg-white px-2 text-left text-xs font-normal text-slate-800 shadow-sm outline-none transition hover:border-[#dfcccc] focus:border-[#8b2a23] sm:gap-2 sm:px-3"
                        :class="{ 'border-[#8b2a23]': openTargetDropdown === 'plan' }"
                        :aria-expanded="openTargetDropdown === 'plan'"
                        @click="toggleTargetDropdown('plan')"
                      >
                        <span class="min-w-0 truncate sm:hidden">{{ mobileTargetPlanLabel }}</span>
                        <span class="hidden min-w-0 truncate sm:inline">{{
                          selectedTargetPlanLabel
                        }}</span>
                        <svg
                          class="size-4 shrink-0 text-slate-500 transition-transform duration-200"
                          :class="{ 'rotate-180': openTargetDropdown === 'plan' }"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          aria-hidden="true"
                        >
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </button>
                      <Transition
                        enter-active-class="transition duration-150 ease-out"
                        enter-from-class="-translate-y-1 opacity-0"
                        enter-to-class="translate-y-0 opacity-100"
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="translate-y-0 opacity-100"
                        leave-to-class="-translate-y-1 opacity-0"
                      >
                        <div
                          v-if="openTargetDropdown === 'plan'"
                          class="absolute left-1/2 top-[calc(100%+6px)] z-40 w-40 -translate-x-1/2 overflow-hidden rounded-lg border border-slate-100 bg-white p-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.14)] sm:left-0 sm:right-0 sm:w-auto sm:translate-x-0 sm:shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
                        >
                          <button
                            v-for="plan in ['all', ...targetPlanOptions]"
                            :key="plan"
                            type="button"
                            class="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-xs font-normal text-slate-800 hover:bg-[#f8eeee] sm:px-2.5 sm:py-2"
                            :class="{ 'bg-[#f8eeee]': targetPlan === plan }"
                            @click="selectTargetDropdown('plan', plan)"
                          >
                            <span>{{
                              plan === 'all' ? t('student.allPlan') : targetPlanLabel(plan)
                            }}</span
                            ><svg
                              v-if="targetPlan === plan"
                              class="size-4 shrink-0 text-slate-500"
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
                      </Transition>
                    </div>

                    <div class="relative min-w-0 text-xs font-medium text-slate-600" @click.stop>
                      <button
                        type="button"
                        class="flex h-9 w-full items-center justify-between gap-1 rounded-lg border border-slate-100 bg-white px-2 text-left text-xs font-normal text-slate-800 shadow-sm outline-none transition hover:border-[#dfcccc] focus:border-[#8b2a23] sm:gap-2 sm:px-3"
                        :class="{ 'border-[#8b2a23]': openTargetDropdown === 'year' }"
                        :aria-expanded="openTargetDropdown === 'year'"
                        @click="toggleTargetDropdown('year')"
                      >
                        <span class="min-w-0 truncate sm:hidden">{{
                          mobileTargetAcademicYearLabel
                        }}</span>
                        <span class="hidden min-w-0 truncate sm:inline">{{
                          selectedTargetAcademicYearLabel
                        }}</span>
                        <svg
                          class="size-4 shrink-0 text-slate-500 transition-transform duration-200"
                          :class="{ 'rotate-180': openTargetDropdown === 'year' }"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          aria-hidden="true"
                        >
                          <path d="m7 10 5 5 5-5" />
                        </svg>
                      </button>
                      <Transition
                        enter-active-class="transition duration-150 ease-out"
                        enter-from-class="-translate-y-1 opacity-0"
                        enter-to-class="translate-y-0 opacity-100"
                        leave-active-class="transition duration-100 ease-in"
                        leave-from-class="translate-y-0 opacity-100"
                        leave-to-class="-translate-y-1 opacity-0"
                      >
                        <div
                          v-if="openTargetDropdown === 'year'"
                          class="absolute right-0 top-[calc(100%+6px)] z-40 max-h-40 w-36 overflow-y-auto overscroll-contain rounded-lg border border-slate-100 bg-white p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.14)] sm:left-0 sm:max-h-44 sm:w-auto sm:shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
                        >
                          <button
                            v-for="year in ['all', ...targetAcademicYearOptions]"
                            :key="year"
                            type="button"
                            class="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-xs font-normal text-slate-800 hover:bg-[#f8eeee]"
                            :class="{ 'bg-[#f8eeee]': targetAcademicYear === year }"
                            @click="selectTargetDropdown('year', year)"
                          >
                            <span v-if="year === 'all'" class="sm:hidden">{{
                              isThai ? 'ทุกปีการศึกษา' : t('student.allYear')
                            }}</span
                            ><span :class="{ 'hidden sm:inline': year === 'all' }">{{
                              year === 'all' ? t('student.allYear') : year
                            }}</span
                            ><svg
                              v-if="targetAcademicYear === year"
                              class="size-4 shrink-0 text-slate-500"
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
                      </Transition>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section class="border-t border-slate-200 pt-5">
              <h3 class="text-base font-semibold text-slate-950 sm:text-lg">
                {{ t('notification.attachmentOptional') }}
              </h3>
              <input ref="attachmentInput" type="file" class="hidden" @change="updateAttachment" />
              <div class="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class="rounded-md bg-[#F4EAEA] px-4 py-2 text-sm font-semibold text-[#8b2a23]"
                  @click="chooseAttachment"
                >
                  {{ t('notification.uploadFile') }}
                </button>
                <p class="text-xs text-slate-500">{{ t('notification.maxFileSize') }}</p>
              </div>
              <div v-if="attachmentFile" class="mt-2 flex min-w-0 items-center gap-2">
                <p class="min-w-0 break-all text-xs text-slate-700">
                  {{ attachmentFile.name }}
                </p>
                <button
                  type="button"
                  class="flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold leading-none text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  :aria-label="t('notification.removeAttachment')"
                  @click="removeAttachment"
                >
                  &times;
                </button>
              </div>

              <label class="mt-4 flex w-fit items-center gap-3 text-sm text-slate-900">
                <input v-model="sendEmail" type="checkbox" class="size-4 accent-[#8b2a23]" />
                {{ t('notification.sendEmail') }}
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
          {{ t('common.cancel') }}
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
          {{ isSubmitting ? t('notification.sending') : t('notification.send') }}
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
      <section
        class="relative w-full max-w-[480px] overflow-hidden rounded-[18px] bg-white shadow-xl"
      >
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
            <h2
              id="notification-detail-title"
              class="break-words text-base font-semibold leading-tight text-slate-950"
            >
              {{ selectedNotification.title }}
            </h2>
            <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <p class="inline-flex max-w-full items-center gap-1.5 text-xs text-slate-500">
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
              <p
                v-if="selectedNotification.sendEmail"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700"
              >
                <svg
                  class="size-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
                {{ t('notification.sentViaEmail') }}
              </p>
            </div>
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
              Deadline:
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
      aria-labelledby="admin-attachment-preview-title"
    >
      <header class="flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-sm">
        <h2
          id="admin-attachment-preview-title"
          class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950"
        >
          {{ attachmentPreviewName }}
        </h2>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          :aria-label="t('notification.back')"
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
