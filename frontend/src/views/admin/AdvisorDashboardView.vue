<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import AdvisorTable from '@/components/admin/AdvisorTable.vue'
import DashboardActionCard from '@/components/admin/DashboardActionCard.vue'
import ExportConfirmModal from '@/components/admin/ExportConfirmModal.vue'
import ImportFileModal from '@/components/admin/ImportFileModal.vue'
import {
  AdvisorImportConflictError,
  deleteAdvisor,
  downloadAdvisorTemplate,
  exportAdvisors,
  getAdvisorsPage,
  importAdvisors,
  updateAdvisorStatus,
} from '@/services/advisors.api'
import type { AdvisorImportConflict, AdvisorImportResult } from '@/services/advisors.api'
import type { Advisor } from '@/types/advisor'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'

const { t } = useLanguage()

const advisors = ref<Advisor[]>([])
const search = ref('')
const page = ref(1)
const pagination = ref({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 })
const isLoading = ref(false)
const loadError = ref('')
const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
const selectedImportFile = ref<File | null>(null)
const isImportModalOpen = ref(false)
const isExportModalOpen = ref(false)
const isDuplicateEmailModalOpen = ref(false)
const importConflicts = ref<AdvisorImportConflict[]>([])
const importResolutions = ref<Record<string, string>>({})
const isImporting = ref(false)
const isExporting = ref(false)
let messageTimer: ReturnType<typeof setTimeout> | undefined
let searchTimer: ReturnType<typeof setTimeout> | undefined

const notificationText = computed(() => errorMessage.value || message.value)
const exportCountLabel = computed(() => `${pagination.value.totalRecords} total advisor`)
const paginationItems = computed<Array<number | 'ellipsis'>>(() => {
  const total = pagination.value.totalPages
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  if (page.value <= 3) return [1, 2, 3, 4, 'ellipsis']
  if (page.value >= total - 2) return ['ellipsis', total - 3, total - 2, total - 1, total]
  return ['ellipsis', page.value - 1, page.value, page.value + 1, 'ellipsis']
})
const hasResolvedImportConflicts = computed(() =>
  importConflicts.value.every((conflict) => Boolean(importResolutions.value[conflict.key])),
)
const duplicateAdvisorMessage =
  'Some advisor emails already exist. Please choose which advisor record to keep before importing.'

function advisorStatusLabel(status: Advisor['status']) {
  return status === 'active' ? 'Active' : 'Inactive'
}

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

async function loadAdvisors({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  loadError.value = ''
  try {
    const result = await getAdvisorsPage({ page: page.value, limit: 10, search: search.value })
    advisors.value = result.advisors
    pagination.value = result.pagination
    if (page.value > 1 && result.advisors.length === 0) {
      page.value = 1
      await loadAdvisors({ silent })
      return
    }
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load advisors'
  } finally {
    if (!silent) isLoading.value = false
  }
}

watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    void loadAdvisors()
  }, 300)
})

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > pagination.value.totalPages || nextPage === page.value) return
  page.value = nextPage
  void loadAdvisors()
}

function resetImportConflicts() {
  importConflicts.value = []
  importResolutions.value = {}
  isDuplicateEmailModalOpen.value = false
}

