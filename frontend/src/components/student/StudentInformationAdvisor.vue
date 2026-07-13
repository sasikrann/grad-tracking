<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  updateMyStudentAdvisor,
  type StudentProfile,
} from '@/services/student-profile.api'
import type { Advisor } from '@/types/advisor'

const props = defineProps<{
  profile: StudentProfile
  advisors: Advisor[]
}>()

const emit = defineEmits<{
  updated: [profile: StudentProfile]
}>()

const maxEvidenceFileSize = 2 * 1024 * 1024
const allowedEvidenceTypes = new Set(['image/png', 'image/jpeg'])

const selectedAdvisorId = ref(props.profile.advisorId ?? '')
const selectedFile = ref<File | null>(null)
const evidenceDataUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isEditing = ref(!props.profile.advisorId)
const isSaving = ref(false)
const saveMessage = ref('')
const documentWarningMessage = ref('')

const advisorOptions = computed(() =>
  props.advisors.map((advisor) => ({
    value: advisor.advisorId,
    label: `${advisor.fullName} - ${advisor.email}`,
  })),
)
const canSubmit = computed(() => Boolean(selectedAdvisorId.value && evidenceDataUrl.value))
const isSaveMessageError = computed(
  () => Boolean(saveMessage.value) && saveMessage.value !== 'Advisor updated successfully',
)
const supportingDocumentWarning = computed(
  () => documentWarningMessage.value || 'A supporting document is required before submitting.',
)
const selectedFileSize = computed(() => {
  const file = selectedFile.value
  if (!file) return ''
  if (file.size < 1024 * 1024) return `${Math.max(1, Math.round(file.size / 1024))} KB`
  return `${(file.size / 1024 / 1024).toFixed(1)} MB`
})

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read selected file'))
    reader.readAsDataURL(file)
  })
}

function startEdit() {
  saveMessage.value = ''
  selectedAdvisorId.value = ''
  clearSelectedFile()
  isEditing.value = true
}

function cancelEdit() {
  if (!props.profile.advisorId) return
  selectedAdvisorId.value = props.profile.advisorId
  clearSelectedFile()
  isEditing.value = false
}

