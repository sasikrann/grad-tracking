<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'

import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import ExportYearSelect from '@/components/student/ExportYearSelect.vue'
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import {
  exportStudents,
  getStudents,
  importStudents,
  StudentImportConflictError,
} from '@/services/students.api'
import type { StudentImportConflict, StudentImportResult } from '@/services/students.api'

const router = useRouter()

const {
  filteredStudents,
  filters,
  isLoading,
  loadError,
  loadStudents,
  search,
  statistics,
  yearOptions,
} = useStudentOverview(getStudents, 'all')

const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
const isImporting = ref(false)
const isExporting = ref(false)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isDuplicateStudentModalOpen = ref(false)
const importConflicts = ref<StudentImportConflict[]>([])
const importResolutions = ref<Record<string, string>>({})
const selectedImportFile = ref<File | null>(null)
const selectedExportEnrollmentYear = ref('all')
let messageTimer: ReturnType<typeof setTimeout> | undefined

const notificationText = computed(() => errorMessage.value || message.value)
const hasResolvedImportConflicts = computed(() =>
  importConflicts.value.every((conflict) => Boolean(importResolutions.value[conflict.key])),
)
const duplicateStudentMessage =
  'Some student IDs already exist. Please choose which student record to keep before importing.'

const exportEnrollmentYearOptions = computed(() => {
  const years = new Set(filteredStudents.value.map((student) => student.enrollmentAcademicYear))
  return ['all', ...Array.from(years).sort()]
})

const exportStudentCount = computed(() =>
  selectedExportEnrollmentYear.value === 'all'
    ? filteredStudents.value.length
    : filteredStudents.value.filter(
        (student) => student.enrollmentAcademicYear === selectedExportEnrollmentYear.value,
      ).length,
)

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
  if (/email is missing|email is required/i.test(text)) {
    return text.replace(/email is required/gi, 'Email is missing.')
  }

  const readableMessages: Record<string, string> = {
    'email is required': 'Email is missing.',
    'A valid email is required': 'Please enter a valid email address.',
  }

  return (readableMessages[text] ?? text) || 'Unable to import students'
}

function resetImportConflicts() {
  importConflicts.value = []
  importResolutions.value = {}
  isDuplicateStudentModalOpen.value = false
}

function resetImportState() {
  selectedImportFile.value = null
  resetImportConflicts()
}