function resetImportState() {
  selectedImportFile.value = null
  resetImportConflicts()
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

function showImportResult(result: AdvisorImportResult) {
  const errorText = result.errors?.length
    ? ` ${result.errors.map((error) => removeRowPrefix(error)).join('; ')}`
    : ''
  showNotification(
    result.failedRecords
      ? `Imported ${result.successRecords}/${result.totalRecords} advisors.${errorText}`
      : `Imported ${result.successRecords} advisors successfully.`,
    result.failedRecords ? 'error' : 'success',
  )
}

function removeRowPrefix(text: string) {
  return text.replace(/\bRow\s+\d+:\s*/gi, '')
}

function advisorImportErrorMessage(error: unknown) {
  const message = removeRowPrefix(error instanceof Error ? error.message : '')
  const readableMessages: Record<string, string> = {
    'Please enter a valid email address because this email is duplicated.': duplicateAdvisorMessage,
    'Please choose one advisor for each duplicated email.':
      'Please choose one advisor record for each duplicated email.',
  }

  return (readableMessages[message] ?? message) || 'Unable to import advisors. Please try again.'
}

async function finishImport(result: AdvisorImportResult) {
  showImportResult(result)
  await loadAdvisors()
  resetImportState()
  isImportModalOpen.value = false
}

async function handleImport(resolutions?: Record<string, string>) {
  const file = selectedImportFile.value
  if (!file) return

  message.value = ''
  errorMessage.value = ''
  isImporting.value = true
  try {
    const result = await importAdvisors(file, resolutions)
    await finishImport(result)
  } catch (error) {
    if (error instanceof AdvisorImportConflictError) {
      importConflicts.value = error.conflicts
      importResolutions.value = {}
      isDuplicateEmailModalOpen.value = true
      return
    }
    showNotification(advisorImportErrorMessage(error), 'error')
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
  resetImportConflicts()
}

function closeDuplicateEmailModal() {
  isDuplicateEmailModalOpen.value = false
}

async function handleExport() {
  message.value = ''
  errorMessage.value = ''
  isExporting.value = true
  try {
    await exportAdvisors()
    showNotification('Exported advisors successfully.')
    isExportModalOpen.value = false
  } catch (error) {
    showNotification(
      error instanceof Error ? error.message : 'Unable to export advisors. Please try again.',
      'error',
    )
  } finally {
    isExporting.value = false
  }
}

async function handleStatusChange(advisorId: string, status: Advisor['status']) {
  try {
    const updated = await updateAdvisorStatus(advisorId, status)
    advisors.value = advisors.value.map((advisor) =>
      advisor.advisorId === advisorId ? updated : advisor,
    )
    showNotification(`Advisor status changed to ${advisorStatusLabel(status)}.`)
  } catch (error) {
    showNotification(
      error instanceof Error ? error.message : 'Unable to update advisor status.',
      'error',
    )
  }
}

async function handleDelete(advisorId: string) {
  try {
    await deleteAdvisor(advisorId)
    await loadAdvisors()
  } catch (error) {
    showNotification(error instanceof Error ? error.message : 'Unable to delete advisor.', 'error')
  }
}

onMounted(loadAdvisors)
onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
  if (searchTimer) clearTimeout(searchTimer)
})

useAutoRefresh(() => loadAdvisors({ silent: true }), {
  canRefresh: () =>
    !isImportModalOpen.value &&
    !isExportModalOpen.value &&
    !isDuplicateEmailModalOpen.value &&
    !isImporting.value &&
    !isExporting.value,
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-3 py-3 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8">
    <header class="flex items-start justify-between gap-2 sm:flex-wrap sm:gap-4">
      <div>
        <h1 class="text-xl font-bold tracking-tight sm:text-3xl">
          {{ t('advisor.pageTitle') }}
        </h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('advisor.pageDescription') }}
        </p>
      </div>

      <button
        type="button"
        class="mt-1.5 shrink-0 rounded-md bg-[#8b2a23] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#7a211c] sm:mt-0 sm:rounded-lg sm:text-sm"
        @click="downloadAdvisorTemplate"
      >
        {{ t('dashboard.downloadTemplate') }}
      </button>
    </header>

    <section class="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-5" aria-label="Import and export">
      <DashboardActionCard
        :title="t('dashboard.importExcel')"
        :description="t('dashboard.uploadAdvisors')"
        tone="red"
        mobile-horizontal
        :busy="isImporting"
        :busy-label="t('dashboard.importing')"
        @click="openImportModal"
      />

      <DashboardActionCard
        :title="t('dashboard.exportExcel')"
        :description="t('dashboard.downloadAdvisors')"
        tone="green"
        mobile-horizontal
        :busy="isExporting"
        :busy-label="t('dashboard.exporting')"
        @click="isExportModalOpen = true"
      />
    </section>

    <AdvisorTable
      v-model:search="search"
      :advisors="advisors"
      :is-loading="isLoading"
      :error="loadError"
      @status="handleStatusChange"
      @delete="handleDelete"
    />

    <nav v-if="pagination.totalPages > 1" class="mt-5 flex justify-end" aria-label="Advisor pages">
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
      v-if="isImportModalOpen && !isDuplicateEmailModalOpen"
      :title="t('dashboard.importAdvisor')"
      :description="t('dashboard.bulkAdvisors')"
      :selected-file="selectedImportFile"
      :is-importing="isImporting"
      @select-file="handleImportFileSelect"
      @close="closeImportModal"
      @import="handleImport"
    />

    <div
      v-if="isDuplicateEmailModalOpen"
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
            @click="closeDuplicateEmailModal"
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