function clearSelectedFile() {
  selectedFile.value = null
  evidenceDataUrl.value = null
  documentWarningMessage.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function openEvidencePreview(source: string | null | undefined) {
  if (!source) return
  window.open(source, '_blank', 'noopener,noreferrer')
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  if (!file) {
    clearSelectedFile()
    return
  }
  if (!allowedEvidenceTypes.has(file.type)) {
    clearSelectedFile()
    documentWarningMessage.value = 'Please upload a PNG or JPG file'
    return
  }
  if (file.size > maxEvidenceFileSize) {
    clearSelectedFile()
    documentWarningMessage.value = 'Supporting document must not exceed 2 MB'
    return
  }

  saveMessage.value = ''
  documentWarningMessage.value = ''
  selectedFile.value = file
  evidenceDataUrl.value = await readFileAsDataUrl(file)
}

async function saveAdvisor() {
  if (!selectedAdvisorId.value) {
    saveMessage.value = 'Please select an advisor'
    return
  }
  if (!evidenceDataUrl.value) {
    documentWarningMessage.value = 'Please upload a supporting document'
    return
  }

  isSaving.value = true
  saveMessage.value = ''
  try {
    const updatedProfile = await updateMyStudentAdvisor({
      advisorId: selectedAdvisorId.value,
      advisorEvidenceUrl: evidenceDataUrl.value,
    })
    emit('updated', updatedProfile)
    selectedAdvisorId.value = updatedProfile.advisorId ?? ''
    clearSelectedFile()
    isEditing.value = false
    saveMessage.value = 'Advisor updated successfully'
  } catch (error) {
    saveMessage.value = error instanceof Error ? error.message : 'Unable to update advisor'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <h2 class="text-base font-semibold">Advisor Information</h2>
      </div>

      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Change advisor"
        :disabled="isSaving"
        @click="startEdit"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
          <path d="m14 6 4 4" />
        </svg>
      </button>
    </div>

    <div class="mt-4 rounded-lg border border-slate-200 bg-[#faf7f7] p-4">
      <p class="text-xs text-slate-500">Current Advisor</p>
      <p class="mt-1 text-sm font-semibold text-slate-900">{{ profile.advisorName || '' }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ profile.advisorEmail || '' }}</p>
    </div>

    <div v-if="isEditing" class="mt-4">
      <label for="advisor-select" class="text-sm font-semibold text-slate-900">
        Select / Change Advisor
      </label>
      <select
        id="advisor-select"
        v-model="selectedAdvisorId"
        class="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8b2a23] focus:ring-2 focus:ring-[#8b2a23]/15"
        :class="selectedAdvisorId ? 'text-slate-900' : 'text-slate-400'"
      >
        <option value="" disabled class="text-slate-400">Select advisor</option>
        <option
          v-for="advisor in advisorOptions"
          :key="advisor.value"
          :value="advisor.value"
          class="text-slate-900"
        >
          {{ advisor.label }}
        </option>
      </select>

      <label class="mt-4 block text-sm font-semibold text-slate-900" for="advisor-document">
        Supporting Document
      </label>
      <label
        v-if="!selectedFile"
        class="mt-2 flex h-16 cursor-pointer items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white text-sm text-slate-500 transition hover:border-[#8b2a23] hover:text-[#8b2a23]"
        for="advisor-document"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
        <span>Upload PNG or JPG, max 2 MB</span>
      </label>
      <input
        id="advisor-document"
        ref="fileInput"
        class="sr-only"
        type="file"
        accept="image/png,image/jpeg"
        @change="handleFileChange"
      />

      <div v-if="selectedFile" class="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          class="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-white"
          aria-label="Open selected document"
          @click="openEvidencePreview(evidenceDataUrl)"
        >
          <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-[#8b2a23]">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M14 3v6h6" />
            </svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-slate-900">{{ selectedFile.name }}</span>
            <span class="block text-xs text-slate-500">{{ selectedFileSize }}</span>
          </span>
        </button>
        <button
          type="button"
          class="flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-[#8b2a23]"
          aria-label="Remove selected document"
          @click="clearSelectedFile"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <button
        v-else-if="profile.advisorEvidenceUrl"
        class="mt-3 flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white"
        type="button"
        aria-label="Open uploaded supporting document"
        @click="openEvidencePreview(profile.advisorEvidenceUrl)"
      >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-[#8b2a23]">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M14 3v6h6" />
          </svg>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-slate-900">Uploaded supporting document</span>
          <span class="block text-xs text-slate-500">Saved file</span>
        </span>
      </button>
      <p v-else class="mt-2 text-xs text-red-600">No document uploaded</p>
      <p v-if="!evidenceDataUrl" class="mt-1 text-xs text-red-600">
        {{ supportingDocumentWarning }}
      </p>

      <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          v-if="profile.advisorId"
          type="button"
          class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
          :disabled="isSaving"
          @click="cancelEdit"
        >
          Cancel
        </button>
        <button
          type="button"
          class="h-10 rounded-lg bg-[#8b2a23] px-4 text-sm font-semibold text-white transition hover:bg-[#7a211c] disabled:cursor-default disabled:opacity-60 sm:min-w-36"
          :disabled="isSaving || !canSubmit"
          @click="saveAdvisor"
        >
          {{ isSaving ? 'Saving...' : 'Submit' }}
        </button>
      </div>
    </div>

    <p
      v-if="saveMessage"
      class="mt-3 text-sm"
      :class="isSaveMessageError ? 'font-semibold text-red-600' : 'text-slate-600'"
      role="status"
    >
      {{ saveMessage }}
    </p>
  </section>
</template>
