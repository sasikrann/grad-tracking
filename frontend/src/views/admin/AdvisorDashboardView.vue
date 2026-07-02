<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AdvisorTable from '@/components/admin/AdvisorTable.vue'
import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ExportConfirmModal from '@/components/admin/ExportConfirmModal.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import {
  AdvisorImportConflictError,
  downloadAdvisorTemplate,
  exportAdvisors,
  getAdvisors,
  importAdvisors,
} from '@/services/advisors.api'
import type { AdvisorImportConflict, AdvisorImportResult } from '@/services/advisors.api'
import type { Advisor } from '@/types/advisor'

const advisors = ref<Advisor[]>([])
const isLoading = ref(false)
const loadError = ref('')
const operationMessage = ref('')
const selectedImportFile = ref<File | null>(null)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isDuplicateEmailPopupOpen = ref(false)
const importConflicts = ref<AdvisorImportConflict[]>([])
const importResolutions = ref<Record<string, string>>({})
const isImporting = ref(false)
const isExporting = ref(false)
let messageTimer: ReturnType<typeof setTimeout> | undefined

const exportCountLabel = computed(() => `${advisors.value.length} total advisor`)
const hasResolvedImportConflicts = computed(() =>
  importConflicts.value.every((conflict) => Boolean(importResolutions.value[conflict.key])),
)
const duplicateAdvisorMessage = 'Please enter a valid email address because this email is duplicated.'

function showOperationMessage(message: string) {
  operationMessage.value = message
  window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    operationMessage.value = ''
  }, 20_000)
}

async function loadAdvisors() {
  isLoading.value = true
  loadError.value = ''
  try {
    advisors.value = await getAdvisors()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load advisors'
  } finally {
    isLoading.value = false
  }
}

function openImportModal() {
  selectedImportFile.value = null
  isDuplicateEmailPopupOpen.value = false
  importConflicts.value = []
  importResolutions.value = {}
  isImportModalOpen.value = true
}

function closeImportModal() {
  if (isImporting.value) return
  selectedImportFile.value = null
  isDuplicateEmailPopupOpen.value = false
  importConflicts.value = []
  importResolutions.value = {}
  isImportModalOpen.value = false
}

function showImportResult(result: AdvisorImportResult) {
  const errorText = result.errors?.length ? ` ${result.errors.join('; ')}` : ''
  showOperationMessage(
    result.failedRecords
      ? `Imported ${result.successRecords}/${result.totalRecords} advisors.${errorText}`
      : `Imported ${result.successRecords} advisors successfully`,
  )
}

function advisorImportErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  return message || 'Unable to import advisors'
}

async function finishImport(result: AdvisorImportResult) {
  showImportResult(result)
  await loadAdvisors()
  selectedImportFile.value = null
  isDuplicateEmailPopupOpen.value = false
  importConflicts.value = []
  importResolutions.value = {}
  isImportModalOpen.value = false
}

async function handleImport(resolutions?: Record<string, string>) {
  const file = selectedImportFile.value
  if (!file) return

  operationMessage.value = ''
  isImporting.value = true
  try {
    const result = await importAdvisors(file, resolutions)
    await finishImport(result)
  } catch (error) {
    if (error instanceof AdvisorImportConflictError) {
      importConflicts.value = error.conflicts
      importResolutions.value = {}
      isDuplicateEmailPopupOpen.value = true
      return
    }
    showOperationMessage(advisorImportErrorMessage(error))
  } finally {
    isImporting.value = false
  }
}

async function handleImportConflictConfirm() {
  if (!hasResolvedImportConflicts.value) return
  await handleImport(importResolutions.value)
}

function handleImportFileSelect(file: File | null) {
  selectedImportFile.value = file
  isDuplicateEmailPopupOpen.value = false
  importConflicts.value = []
  importResolutions.value = {}
}

async function handleExport() {
  operationMessage.value = ''
  isExporting.value = true
  try {
    await exportAdvisors()
    showOperationMessage('Exported advisors successfully')
    isExportModalOpen.value = false
  } catch (error) {
    showOperationMessage(error instanceof Error ? error.message : 'Unable to export advisors')
  } finally {
    isExporting.value = false
  }
}

onMounted(loadAdvisors)
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Advisor Dashboard</h1>
        <p class="mt-1 text-sm text-slate-500">Manage advisor data and view assigned users</p>
      </div>

      <button
        type="button"
        class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#7a211c]"
        @click="downloadAdvisorTemplate"
      >
        Download Template
      </button>
    </header>

    <section class="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Import and export">
      <DashboardActionCard
        title="Import Excel"
        description="Upload advisors from CSV or Excel."
        tone="red"
        :busy="isImporting"
        busy-label="Importing..."
        @click="openImportModal"
      />

      <DashboardActionCard
        title="Export Excel"
        description="Download all advisor information."
        tone="green"
        :busy="isExporting"
        busy-label="Exporting..."
        @click="isExportModalOpen = true"
      />
    </section>

    <p v-if="operationMessage" class="mt-3 text-sm text-slate-600" role="status">
      {{ operationMessage }}
    </p>

    <AdvisorTable
      :advisors="advisors"
      :is-loading="isLoading"
      :error="loadError"
    />

    <ImportFileModal
      v-if="isImportModalOpen"
      title="Import Advisor"
      description="Upload an Excel or CSV file to import advisors in bulk"
      :selected-file="selectedImportFile"
      :is-importing="isImporting"
      @select-file="handleImportFileSelect"
      @close="closeImportModal"
      @import="handleImport"
    />

    <div
      v-if="isDuplicateEmailPopupOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-email-title"
    >
      <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 id="duplicate-email-title" class="text-base font-semibold text-slate-900">
          Duplicate email
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          {{ duplicateAdvisorMessage }}
        </p>

        <div class="mt-4 max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          <fieldset
            v-for="conflict in importConflicts"
            :key="conflict.key"
            class="rounded-lg border border-slate-200 p-4"
          >
            <legend class="px-1 text-sm font-semibold text-slate-900">
              {{ conflict.email }}
            </legend>

            <div class="mt-3 space-y-2">
              <label
                v-for="option in conflict.options"
                :key="option.optionId"
                class="flex cursor-pointer items-start gap-3 rounded border border-slate-200 p-3 text-sm transition hover:border-[#8b2a23] hover:bg-red-50/40"
                :class="importResolutions[conflict.key] === option.optionId ? 'border-[#8b2a23] bg-red-50/60' : ''"
              >
                <input
                  v-model="importResolutions[conflict.key]"
                  class="mt-1 accent-[#8b2a23]"
                  type="radio"
                  :name="`advisor-conflict-${conflict.key}`"
                  :value="option.optionId"
                />
                <span class="min-w-0">
                  <span class="block font-medium text-slate-900">
                    {{ option.fullName }}
                  </span>
                  <span class="mt-1 block text-xs text-slate-500">
                    {{ option.source === 'existing' ? 'Existing data' : 'New data' }}
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
            @click="isDuplicateEmailPopupOpen = false"
          >
            Cancel
          </button>
          <button
            type="button"
            :disabled="!hasResolvedImportConflicts || isImporting"
            class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60"
            @click="handleImportConflictConfirm"
          >
            {{ isImporting ? 'Importing...' : 'Import Selected Advisor' }}
          </button>
        </div>
      </section>
    </div>

    <ExportConfirmModal
      v-if="isExportModalOpen"
      title="Export Excel"
      description="Download user data as an Excel or CSV file"
      :count-label="exportCountLabel"
      :is-exporting="isExporting"
      @close="isExportModalOpen = false"
      @export="handleExport"
    />
  </div>
</template>
