<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { exportStudents, getStudents, importStudents } from '@/services/students.api'
import type { StudentImportResult } from '@/services/students.api'

const router = useRouter()
const { isThai, t } = useLanguage()

const {
  filteredStudents,
  filters,
  isLoading,
  loadError,
  loadStudents,
  search,
  students,
} = useStudentOverview(getStudents, 'all')

const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
const isImporting = ref(false)
const isExporting = ref(false)
const isImportModalOpen = ref(false)
const selectedImportFile = ref<File | null>(null)
let messageTimer: ReturnType<typeof setTimeout> | undefined

const notificationText = computed(() => errorMessage.value || message.value)
const dashboardStatistics = computed(() => ({
  total: filteredStudents.value.length,
  onTrack: filteredStudents.value.filter((student) => student.status === 'On-track').length,
  overdue: filteredStudents.value.filter((student) => student.status === 'Overdue').length,
  graduate: filteredStudents.value.filter((student) => student.status === 'Graduate').length,
}))

function showNotification(text: string, type: 'success' | 'error' = 'success') {
  message.value = type === 'success' ? text : ''
  errorMessage.value = type === 'error' ? text : ''
  notificationType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => {
    message.value = ''
    errorMessage.value = ''
  }, 10_000)
}

function showNotificationAfterImportModalCloses(
  text: string,
  type: 'success' | 'error' = 'success',
) {
  window.setTimeout(() => showNotification(text, type), 120)
}

function removeRowPrefix(text: string) {
  return text.replace(/\bRow\s+\d+:\s*/gi, '')
}

function shortenImportMessage(text: string) {
  return text
    .replace(/Email is missing\. Please enter an email address\./gi, 'Email is missing.')
    .replace(/Student ID is missing\. Please enter a student ID\./gi, 'Student ID is missing.')
    .replace(/Full Name is missing\. Please enter a full name\./gi, 'Full Name is missing.')
    .replace(/Program is missing\. Please enter a program\./gi, 'Program is missing.')
    .replace(
      /Degree Level is missing\. Please enter Master or Doctoral\./gi,
      'Degree Level is missing.',
    )
    .replace(
      /Enrollment Academic Year is missing\. Please enter the enrollment academic year\./gi,
      'Enrollment Academic Year is missing.',
    )
    .replace(/Semester is missing\. Please enter semester 1 or 2\./gi, 'Semester is missing.')
    .replace(
      /Expected Graduation Year is missing\. Please enter the expected graduation year\./gi,
      'Expected Graduation Year is missing.',
    )
}

function formatStudentImportError(error: unknown) {
  const text = shortenImportMessage(removeRowPrefix(error instanceof Error ? error.message : ''))
  if (/\b(missing|required)\b/i.test(text)) {
    return isThai.value ? 'กรุณากรอกข้อมูลให้ครบถ้วน' : 'Please complete all required fields.'
  }
  if (/email is missing|email is required/i.test(text)) {
    return text.replace(/email is required/gi, 'Email is missing.')
  }

  const readableMessages: Record<string, string> = {
    'email is required': 'Email is missing.',
    'A valid email is required': 'Please enter a valid email address.',
  }

  return (readableMessages[text] ?? text) || 'Unable to import students'
}

function resetImportState() {
  selectedImportFile.value = null
}

function showImportResult(result: StudentImportResult) {
  if (!(result.createdRecords ?? 0) && !(result.updatedRecords ?? 0) && !result.failedRecords) {
    return
  }

  const errorText = result.errors?.length
    ? ` ${result.errors.map((error) => shortenImportMessage(removeRowPrefix(error))).join('; ')}`
    : ''
  const createdRecords = result.createdRecords ?? result.successRecords
  const updatedRecords = result.updatedRecords ?? 0
  const importedStudentLabel = createdRecords === 1 ? 'student' : 'students'
  const updatedStudentLabel = updatedRecords === 1 ? 'student' : 'students'
  const englishSuccessText =
    createdRecords && updatedRecords
      ? `Imported ${createdRecords} new ${importedStudentLabel} and updated ${updatedRecords} ${updatedStudentLabel} successfully.`
      : createdRecords
        ? `Imported ${createdRecords} new ${importedStudentLabel} successfully.`
        : `Updated ${updatedRecords} ${updatedStudentLabel} successfully.`
  const successText = isThai.value
    ? `นำเข้าสำเร็จ — เพิ่มใหม่ ${createdRecords} คน${updatedRecords ? `, อัปเดต ${updatedRecords} คน` : ''}`
    : englishSuccessText
  const hasMissingRequiredFields = result.errors?.some((error) => /\b(missing|required)\b/i.test(error))
  const partialSuccessText = hasMissingRequiredFields
    ? isThai.value
      ? 'กรุณากรอกข้อมูลให้ครบถ้วน'
      : 'Please complete all required fields.'
    : isThai.value
      ? `นำเข้าสำเร็จ ${result.successRecords} จาก ${result.totalRecords} คน แต่มีบางรายการไม่สำเร็จ${errorText}`
      : `Import completed. ${result.successRecords} of ${result.totalRecords} students were imported successfully, but some records could not be imported.${errorText}`

  showNotificationAfterImportModalCloses(
    result.failedRecords ? partialSuccessText : successText,
    result.failedRecords ? 'error' : 'success',
  )
}

