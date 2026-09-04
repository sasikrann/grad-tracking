<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { exportStudents, getStudentsPage, importStudents } from '@/services/students.api'
import type { StudentImportResult, StudentPaginationResult } from '@/services/students.api'
import type { Student, StudentFiltersState } from '@/types/student'

const router = useRouter()
const { isThai, t } = useLanguage()

const students = ref<Student[]>([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')
const page = ref(1)
const pagination = ref({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 })
const dashboardStatistics = ref({ total: 0, onTrack: 0, overdue: 0, graduate: 0 })
const filterOptions = ref<StudentPaginationResult['filterOptions']>({
  semesters: [],
  years: [],
  degrees: [],
  plans: [],
  statuses: [],
})
const paginationItems = computed<Array<number | 'ellipsis'>>(() => {
  const total = pagination.value.totalPages
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  if (page.value <= 3) return [1, 2, 3, 4, 'ellipsis']
  if (page.value >= total - 2) return ['ellipsis', total - 3, total - 2, total - 1, total]
  return ['ellipsis', page.value - 1, page.value, page.value + 1, 'ellipsis']
})
const filters = ref<StudentFiltersState>({
  semester: 'all',
  year: 'all',
  degree: 'all',
  plan: 'all',
  status: 'all',
  advisor: 'all',
})
let searchTimer: ReturnType<typeof setTimeout> | undefined

async function loadStudents({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  loadError.value = ''
  try {
    const result = await getStudentsPage({
      page: page.value,
      limit: 10,
      search: search.value,
      ...filters.value,
    })
    students.value = result.students
    pagination.value = result.pagination
    dashboardStatistics.value = result.statistics
    const hasFilterOptions = Object.values(result.filterOptions).some(
      (options) => options.length > 0,
    )
    if (hasFilterOptions || filterOptions.value.degrees.length === 0) {
      filterOptions.value = result.filterOptions
    }
    if (page.value > 1 && result.students.length === 0) {
      page.value = 1
      await loadStudents({ silent })
      return
    }
    if (page.value > result.pagination.totalPages && result.pagination.totalPages > 0) {
      page.value = result.pagination.totalPages
      await loadStudents({ silent })
    }
  } catch (error) {
    students.value = []
    loadError.value = error instanceof Error ? error.message : 'Unable to load students'
  } finally {
    if (!silent) isLoading.value = false
  }
}

watch(
  filters,
  () => {
    page.value = 1
    void loadStudents()
  },
  { deep: true },
)
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void loadStudents()
  }, 300)
})

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pagination.value.totalPages || nextPage === page.value) return
  page.value = nextPage
  void loadStudents()
}

onMounted(loadStudents)

const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
const isImporting = ref(false)
const isExporting = ref(false)
const isImportModalOpen = ref(false)
const selectedImportFile = ref<File | null>(null)
let messageTimer: ReturnType<typeof setTimeout> | undefined

const notificationText = computed(() => errorMessage.value || message.value)

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

  if (isThai.value) return t('toast.studentsImportFailed')
  return (readableMessages[text] ?? text) || t('toast.studentsImportFailed')
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
  const hasMissingRequiredFields = result.errors?.some((error) =>
    /\b(missing|required)\b/i.test(error),
  )
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
  if (!students.value.length) {
    showNotification(
      isThai.value
        ? 'ไม่มีข้อมูลในตารางสำหรับส่งออก'
        : 'There are no displayed students to export.',
      'error',
    )
    return
  }

  message.value = ''
  errorMessage.value = ''
  isExporting.value = true
  try {
    const exportStudentsList: Student[] = []
    const exportPageSize = 100
    const firstPage = await getStudentsPage({
      page: 1,
      limit: exportPageSize,
      search: search.value,
      ...filters.value,
    })
    exportStudentsList.push(...firstPage.students)
    for (let exportPage = 2; exportPage <= firstPage.pagination.totalPages; exportPage += 1) {
      const result = await getStudentsPage({
        page: exportPage,
        limit: exportPageSize,
        search: search.value,
        ...filters.value,
      })
      exportStudentsList.push(...result.students)
    }
    await exportStudents(
      exportStudentsList.map((student) => student.studentId),
      isThai.value ? 'th' : 'en',
    )
    showNotification(t('toast.studentsExported'))
  } catch (error) {
    showNotification(
      isThai.value && error instanceof Error
        ? t('toast.studentsExportFailed')
        : error instanceof Error
          ? error.message
          : t('toast.studentsExportFailed'),
      'error',
    )
  } finally {
    isExporting.value = false
  }
}

function viewStudentMilestones(studentId: string) {
  void router.push({ name: 'admin-student-milestones', params: { studentId } })
}

onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
  if (searchTimer) clearTimeout(searchTimer)
})

useAutoRefresh(() => loadStudents({ silent: true }), {
  canRefresh: () => !isImportModalOpen.value && !isImporting.value,
})
</script>

<template>
  <div
    class="min-h-screen w-full bg-[#f7f7f7] px-3 py-3 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8"
  >
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight sm:text-3xl">{{ t('student.pageTitle') }}</h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('student.pageDescription') }}
        </p>
      </div>
    </header>

    <section class="mt-2 sm:mt-4" aria-label="Import">
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

    <section class="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-5 xl:grid-cols-4">
      <SummaryCard
        :title="t('dashboard.totalStudents')"
        :value="dashboardStatistics.total"
        icon="students"
        compact-value
      />
      <SummaryCard
        :title="t('dashboard.onTrack')"
        :value="dashboardStatistics.onTrack"
        icon="on-track"
        compact-value
      />
      <SummaryCard
        :title="t('dashboard.overdue')"
        :value="dashboardStatistics.overdue"
        icon="overdue"
        compact-value
      />
      <SummaryCard
        :title="t('dashboard.graduate')"
        :value="dashboardStatistics.graduate"
        icon="graduate"
        compact-value
      />
    </section>

    <StudentOverview
      class="!mt-3 sm:!mt-4"
      v-model:filters="filters"
      v-model:search="search"
      :students="students"
      :is-loading="isLoading"
      color-program-badges
      :error="loadError"
      :available-students="students"
      :filter-options="filterOptions"
      :buddhist-year="isThai"
      advisor-mode="all-only"
      @view="viewStudentMilestones"
    >
      <template #action>
        <DashboardActionCard
          class="shrink-0"
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

    <nav v-if="pagination.totalPages > 1" class="mt-5 flex justify-end" aria-label="Student pages">
      <div
        class="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <button
          type="button"
          class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          :disabled="page === 1"
          aria-label="Previous page"
          @click="changePage(page - 1)"
        >
          ‹
        </button>
        <template v-for="(item, index) in paginationItems" :key="`${item}-${index}`">
          <span
            v-if="item === 'ellipsis'"
            class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-400"
            >…</span
          >
          <button
            v-else
            type="button"
            class="flex size-8 items-center justify-center border-r border-slate-200 text-xs font-medium transition-colors"
            :class="
              item === page ? 'bg-[#f7c9cf] text-[#a13a34]' : 'text-slate-700 hover:bg-[#fdf1f3]'
            "
            :aria-current="item === page ? 'page' : undefined"
            :aria-label="`Page ${item}`"
            @click="changePage(item)"
          >
            {{ item }}
          </button>
        </template>
        <button
          type="button"
          class="flex size-8 items-center justify-center text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          :disabled="page === pagination.totalPages"
          aria-label="Next page"
          @click="changePage(page + 1)"
        >
          ›
        </button>
      </div>
    </nav>

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
