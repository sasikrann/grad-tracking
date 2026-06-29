<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAdvisors } from '@/services/advisors.api'
import {
  getMyStudentProfile,
  updateMyStudentAdvisor,
  type StudentProfile,
} from '@/services/student-profile.api'
import type { Advisor } from '@/types/advisor'

const maxAdvisorEvidenceFileSize = 2 * 1024 * 1024
const allowedAdvisorEvidenceTypes = new Set(['image/png', 'image/jpeg'])

const profile = ref<StudentProfile | null>(null)
const advisors = ref<Advisor[]>([])
const selectedAdvisorId = ref('')
const selectedFile = ref<File | null>(null)
const evidenceDataUrl = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isLoading = ref(true)
const isEditingAdvisor = ref(false)
const isSaving = ref(false)
const loadError = ref('')
const saveMessage = ref('')

const advisorOptions = computed(() =>
  advisors.value.map((advisor) => ({
    value: advisor.advisorId,
    label: `${advisor.fullName} - ${advisor.email}`,
  })),
)

const canSubmitAdvisor = computed(() => Boolean(selectedAdvisorId.value && evidenceDataUrl.value))

const selectedFileSize = computed(() => {
  const file = selectedFile.value
  if (!file) return ''

  if (file.size < 1024 * 1024) {
    return `${Math.max(1, Math.round(file.size / 1024))} KB`
  }

  return `${(file.size / 1024 / 1024).toFixed(1)} MB`
})

const studentRows = computed(() => {
  const student = profile.value
  if (!student) return []

  return [
    { label: 'Full-Name', value: student.fullName, icon: 'user' },
    { label: 'Student ID', value: student.studentId, icon: 'id' },
    { label: 'Program', value: student.program, icon: 'cap' },
    {
      label: 'Enrollment Academic Year',
      value: String(student.enrollmentAcademicYear),
      icon: 'calendar',
    },
    { label: 'Semester', value: student.semester, icon: 'calendar' },
    {
      label: 'Expected Graduation Year',
      value: String(student.expectedGraduationYear),
      icon: 'calendar',
    },
  ]
})

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read selected file'))
    reader.readAsDataURL(file)
  })
}

async function loadPage() {
  isLoading.value = true
  loadError.value = ''

  try {
    const [studentProfile, advisorList] = await Promise.all([
      getMyStudentProfile(),
      getAdvisors(),
    ])

    profile.value = studentProfile
    advisors.value = advisorList
    selectedAdvisorId.value = studentProfile.advisorId ?? ''
    isEditingAdvisor.value = !studentProfile.advisorId
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load student information'
  } finally {
    isLoading.value = false
  }
}

function startAdvisorEdit() {
  saveMessage.value = ''
  selectedAdvisorId.value = ''
  clearSelectedFile()
  isEditingAdvisor.value = true
}

function cancelAdvisorEdit() {
  if (!profile.value?.advisorId) return
  selectedAdvisorId.value = profile.value.advisorId
  clearSelectedFile()
  isEditingAdvisor.value = false
}

function clearSelectedFile() {
  selectedFile.value = null
  evidenceDataUrl.value = null
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

  if (!allowedAdvisorEvidenceTypes.has(file.type)) {
    clearSelectedFile()
    saveMessage.value = 'Please upload a PNG or JPG file'
    return
  }

  if (file.size > maxAdvisorEvidenceFileSize) {
    clearSelectedFile()
    saveMessage.value = 'Supporting document must not exceed 2 MB'
    return
  }

  saveMessage.value = ''
  selectedFile.value = file
  evidenceDataUrl.value = await readFileAsDataUrl(file)
}

async function saveAdvisor() {
  if (!selectedAdvisorId.value) {
    saveMessage.value = 'Please select an advisor'
    return
  }

  if (!evidenceDataUrl.value) {
    saveMessage.value = 'Please upload a supporting document'
    return
  }

  isSaving.value = true
  saveMessage.value = ''

  try {
    profile.value = await updateMyStudentAdvisor({
      advisorId: selectedAdvisorId.value,
      advisorEvidenceUrl: evidenceDataUrl.value,
    })
    selectedAdvisorId.value = profile.value.advisorId ?? ''
    clearSelectedFile()
    isEditingAdvisor.value = false
    saveMessage.value = 'Advisor updated successfully'
  } catch (error) {
    saveMessage.value = error instanceof Error ? error.message : 'Unable to update advisor'
  } finally {
    isSaving.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Student Information</h1>
      <p class="mt-1 text-sm text-slate-500">View Student Information and Manage Your Advisor</p>
    </header>

    <p v-if="isLoading" class="mt-6 text-sm text-slate-500" role="status">
      Loading student information...
    </p>

    <p v-else-if="loadError" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ loadError }}
    </p>

    <template v-else-if="profile">
      <section class="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M7 3h8l4 4v14H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
              <path d="M15 3v5h5M9 13h6M9 17h6" />
            </svg>
          </div>
          <h2 class="text-base font-semibold">Study Plan Information</h2>
        </div>

        <div class="mt-4 divide-y divide-slate-200">
          <div
            v-for="row in studentRows"
            :key="row.label"
            class="grid grid-cols-[1.5rem_minmax(8rem,16rem)_1fr] items-center gap-3 py-3 text-sm"
          >
            <svg class="size-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <template v-if="row.icon === 'user'">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="8" r="4" />
              </template>
              <template v-else-if="row.icon === 'id'">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 10h4M7 14h6M16 10h2" />
              </template>
              <template v-else-if="row.icon === 'cap'">
                <path d="m3 8 9-4 9 4-9 4-9-4Z" />
                <path d="M7 10v5c2 2 8 2 10 0v-5" />
              </template>
              <template v-else>
                <rect x="4" y="5" width="16" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M4 11h16" />
              </template>
            </svg>
            <span class="font-semibold text-slate-900">{{ row.label }}</span>
            <span class="text-slate-600">{{ row.value }}</span>
          </div>
        </div>
      </section>

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
            @click="startAdvisorEdit"
          >
            <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
              <path d="m14 6 4 4" />
            </svg>
          </button>
        </div>

        <div class="mt-4 rounded-lg border border-slate-200 bg-[#faf7f7] p-4">
          <p class="text-xs text-slate-500">Current Advisor</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">
            {{ profile.advisorName || '' }}
          </p>
          <p class="mt-1 text-xs text-slate-500">
            {{ profile.advisorEmail || '' }}
          </p>
        </div>

        <div v-if="isEditingAdvisor" class="mt-4">
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
          <div
            v-if="selectedFile"
            class="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
          >
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
          <p v-else class="mt-3 text-xs text-slate-500">No document uploaded</p>
          <p v-if="!evidenceDataUrl" class="mt-3 text-xs text-slate-500">
            A supporting document is required before submitting.
          </p>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              v-if="profile.advisorId"
              type="button"
              class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
              :disabled="isSaving"
              @click="cancelAdvisorEdit"
            >
              Cancel
            </button>
            <button
              type="button"
              class="h-10 rounded-lg bg-[#8b2a23] px-4 text-sm font-semibold text-white transition hover:bg-[#7a211c] disabled:cursor-wait disabled:opacity-60 sm:min-w-36"
              :disabled="isSaving || !canSubmitAdvisor"
              @click="saveAdvisor"
            >
              {{ isSaving ? 'Saving...' : 'Submit' }}
            </button>
          </div>
        </div>
        <p v-if="saveMessage" class="mt-3 text-sm text-slate-600" role="status">
          {{ saveMessage }}
        </p>
      </section>
    </template>
  </div>
</template>