function openImportModal() {
  resetImportState()
  isImportModalOpen.value = true
}

function closeImportModal() {
  if (isImporting.value) return
  resetImportState()
  isImportModalOpen.value = false
}

function handleImportFileSelect(file: File | null) {
  selectedImportFile.value = file
}

async function finishImport(result: StudentImportResult) {
  resetImportState()
  isImportModalOpen.value = false
  showImportResult(result)
  await loadStudents()
}

async function handleImport() {
  const file = selectedImportFile.value
  if (!file) return

  message.value = ''
  errorMessage.value = ''
  isImporting.value = true
  try {
    const result = await importStudents(file)
    await finishImport(result)
  } catch (error) {
    const text = formatStudentImportError(error)
    resetImportState()
    isImportModalOpen.value = false
    showNotificationAfterImportModalCloses(text, 'error')
  } finally {
    isImporting.value = false
  }
}

async function handleExport() {
  if (!filteredStudents.value.length) {
    showNotification(isThai.value ? 'ไม่มีข้อมูลในตารางสำหรับส่งออก' : 'There are no displayed students to export.', 'error')
    return
  }

  message.value = ''
  errorMessage.value = ''
  isExporting.value = true
  try {
    await exportStudents(
      filteredStudents.value.map((student) => student.studentId),
      isThai.value ? 'th' : 'en',
    )
    showNotification('Exported students successfully')
  } catch (error) {
    showNotification(error instanceof Error ? error.message : 'Unable to export students', 'error')
  } finally {
    isExporting.value = false
  }
}

function viewStudentMilestones(studentId: string) {
  void router.push({ name: 'admin-student-milestones', params: { studentId } })
}

onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
})

useAutoRefresh(() => loadStudents({ silent: true }), {
  canRefresh: () => !isImportModalOpen.value && !isImporting.value,
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">{{ t('student.pageTitle') }}</h1>
        <p class="mt-1 text-sm text-slate-500">
          {{ t('student.pageDescription') }}
        </p>
      </div>

    </header>

    <section class="mt-4" aria-label="Import">
      <DashboardActionCard
        class="w-full"
        :title="t('dashboard.importExcel')"
        :description="t('dashboard.uploadStudents')"
        tone="red"
        :busy="isImporting"
        :busy-label="t('dashboard.importing')"
        @click="openImportModal"
      />
    </section>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard :title="t('dashboard.totalStudents')" :value="dashboardStatistics.total" icon="students" />
      <SummaryCard :title="t('dashboard.onTrack')" :value="dashboardStatistics.onTrack" icon="on-track" />
      <SummaryCard :title="t('dashboard.overdue')" :value="dashboardStatistics.overdue" icon="overdue" />
      <SummaryCard :title="t('dashboard.graduate')" :value="dashboardStatistics.graduate" icon="graduate" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      :available-students="students"
      :buddhist-year="isThai"
      advisor-mode="all-only"
      @view="viewStudentMilestones"
    >
      <template #action>
        <DashboardActionCard
          class="-mt-2"
          compact
          :title="t('dashboard.exportExcel')"
          :description="t('dashboard.downloadStudents')"
          tone="green"
          :busy="isExporting"
          :busy-label="t('dashboard.exporting')"
          @click="handleExport"
        />
      </template>
    </StudentOverview>

    <ImportFileModal
      v-if="isImportModalOpen"
      :title="t('dashboard.importStudent')"
      :description="t('dashboard.bulkStudents')"
      :selected-file="selectedImportFile"
      :is-importing="isImporting"
      :action-label="t('dashboard.importStudent')"
      @select-file="handleImportFileSelect"
      @close="closeImportModal"
      @import="handleImport"
    />

    <div
      v-if="notificationText"
      class="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border bg-white px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
      :class="
        notificationType === 'success'
          ? 'border-[#8b2a23]/30 text-[#8b2a23]'
          : 'border-red-200 text-red-600'
      "
      role="status"
      aria-live="polite"
    >
      {{ notificationText }}
    </div>
  </div>
</template>
