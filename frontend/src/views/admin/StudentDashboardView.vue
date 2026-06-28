<script setup lang="ts">
import { computed, ref } from 'vue'

import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import ExportYearSelect from '@/components/student/ExportYearSelect.vue'
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import {
  downloadStudentTemplate,
  exportStudents,
  getStudents,
  importStudents,
} from '@/services/students.api'

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

const operationMessage = ref('')
const isImporting = ref(false)
const isExporting = ref(false)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const selectedImportFile = ref<File | null>(null)
const selectedExportEnrollmentYear = ref('all')
let messageTimer: ReturnType<typeof setTimeout> | undefined

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

function showOperationMessage(message: string) {
  operationMessage.value = message
  window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    operationMessage.value = ''
  }, 20_000)
}

function openImportModal() {
  selectedImportFile.value = null
  isImportModalOpen.value = true
}

function closeImportModal() {
  if (isImporting.value) return
  selectedImportFile.value = null
  isImportModalOpen.value = false
}

function openExportModal() {
  selectedExportEnrollmentYear.value = 'all'
  isExportModalOpen.value = true
}

function closeExportModal() {
  if (isExporting.value) return
  isExportModalOpen.value = false
}

async function handleImport() {
  const file = selectedImportFile.value
  if (!file) return

  operationMessage.value = ''
  isImporting.value = true
  try {
    const result = await importStudents(file)
    const errorText = result.errors?.length ? ` ${result.errors.join('; ')}` : ''
    showOperationMessage(
      result.failedRecords
        ? `Imported ${result.successRecords}/${result.totalRecords} students.${errorText}`
        : `Imported ${result.successRecords} students successfully`,
    )
    await loadStudents()
    selectedImportFile.value = null
    isImportModalOpen.value = false
  } catch (error) {
    showOperationMessage(error instanceof Error ? error.message : 'Unable to import students')
  } finally {
    isImporting.value = false
  }
}

async function handleExport() {
  operationMessage.value = ''
  isExporting.value = true
  try {
    await exportStudents(selectedExportEnrollmentYear.value)
    showOperationMessage('Exported students successfully')
    isExportModalOpen.value = false
  } catch (error) {
    showOperationMessage(error instanceof Error ? error.message : 'Unable to export students')
  } finally {
    isExporting.value = false
  }
}
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

      <button
        type="button"
        class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#7a211c]"
        @click="downloadStudentTemplate"
      >
        Download Template
      </button>
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

    <p v-if="operationMessage" class="mt-3 text-sm text-slate-600" role="status">
      {{ operationMessage }}
    </p>

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
    />

    <ImportFileModal
      v-if="isImportModalOpen"
      title="Import Student"
      description="Upload an Excel or CSV file to import students in bulk"
      :selected-file="selectedImportFile"
      :is-importing="isImporting"
      action-label="Import Student"
      @select-file="selectedImportFile = $event"
      @close="closeImportModal"
      @import="handleImport"
    />

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
          <svg class="mx-auto size-9 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
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
  </div>
</template>
