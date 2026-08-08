<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { resolveEvidenceUrl } from '@/services/student-milestones.api'
import MilestoneSelectDropdown from '@/components/milestone/form/MilestoneSelectDropdown.vue'
import type { StudentMilestone, StudentMilestoneStatus } from '@/types/milestone'
import type { Advisor } from '@/types/advisor'
import { milestoneStatusColor } from '@/utils/milestone-status'

defineOptions({ name: 'StudentMilestoneCard' })

const props = defineProps<{
  milestone: StudentMilestone
  index: number
  isUploading?: boolean
  canReview?: boolean
  isReviewing?: boolean
  readonly?: boolean
  canUpload?: boolean
  uploadError?: string
  advisors?: Advisor[]
  currentAdvisorId?: string | null
  currentCoAdvisorIds?: string[]
  isSavingAppointment?: boolean
  appointmentError?: string
  currentGraduationSemester?: string | null
  currentGraduationAcademicYear?: number | null
  isSavingGraduation?: boolean
  graduationError?: string
}>()

const emit = defineEmits<{
  upload: [milestoneId: string, file: File]
  uploadBlocked: [milestoneId: string, message: string]
  removeEvidence: [milestoneId: string]
  approve: [milestone: StudentMilestone]
  reject: [milestone: StudentMilestone]
  appointAdvisor: [input: { milestoneId: string; advisorId: string; coAdvisorIds: string[] }]
  submitGraduation: [input: { milestoneId: string; semester: string; academicYear: number }]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedAdvisorId = ref(props.currentAdvisorId ?? '')
const selectedCoAdvisorIds = ref([...(props.currentCoAdvisorIds ?? []), '', ''].slice(0, 2))
const openAdvisorDropdown = ref<'advisor' | 'coAdvisor1' | 'coAdvisor2' | null>(null)
const graduationSemester = ref(props.currentGraduationSemester ?? '')
const graduationAcademicYear = ref(
  props.currentGraduationAcademicYear ? String(props.currentGraduationAcademicYear) : '',
)
const graduationSemesterDropdownOpen = ref(false)
watch(
  () => [props.currentAdvisorId, ...(props.currentCoAdvisorIds ?? [])],
  () => {
    selectedAdvisorId.value = props.currentAdvisorId ?? ''
    selectedCoAdvisorIds.value = [...(props.currentCoAdvisorIds ?? []), '', ''].slice(0, 2)
  },
)

const statusStyles: Record<StudentMilestoneStatus, string> = {
  Approved: 'bg-[#49b866] text-white',
  Completed: 'bg-[#49b866] text-white',
  Missing: 'bg-[#d90010] text-white',
  'In Progress': 'bg-[#ffbb2a] text-white',
}
const displayStatus = computed(() => {
  if (props.milestone.status === 'Approved') return 'Completed'
  if (props.milestone.status === 'Missing') return 'Late'
  return props.milestone.status
})
const isAdvisorApproved = computed(() => props.milestone.status === 'Approved')
const hasAdvisorComment = computed(() => Boolean(props.milestone.advisorComment?.trim()))
const referenceLinks = computed(() =>
  (props.milestone.references ?? []).filter((reference) => /^https?:\/\//i.test(reference)),
)
const referenceLabels = computed(() =>
  (props.milestone.references ?? []).filter((reference) => !/^https?:\/\//i.test(reference)),
)
const isAdvisorAppointment = computed(() =>
  Boolean(props.milestone.templateKey?.endsWith('advisor-appointment')),
)
const isGraduationMilestone = computed(() =>
  Boolean(props.milestone.templateKey?.endsWith('graduation')),
)
const showGraduationForm = computed(
  () =>
    isGraduationMilestone.value &&
    !props.readonly &&
    ['Missing', 'In Progress'].includes(props.milestone.status),
)
const graduationSemesterOptions = [
  { value: '', label: 'Select semester' },
  { value: '1', label: 'Semester 1' },
  { value: '2', label: 'Semester 2' },
]
function selectGraduationSemester(value: string) {
  graduationSemester.value = value
  graduationSemesterDropdownOpen.value = false
}
function submitGraduation() {
  const academicYear = Number(graduationAcademicYear.value)
  if (!graduationSemester.value || !Number.isInteger(academicYear)) return
  emit('submitGraduation', {
    milestoneId: props.milestone.milestoneId,
    semester: graduationSemester.value,
    academicYear,
  })
}
const showAdvisorAppointment = computed(
  () =>
    isAdvisorAppointment.value &&
    !props.readonly &&
    ['Missing', 'In Progress'].includes(props.milestone.status),
)
const advisorOptions = computed(() => props.advisors ?? [])
const primaryAdvisorOptions = computed(() => [
  { value: '', label: 'Select advisor' },
  ...advisorOptions.value.map((advisor) => ({
    value: advisor.advisorId,
    label: `${advisor.fullName} - ${advisor.email}`,
  })),
])
function coAdvisorOptions(slotIndex: number) {
  const otherId = selectedCoAdvisorIds.value[slotIndex === 0 ? 1 : 0]
  return advisorOptions.value.filter(
    (advisor) => advisor.advisorId !== selectedAdvisorId.value && advisor.advisorId !== otherId,
  )
}
function coAdvisorDropdownOptions(slotIndex: number) {
  return [
    { value: '', label: 'No co-advisor' },
    ...coAdvisorOptions(slotIndex).map((advisor) => ({
      value: advisor.advisorId,
      label: `${advisor.fullName} - ${advisor.email}`,
    })),
  ]
}
function selectPrimaryAdvisor(value: string) {
  selectedAdvisorId.value = value
  selectedCoAdvisorIds.value = selectedCoAdvisorIds.value.map((id) => (id === value ? '' : id))
  openAdvisorDropdown.value = null
}
function selectCoAdvisor(slotIndex: number, value: string) {
  selectedCoAdvisorIds.value[slotIndex] = value
  openAdvisorDropdown.value = null
}
function toggleAdvisorDropdown(dropdown: 'advisor' | 'coAdvisor1' | 'coAdvisor2') {
  if (props.isSavingAppointment) return
  openAdvisorDropdown.value = openAdvisorDropdown.value === dropdown ? null : dropdown
}
function submitAdvisorAppointment() {
  if (!selectedAdvisorId.value || props.isSavingAppointment) return
  emit('appointAdvisor', {
    milestoneId: props.milestone.milestoneId,
    advisorId: selectedAdvisorId.value,
    coAdvisorIds: selectedCoAdvisorIds.value.filter(Boolean),
  })
}

const needsEvidence = computed(
  () =>
    !props.readonly &&
    ['Missing', 'In Progress'].includes(props.milestone.status) &&
    !props.milestone.evidenceUrl &&
    !isAdvisorAppointment.value &&
    !isGraduationMilestone.value,
)
const isLocked = computed(() => Boolean(props.milestone.isLocked))
const hasReachedRevisionLimit = computed(
  () =>
    needsEvidence.value &&
    (props.milestone.rejectionCount ?? 0) >= (props.milestone.maxRejectedRevisionRounds ?? 3),
)
const showUploadEvidence = computed(() => needsEvidence.value && !hasReachedRevisionLimit.value)
const canUploadEvidence = computed(
  () => showUploadEvidence.value && !isLocked.value && (props.canUpload ?? true),
)

const isDeadlineUrgent = computed(
  () =>
    !isLocked.value &&
    ['Missing', 'In Progress'].includes(props.milestone.status) &&
    !props.milestone.evidenceUrl,
)
const evidenceHref = computed(() => {
  if (!props.milestone.evidenceUrl) return ''
  return resolveEvidenceUrl(props.milestone.evidenceUrl)
})
const evidenceName = computed(() => {
  const value = props.milestone.evidenceUrl ?? ''
  const fileName = decodeURIComponent(value.split('/').pop() || value)
  return fileName.replace(/^\d+-/, '')
})
const canRemoveEvidence = computed(
  () =>
    !props.readonly &&
    Boolean(props.milestone.evidenceUrl) &&
    props.milestone.status !== 'Approved',
)

function formatDate(value: string | null) {
  if (!value) return 'Not specified'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function openUploadPicker() {
  if (isLocked.value) {
    return
  }

  if (!(props.canUpload ?? true)) {
    emit(
      'uploadBlocked',
      props.milestone.milestoneId,
      'Please complete the Appoint an Advisor milestone before uploading this evidence.',
    )
    return
  }

  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  emit('upload', props.milestone.milestoneId, file)
  input.value = ''
}
</script>

<template>
  <article
    class="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 md:grid-cols-[2rem_minmax(0,1fr)]"
  >
    <div class="relative flex justify-center">
      <div
        class="relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
        :class="milestoneStatusColor(milestone.status)"
      >
        {{ index }}
      </div>
    </div>

    <div
      class="rounded-lg border border-slate-200 bg-white px-4 pb-4 pt-3 shadow-sm sm:px-5 sm:pb-4 sm:pt-3"
      :class="{ 'border-slate-200 bg-slate-100 text-slate-400 shadow-none': isLocked }"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div class="min-w-0">
          <h3 class="text-base font-semibold" :class="isLocked ? 'text-slate-500' : 'text-black'">
            {{ milestone.title }}
          </h3>
          <p v-if="milestone.description" class="mt-0.5 text-sm text-slate-500">
            {{ milestone.description }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span
            v-if="isAdvisorApproved"
            class="flex size-5 items-center justify-center rounded-full bg-[#49b866] text-white"
            aria-label="Approved by advisor"
          >
            <svg
              class="size-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          <span
            class="min-w-20 rounded-lg px-3 py-1.5 text-center text-xs font-semibold leading-tight"
            :class="statusStyles[milestone.status]"
          >
            {{ displayStatus }}
          </span>
        </div>
      </div>

      <div
        class="space-y-1 text-sm"
        :class="milestone.description ? 'mt-2' : 'mt-0.5'"
      >
        <span
          class="flex items-center gap-1.5"
          :class="
            isLocked ? 'text-slate-500' : isDeadlineUrgent ? 'text-red-600' : 'text-slate-500'
          "
        >
          <svg
            class="size-4 shrink-0 text-black"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
          <span>Deadline : {{ formatDate(milestone.deadline) }}</span>
        </span>
        <div
          v-if="referenceLinks.length || referenceLabels.length"
          class="mt-2! text-xs"
        >
          <p
            v-for="reference in referenceLabels"
            :key="reference"
            class="text-slate-600"
          >
            {{ reference }}
          </p>
          <a
            v-for="reference in referenceLinks"
            :key="reference"
            class="block break-all text-[#5277ff] underline"
            :href="reference"
            target="_blank"
            rel="noreferrer"
          >
            Reference : {{ reference }}
          </a>
        </div>
      </div>

      <p
        v-if="milestone.lockedReason"
        class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
      >
        {{ milestone.lockedReason }}
      </p>

      <div v-if="showAdvisorAppointment" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <MilestoneSelectDropdown
          label="Advisor *"
          :model-value="selectedAdvisorId"
          :options="primaryAdvisorOptions"
          :open="openAdvisorDropdown === 'advisor'"
          @toggle="toggleAdvisorDropdown('advisor')"
          @select="selectPrimaryAdvisor"
        />

        <div class="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div v-for="slotIndex in 2" :key="slotIndex" class="min-w-0">
            <MilestoneSelectDropdown
              :label="`Co-advisor ${slotIndex} (Optional)`"
              :model-value="selectedCoAdvisorIds[slotIndex - 1] ?? ''"
              :options="coAdvisorDropdownOptions(slotIndex - 1)"
              :open="openAdvisorDropdown === `coAdvisor${slotIndex}`"
              @toggle="toggleAdvisorDropdown(slotIndex === 1 ? 'coAdvisor1' : 'coAdvisor2')"
              @select="selectCoAdvisor(slotIndex - 1, $event)"
            />
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="h-9 rounded-lg bg-[#8b2a23] px-5 text-sm font-semibold text-white hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!selectedAdvisorId || isSavingAppointment || isLocked"
            @click="submitAdvisorAppointment"
          >
            {{ isSavingAppointment ? 'Saving...' : 'Submit' }}
          </button>
        </div>
        <p v-if="appointmentError" class="mt-3 text-xs text-red-600" role="alert">
          {{ appointmentError }}
        </p>
      </div>

      <div v-if="showGraduationForm" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <MilestoneSelectDropdown
            label="Graduation Semester *"
            :model-value="graduationSemester"
            :options="graduationSemesterOptions"
            :open="graduationSemesterDropdownOpen"
            @toggle="graduationSemesterDropdownOpen = !graduationSemesterDropdownOpen"
            @select="selectGraduationSemester"
          />
          <label class="block min-w-0 text-xs font-semibold">
            Graduation Academic Year *
            <input
              v-model="graduationAcademicYear"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{4}"
              maxlength="4"
              placeholder="e.g. 2569"
              class="mt-1 h-10 w-full rounded-lg border border-[#c9827c] bg-white px-3 text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none focus:border-[#7D2923]"
              :disabled="isSavingGraduation"
              @input="graduationAcademicYear = graduationAcademicYear.replace(/\D/g, '').slice(0, 4)"
            />
          </label>
        </div>
        <p v-if="graduationSemester && graduationAcademicYear" class="mt-3 text-sm text-slate-600">
          Graduation term: <span class="font-semibold">{{ graduationSemester }}/{{ graduationAcademicYear }}</span>
        </p>
        <div class="mt-4 flex justify-end">
          <button
            type="button"
            class="h-9 rounded-lg bg-[#8b2a23] px-5 text-sm font-semibold text-white hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!graduationSemester || graduationAcademicYear.length !== 4 || isSavingGraduation || isLocked"
            @click="submitGraduation"
          >
            {{ isSavingGraduation ? 'Saving...' : 'Submit' }}
          </button>
        </div>
        <p v-if="graduationError" class="mt-3 text-xs text-red-600" role="alert">
          {{ graduationError }}
        </p>
      </div>

      <div
        v-else-if="isGraduationMilestone && currentGraduationSemester && currentGraduationAcademicYear"
        class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-slate-700"
      >
        <span class="font-semibold text-slate-900">Graduation term:</span>
        {{ currentGraduationSemester }}/{{ currentGraduationAcademicYear }}
      </div>

      <div
        v-if="milestone.evidenceUrl"
        class="mt-3 flex flex-wrap items-center justify-between gap-x-5 gap-y-2"
      >
        <div v-if="milestone.evidenceUrl" class="flex flex-wrap items-center gap-2">
          <a
            class="break-all text-sm text-[#00a000] hover:underline"
            :href="evidenceHref"
            target="_blank"
            rel="noreferrer"
          >
            {{ evidenceName }}
          </a>
          <button
            v-if="canRemoveEvidence"
            type="button"
            class="flex size-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold leading-none text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Remove evidence"
            :disabled="isUploading"
            @click="emit('removeEvidence', milestone.milestoneId)"
          >
            ×
          </button>
        </div>
      </div>

      <div v-if="canReview" class="mt-3 flex justify-end gap-3">
        <button
          type="button"
          class="h-7 min-w-28 rounded bg-[#8a2b25] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isReviewing"
          @click="emit('approve', milestone)"
        >
          Approve
        </button>
        <button
          type="button"
          class="h-7 min-w-28 rounded border border-slate-300 bg-[#f3f3f3] px-4 text-xs font-semibold text-black shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isReviewing"
          @click="emit('reject', milestone)"
        >
          Reject
        </button>
      </div>

      <div v-if="showUploadEvidence" class="mt-3 flex flex-wrap items-center gap-3">
        <input ref="fileInput" class="hidden" type="file" @change="handleFileChange" />
        <button
          type="button"
          class="inline-flex h-7 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-black shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :aria-disabled="!canUploadEvidence || isUploading"
          :disabled="isUploading || isLocked"
          @click="openUploadPicker"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 3v12M7 8l5-5 5 5" />
            <path d="M5 15v4h14v-4" />
          </svg>
          {{ isUploading ? 'Uploading...' : 'Upload Evidence' }}
        </button>
      </div>

      <p v-if="uploadError" class="mt-4 rounded-lg bg-[#feecec] px-3 py-2 text-xs text-[#8a2b25]">
        {{ uploadError }}
      </p>

      <p
        v-if="!readonly && milestone.status === 'Missing' && !isAdvisorAppointment && !isGraduationMilestone"
        class="mt-4 rounded-lg bg-[#fff7e8] px-3 py-2 text-xs text-[#3b2708]"
      >
        Please upload supporting evidence to complete this milestone.
      </p>

      <p
        v-if="hasReachedRevisionLimit"
        class="mt-4 rounded-lg bg-[#feecec] px-3 py-2 text-xs text-[#8a2b25]"
      >
        This submission has reached the maximum of
        {{ milestone.maxRejectedRevisionRounds }} rejected revision rounds.
      </p>

      <div
        v-if="hasAdvisorComment"
        class="mt-3 rounded bg-[#f5dfe0] px-3 py-1 text-xs text-[#4a240f]"
      >
        <span class="font-semibold">Comment :</span>
        {{ milestone.advisorComment }}
      </div>
    </div>
  </article>
</template>
