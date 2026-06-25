<script setup lang="ts">
import { computed, ref } from 'vue'

import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import {
  downloadStudentTemplate,
  exportStudents,
  getStudents,
  importStudents,
} from '@/services/students.api'

const { filteredStudents, filters, isLoading, loadError, loadStudents, search, statistics } =
  useStudentOverview(getStudents, 'all')

const fileInput = ref<HTMLInputElement | null>(null)
const operationMessage = ref('')
const isImporting = ref(false)
const isExporting = ref(false)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const selectedImportFile = ref<File | null>(null)
const selectedExportYear = ref('all')
let messageTimer: ReturnType<typeof setTimeout> | undefined

const exportYearOptions = computed(() => {
  const years = new Set(filteredStudents.value.map((student) => student.year))
  return ['all', ...Array.from(years).sort()]
})

const exportStudentCount = computed(() =>
  selectedExportYear.value === 'all'
    ? filteredStudents.value.length
    : filteredStudents.value.filter((student) => student.year === selectedExportYear.value).length,
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
  selectedExportYear.value = 'all'
  isExportModalOpen.value = true
}

function closeExportModal() {
  if (isExporting.value) return
  isExportModalOpen.value = false
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  selectedImportFile.value = input.files?.[0] ?? null
}

function handleFileDrop(event: DragEvent) {
  selectedImportFile.value = event.dataTransfer?.files?.[0] ?? null
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
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function handleExport() {
  operationMessage.value = ''
  isExporting.value = true
  try {
    await exportStudents(selectedExportYear.value)
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
    <header class="flex items-start justify-between gap-4">
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
      <button
        type="button"
        :disabled="isImporting"
        class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition hover:border-[#7d2923] disabled:cursor-wait disabled:opacity-60"
        @click="openImportModal"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#a33a3a]">
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">{{ isImporting ? 'Importing...' : 'Import Excel' }}</span>
        <span class="mt-1 text-xs text-slate-500">Upload student records from CSV or Excel.</span>
      </button>

      <button
        type="button"
        :disabled="isExporting"
        class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition hover:border-emerald-500 disabled:cursor-wait disabled:opacity-60"
        @click="openExportModal"
      >
        <span class="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M12 15V3M7 8l5-5 5 5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">{{ isExporting ? 'Exporting...' : 'Export Excel' }}</span>
        <span class="mt-1 text-xs text-slate-500">Download all student information.</span>
      </button>
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
      advisor-mode="all-only"
    />

    <div
      v-if="isImportModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
    >
      <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id="import-modal-title" class="text-base font-semibold">Import Student</h2>
        <p class="mt-1 text-xs text-slate-500">Upload an Excel or CSV file to import users in bulk</p>

        <button
          type="button"
          class="mt-5 flex h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-center transition hover:border-[#8b2a23]"
          @click="fileInput?.click()"
          @dragover.prevent
          @drop.prevent="handleFileDrop"
        >
          <svg class="size-8 text-[#8b2a23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
          <span class="mt-3 text-xs text-slate-500">
            {{ selectedImportFile ? selectedImportFile.name : 'Drag and drop your file here, or click to browse' }}
          </span>
          <span class="mt-2 rounded bg-[#8b2a23] px-3 py-1.5 text-xs font-medium text-white">
            Browse File
          </span>
          <span class="mt-2 text-[10px] text-slate-400">Supported formats: .xlsx, .csv</span>
        </button>

        <input ref="fileInput" class="hidden" type="file" accept=".csv,.xlsx" @change="handleFileSelect" />

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
            @click="closeImportModal"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!selectedImportFile || isImporting"
            class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleImport"
          >
            {{ isImporting ? 'Importing...' : 'Import User' }}
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

        <label class="mt-4 block text-xs font-semibold">
          Filter by Academic Year
          <select
            v-model="selectedExportYear"
            class="mt-1 h-9 w-32 rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#8b2a23]"
          >
            <option v-for="year in exportYearOptions" :key="year" :value="year">
              {{ year === 'all' ? 'All Year' : year }}
            </option>
          </select>
        </label>

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
