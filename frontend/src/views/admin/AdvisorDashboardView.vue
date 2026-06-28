<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AdvisorTable from '@/components/admin/AdvisorTable.vue'
import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ExportConfirmModal from '@/components/admin/ExportConfirmModal.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import {
  downloadAdvisorTemplate,
  exportAdvisors,
  getAdvisors,
  importAdvisors,
} from '@/services/advisors.api'
import type { Advisor } from '@/types/advisor'

const advisors = ref<Advisor[]>([])
const isLoading = ref(false)
const loadError = ref('')
const operationMessage = ref('')
const selectedImportFile = ref<File | null>(null)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isImporting = ref(false)
const isExporting = ref(false)
let messageTimer: ReturnType<typeof setTimeout> | undefined

const exportCountLabel = computed(() => `${advisors.value.length} total advisor`)

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
  isImportModalOpen.value = true
}

function closeImportModal() {
  if (isImporting.value) return
  selectedImportFile.value = null
  isImportModalOpen.value = false
}

async function handleImport() {
  const file = selectedImportFile.value
  if (!file) return

  operationMessage.value = ''
  isImporting.value = true
  try {
    const result = await importAdvisors(file)
    const errorText = result.errors?.length ? ` ${result.errors.join('; ')}` : ''
    showOperationMessage(
      result.failedRecords
        ? `Imported ${result.successRecords}/${result.totalRecords} advisors.${errorText}`
        : `Imported ${result.successRecords} advisors successfully`,
    )
    await loadAdvisors()
    selectedImportFile.value = null
    isImportModalOpen.value = false
  } catch (error) {
    showOperationMessage(error instanceof Error ? error.message : 'Unable to import advisors')
  } finally {
    isImporting.value = false
  }
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
      @select-file="selectedImportFile = $event"
      @close="closeImportModal"
      @import="handleImport"
    />

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