function showImportResult(result: StudentImportResult) {
  const errorText = result.errors?.length
    ? ` ${result.errors.map((error) => shortenImportMessage(removeRowPrefix(error))).join('; ')}`
    : ''
  showNotificationAfterImportModalCloses(
    result.failedRecords
      ? `Imported ${result.successRecords}/${result.totalRecords} students.${errorText}`
      : result.updatedRecords
        ? `Imported ${result.successRecords} students: created ${result.createdRecords ?? 0}, updated ${result.updatedRecords}.`
        : `Imported ${result.successRecords} students successfully`,
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
  resetImportConflicts()
}

function openExportModal() {
  selectedExportEnrollmentYear.value = 'all'
  isExportModalOpen.value = true
}

function closeExportModal() {
  if (isExporting.value) return
  isExportModalOpen.value = false
}

async function finishImport(result: StudentImportResult) {
  resetImportState()
  isImportModalOpen.value = false
  showImportResult(result)
  await loadStudents()
}

async function handleImport(_resolutions?: Record<string, string>) {
  const file = selectedImportFile.value
  if (!file) return

  message.value = ''
  errorMessage.value = ''
  isImporting.value = true
  try {
    const result = await importStudents(file)
    await finishImport(result)
  } catch (error) {
    if (error instanceof StudentImportConflictError) {
      importConflicts.value = error.conflicts
      importResolutions.value = {}
      isDuplicateStudentModalOpen.value = true
      return
    }
    const text = formatStudentImportError(error)
    resetImportState()
    isImportModalOpen.value = false
    showNotificationAfterImportModalCloses(text, 'error')
  } finally {
    isImporting.value = false
  }
}

async function handleImportConflictConfirm() {
  if (!hasResolvedImportConflicts.value) return
  await handleImport(importResolutions.value)
}

function closeDuplicateStudentModal() {
  isDuplicateStudentModalOpen.value = false
}

function optionLabel(source: 'existing' | 'file') {
  return source === 'existing' ? 'Existing data' : 'New data'
}

async function handleExport() {
  message.value = ''
  errorMessage.value = ''
  isExporting.value = true
  try {
    await exportStudents(selectedExportEnrollmentYear.value)
    showNotification('Exported students successfully')
    isExportModalOpen.value = false
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
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">
          Manage student data, track progress, and monitor thesis status
        </p>
      </div>

    </header>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Import and export">
      <DashboardActionCard
        title="Import Excel"
        description="Upload student records from CSV or Excel."
        tone="red"
        :busy="isImporting"
        busy-label="Importing..."
        @click="openImportModal"
      />

      <DashboardActionCard
        title="Export Excel"
        description="Download all student information."
        tone="green"
        :busy="isExporting"
        busy-label="Exporting..."
        @click="openExportModal"
      />
    </section>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
      <SummaryCard title="Total Students" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      :year-options="yearOptions"
      advisor-mode="all-only"
      @view="viewStudentMilestones"
    />

    <ImportFileModal
      v-if="isImportModalOpen && !isDuplicateStudentModalOpen"
      title="Import Student"
      description="Upload an Excel or CSV file to import students in bulk"
      :selected-file="selectedImportFile"
      :is-importing="isImporting"
      action-label="Import Student"
      @select-file="handleImportFileSelect"
      @close="closeImportModal"
      @import="handleImport"
    />

    <div
      v-if="isDuplicateStudentModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-student-title"
    >
      <section class="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl">
        <h2 id="duplicate-student-title" class="text-base font-semibold text-slate-900">
          Duplicate student ID
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          {{ duplicateStudentMessage }}
        </p>

        <div class="mt-4 max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <fieldset
            v-for="conflict in importConflicts"
            :key="conflict.key"
            class="rounded-lg border border-slate-200 p-4"
          >
            <legend class="px-1 text-sm font-semibold text-slate-900">
              Student ID: {{ conflict.studentId }}
            </legend>

            <div class="mt-3 grid gap-3 md:grid-cols-2">
              <label
                v-for="option in conflict.options"
                :key="option.optionId"
                class="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-3 text-sm transition hover:border-[#8b2a23] hover:bg-red-50/40"
                :class="
                  importResolutions[conflict.key] === option.optionId
                    ? 'border-[#8b2a23] bg-red-50/60'
                    : ''
                "
              >
                <input
                  v-model="importResolutions[conflict.key]"
                  class="mt-1 accent-[#8b2a23]"
                  type="radio"
                  :name="`student-conflict-${conflict.key}`"
                  :value="option.optionId"
                />

                <span class="min-w-0 flex-1">
                  <span class="block text-xs font-semibold text-[#8b2a23]">
                    {{ optionLabel(option.source) }}
                    <span v-if="option.rowNumber" class="font-medium text-slate-500">
                      (row {{ option.rowNumber }})
                    </span>
                  </span>
                  <span class="mt-1 block font-semibold text-slate-900">
                    {{ option.fullName }}
                  </span>
                  <span class="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600">
                    <span>Email: {{ option.email || '-' }}</span>
                    <span>Program: {{ option.program }}</span>
                    <span>Degree: {{ option.degreeLevel }}</span>
                    <span>Enrollment Year: {{ option.enrollmentAcademicYear }}</span>
                    <span>Semester: {{ option.semester }}</span>
                    <span>Expected Graduation: {{ option.expectedGraduationYear }}</span>
                    <span>Advisor: {{ option.advisorName || option.advisorId || '-' }}</span>
                  </span>
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
            @click="closeDuplicateStudentModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!hasResolvedImportConflicts || isImporting"
            class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleImportConflictConfirm"
          >
            {{ isImporting ? 'Importing...' : 'Import Selected Student' }}
          </button>
        </div>
      </section>
    </div>

    <div
      v-if="isExportModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id="export-modal-title" class="text-base font-semibold">Export Excel</h2>
        <p class="mt-1 text-xs text-slate-500">Download user data as an Excel or CSV file</p>

        <ExportYearSelect
          v-model="selectedExportEnrollmentYear"
          :options="exportEnrollmentYearOptions"
        />

        <div class="mt-5 rounded-lg bg-slate-100 px-4 py-5 text-center">
          <svg
            class="mx-auto size-9 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          >
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M4 11h16" />
          </svg>
          <p class="mt-2 text-xs font-semibold">{{ exportStudentCount }} total students</p>
          <p class="text-[10px] text-slate-500">Ready for export</p>
        </div>

        <div class="mt-3 rounded-lg bg-slate-100 p-4">
          <p class="text-xs font-semibold">Export Includes</p>
          <ul class="mt-2 space-y-1 text-xs text-slate-600">
            <li>✓ Student information</li>
            <li>✓ Program details</li>
            <li>✓ Advisor assignments</li>
          </ul>
        </div>

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
            @click="closeExportModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="isExporting"
            class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-wait disabled:opacity-60"
            @click="handleExport"
          >
            {{ isExporting ? 'Exporting...' : 'Export' }}
          </button>
        </div>
      </section>
    </div>

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
