<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { createEvidencePreviewUrl } from '@/services/student-milestones.api'
import { useLanguage } from '@/composables/useLanguage'
import MilestoneSelectDropdown from '@/components/milestone/form/MilestoneSelectDropdown.vue'
import type { StudentMilestone, StudentMilestoneStatus } from '@/types/milestone'
import type { Advisor } from '@/types/advisor'
import { milestoneStatusColor } from '@/utils/milestone-status'

defineOptions({ name: 'StudentMilestoneCard' })
const { isThai, t } = useLanguage()

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
  mobileCollapsible?: boolean
  mobileDescriptionOnly?: boolean
  mobileDescriptionLineLimit?: number
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
const isOpeningEvidence = ref(false)
const evidenceOpenError = ref('')
const isEvidencePreviewOpen = ref(false)
const evidencePreviewUrl = ref('')
const evidencePreviewType = ref<'image' | 'pdf' | null>(null)
let bodyOverflowBeforeEvidencePreview = ''
const isMobileExpanded = ref(false)
const mobileDescriptionMeasure = ref<HTMLElement | null>(null)
const hasLongMobileDescription = ref(false)
let descriptionResizeObserver: ResizeObserver | null = null
const acceptedEvidenceTypes = new Set(['image/png', 'image/jpeg', 'application/pdf'])
type EvidenceFileHandle = { getFile: () => Promise<File> }
type EvidenceFilePicker = (options: {
  types: Array<{ description: string; accept: Record<string, string[]> }>
  excludeAcceptAllOption: boolean
  multiple: boolean
}) => Promise<EvidenceFileHandle[]>
const selectedAdvisorId = ref(props.currentAdvisorId ?? '')
const selectedCoAdvisorIds = ref([...(props.currentCoAdvisorIds ?? []), '', ''].slice(0, 2))
const openAdvisorDropdown = ref<'advisor' | 'coAdvisor1' | 'coAdvisor2' | null>(null)
const graduationSemester = ref(props.currentGraduationSemester ?? '')
const graduationAcademicYear = ref(
  props.currentGraduationAcademicYear ? String(props.currentGraduationAcademicYear) : '',
)
const graduationSemesterDropdownOpen = ref(false)
const collapsedDescriptionParts = computed(() => {
  const description = props.milestone.description?.trim()
  if (!description) return []

  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (lines.length > 1) return lines.slice(0, 2)

  return description
    .split(/\s*(?=\([^)]*[\u0E00-\u0E7F])/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
})

function toggleMobileDetails(event: MouseEvent) {
  if (!props.mobileCollapsible || window.matchMedia('(min-width: 640px)').matches) return
  if ((event.target as HTMLElement).closest('button, a, input, select, textarea, label')) return
  isMobileExpanded.value = !isMobileExpanded.value
}

function updateMobileDescriptionLength() {
  const element = mobileDescriptionMeasure.value
  if (!element || !props.mobileCollapsible || !props.milestone.description) {
    hasLongMobileDescription.value = false
    return
  }

  const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight)
  const lineLimit = props.mobileDescriptionLineLimit ?? 2
  hasLongMobileDescription.value = element.scrollHeight > lineHeight * lineLimit + 1
}

onMounted(() => {
  void nextTick(() => {
    updateMobileDescriptionLength()
    if (mobileDescriptionMeasure.value) {
      descriptionResizeObserver = new ResizeObserver(updateMobileDescriptionLength)
      descriptionResizeObserver.observe(mobileDescriptionMeasure.value)
    }
  })
})

onBeforeUnmount(() => {
  descriptionResizeObserver?.disconnect()
  if (evidencePreviewUrl.value) URL.revokeObjectURL(evidencePreviewUrl.value)
  if (isEvidencePreviewOpen.value) {
    document.body.style.overflow = bodyOverflowBeforeEvidencePreview
  }
})

watch(
  () => props.milestone.milestoneId,
  () => {
    isMobileExpanded.value = false
    void nextTick(updateMobileDescriptionLength)
  },
)
watch(
  () => props.milestone.description,
  () => void nextTick(updateMobileDescriptionLength),
)
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
  if (['Approved', 'Completed'].includes(props.milestone.status)) {
    return t('milestone.statusCompleted')
  }
  if (props.milestone.status === 'Missing') return t('milestone.statusLate')
  return t('milestone.statusInProgress')
})
const isAdvisorApproved = computed(() => props.milestone.status === 'Approved')
const hasAdvisorComment = computed(() => Boolean(props.milestone.advisorComment?.trim()))
const referenceLinks = computed(() =>
  (props.milestone.references ?? []).filter((reference) => /^https?:\/\//i.test(reference)),
)
const referenceLabels = computed(() =>
  (props.milestone.references ?? []).filter((reference) => !/^https?:\/\//i.test(reference)),
)
const collapsedReferenceLabels = computed(() =>
  referenceLabels.value.filter((reference) => /\bDGC\w*/i.test(reference)),
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
    { value: '', label: 'Select co-advisor' },
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
const canRemoveEvidence = computed(
  () =>
    !props.readonly &&
    Boolean(props.milestone.evidenceUrl) &&
    props.milestone.status !== 'Approved',
)

async function openEvidence() {
  if (!props.milestone.evidenceUrl || isOpeningEvidence.value) return
  evidenceOpenError.value = ''
  isOpeningEvidence.value = true
  isEvidencePreviewOpen.value = true
  evidencePreviewType.value = null

  try {
    evidencePreviewUrl.value = await createEvidencePreviewUrl(props.milestone.evidenceUrl)
    evidencePreviewType.value = props.milestone.evidenceUrl.toLowerCase().endsWith('.pdf')
      ? 'pdf'
      : 'image'
  } catch (error) {
    evidenceOpenError.value = error instanceof Error ? error.message : 'Unable to open evidence'
  } finally {
    isOpeningEvidence.value = false
  }
}

function closeEvidencePreview() {
  if (evidencePreviewUrl.value) URL.revokeObjectURL(evidencePreviewUrl.value)
  evidencePreviewUrl.value = ''
  evidencePreviewType.value = null
  evidenceOpenError.value = ''
  isEvidencePreviewOpen.value = false
}

watch(isEvidencePreviewOpen, (isOpen) => {
  if (isOpen) {
    bodyOverflowBeforeEvidencePreview = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = bodyOverflowBeforeEvidencePreview
})

function formatDate(value: string | null) {
  if (!value) return 'Not specified'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

async function openUploadPicker() {
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

  const showOpenFilePicker = (window as Window & { showOpenFilePicker?: EvidenceFilePicker })
    .showOpenFilePicker

  if (showOpenFilePicker) {
    try {
      const [fileHandle] = await showOpenFilePicker.call(window, {
        types: [
          {
            description: 'PNG, JPG, or PDF files',
            accept: {
              'image/png': ['.png'],
              'image/jpeg': ['.jpg', '.jpeg'],
              'application/pdf': ['.pdf'],
            },
          },
        ],
        excludeAcceptAllOption: true,
        multiple: false,
      })
      const file = await fileHandle?.getFile()
      if (file && acceptedEvidenceTypes.has(file.type)) {
        emit('upload', props.milestone.milestoneId, file)
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
    }
    return
  }

  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (acceptedEvidenceTypes.has(file.type)) {
    emit('upload', props.milestone.milestoneId, file)
  }
  input.value = ''
}
</script>

<template>
  <article
    class="relative grid grid-cols-[1.5rem_minmax(0,1fr)] md:grid-cols-[2rem_minmax(0,1fr)]"
    :class="mobileCollapsible ? 'gap-2.5 sm:gap-4' : 'gap-4'"
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
      class="rounded-lg border border-slate-200 bg-white shadow-sm sm:px-5 sm:pb-4 sm:pt-3"
      :class="[
        { 'border-slate-200 bg-slate-100 text-slate-400 shadow-none': isLocked },
        mobileCollapsible ? 'cursor-pointer px-3 pb-3 pt-2.5 sm:cursor-default' : 'px-4 pb-4 pt-3',
      ]"
      @click="toggleMobileDetails"
    >
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div class="relative min-w-0">
          <h3
            class="font-semibold"
            :class="[
              isLocked ? 'text-slate-500' : 'text-black',
              mobileCollapsible ? 'text-sm sm:text-base' : 'text-base',
            ]"
          >
            {{ milestone.title }}
          </h3>
          <p
            v-if="milestone.description"
            class="mt-0.5 whitespace-pre-line wrap-break-word text-slate-500"
            :class="[
              { 'hidden sm:block': mobileCollapsible && !isMobileExpanded },
              mobileCollapsible ? 'text-xs sm:text-sm' : 'text-sm',
            ]"
          >
            {{ milestone.description }}
          </p>
          <p
            v-if="mobileCollapsible && milestone.description"
            ref="mobileDescriptionMeasure"
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 top-0 invisible whitespace-pre-line wrap-break-word text-xs sm:hidden"
          >
            {{ milestone.description }}
          </p>
          <div
            v-if="mobileCollapsible && !isMobileExpanded && collapsedDescriptionParts.length"
            class="mt-1 space-y-0.5 text-xs text-slate-500 sm:hidden"
          >
            <p v-for="part in collapsedDescriptionParts" :key="part" class="line-clamp-1">
              {{ part }}{{ part.endsWith('...') ? '' : ' ...' }}
            </p>
          </div>
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
            class="rounded-lg text-center font-semibold leading-tight"
            :class="[
              statusStyles[milestone.status],
              mobileCollapsible
                ? 'w-24 px-2 py-1 text-[10px] sm:px-2.5 sm:text-xs'
                : 'w-24 px-2.5 py-1 text-xs',
            ]"
          >
            {{ displayStatus }}
          </span>
        </div>
      </div>

      <div
        v-if="mobileCollapsible && !mobileDescriptionOnly && !isMobileExpanded"
        class="mt-2 space-y-1 text-[11px] sm:hidden"
      >
        <span
          class="flex items-center gap-1.5"
          :class="
            isLocked ? 'text-slate-500' : isDeadlineUrgent ? 'text-red-600' : 'text-slate-500'
          "
        >
          <svg
            class="size-3.5 shrink-0 text-black"
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
        <p
          v-for="reference in collapsedReferenceLabels"
          :key="reference"
          class="truncate text-slate-600"
        >
          {{ reference }}
        </p>
        <div class="-mt-2! flex min-w-0 items-center justify-between gap-2">
          <div class="min-w-0 flex-1">
            <a
              v-for="reference in referenceLinks"
              :key="reference"
              class="block truncate text-[#5277ff] underline"
              :href="reference"
              target="_blank"
              rel="noreferrer"
            >
              Reference : {{ reference }}
            </a>
          </div>
          <button
            v-if="hasLongMobileDescription"
            type="button"
            class="flex size-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#8a2b25]"
            :aria-expanded="isMobileExpanded"
            :aria-label="isThai ? 'ดูรายละเอียดทั้งหมด' : 'View all details'"
            @click.stop="isMobileExpanded = true"
          >
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path d="m7 10 5 5 5-5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        :class="{
          'hidden sm:block': mobileCollapsible && !mobileDescriptionOnly && !isMobileExpanded,
        }"
      >
        <div
          class="space-y-1"
          :class="[
            milestone.description ? 'mt-2' : 'mt-0.5',
            mobileCollapsible ? 'text-[11px] sm:text-sm' : 'text-sm',
          ]"
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
            v-if="
              referenceLinks.length ||
              referenceLabels.length ||
              (mobileDescriptionOnly && hasLongMobileDescription)
            "
            class="mt-2! flex items-end justify-between gap-2"
            :class="mobileCollapsible ? 'text-[11px] sm:text-xs' : 'text-xs'"
          >
            <div class="min-w-0 flex-1">
              <p v-for="reference in referenceLabels" :key="reference" class="text-slate-600">
                {{ reference }}
              </p>
              <a
                v-for="reference in referenceLinks"
                :key="reference"
                class="block break-all text-[#5277ff] underline"
                :class="mobileDescriptionOnly ? 'max-w-full w-fit sm:w-auto' : ''"
                :href="reference"
                target="_blank"
                rel="noreferrer"
              >
                Reference : {{ reference }}
              </a>
            </div>
            <button
              v-if="
                mobileCollapsible &&
                hasLongMobileDescription &&
                (mobileDescriptionOnly || isMobileExpanded)
              "
              type="button"
              class="flex size-6 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-[#8a2b25] sm:hidden"
              :aria-expanded="isMobileExpanded"
              :aria-label="
                mobileDescriptionOnly
                  ? isMobileExpanded
                    ? isThai
                      ? 'ซ่อนคำอธิบาย'
                      : 'Hide description'
                    : isThai
                      ? 'ดูคำอธิบายทั้งหมด'
                      : 'View full description'
                  : isThai
                    ? 'ซ่อนรายละเอียด'
                    : 'Hide details'
              "
              @click.stop="isMobileExpanded = !isMobileExpanded"
            >
              <svg
                class="size-4"
                :class="{ 'rotate-180': isMobileExpanded }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </div>
        </div>

        <div
          v-if="showAdvisorAppointment"
          class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <MilestoneSelectDropdown
            label="Advisor *"
            :model-value="selectedAdvisorId"
            :options="primaryAdvisorOptions"
            :open="openAdvisorDropdown === 'advisor'"
            clearable
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
                clearable
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

        <div
          v-if="showGraduationForm"
          class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <MilestoneSelectDropdown
              label="Graduation Semester *"
              :model-value="graduationSemester"
              :options="graduationSemesterOptions"
              :open="graduationSemesterDropdownOpen"
              hide-empty-option
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
                @input="
                  graduationAcademicYear = graduationAcademicYear.replace(/\D/g, '').slice(0, 4)
                "
              />
            </label>
          </div>
          <p
            v-if="graduationSemester && graduationAcademicYear"
            class="mt-3 text-sm text-slate-600"
          >
            Graduation term:
            <span class="font-semibold">{{ graduationSemester }}/{{ graduationAcademicYear }}</span>
          </p>
          <div class="mt-4 flex justify-end">
            <button
              type="button"
              class="h-9 rounded-lg bg-[#8b2a23] px-5 text-sm font-semibold text-white hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="
                !graduationSemester ||
                graduationAcademicYear.length !== 4 ||
                isSavingGraduation ||
                isLocked
              "
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
          v-else-if="
            isGraduationMilestone && currentGraduationSemester && currentGraduationAcademicYear
          "
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
            <button
              type="button"
              class="text-sm text-[#00a000] hover:underline disabled:cursor-wait disabled:opacity-60"
              :disabled="isOpeningEvidence"
              @click="openEvidence"
            >
              {{
                isOpeningEvidence ? t('milestone.openingAttachment') : t('milestone.viewAttachment')
              }}
            </button>
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

        <p v-if="evidenceOpenError" class="mt-2 text-xs text-red-600" role="alert">
          {{ evidenceOpenError }}
        </p>

        <div v-if="canReview" class="mt-3 grid w-full grid-cols-2 gap-3 sm:flex sm:justify-end">
          <button
            type="button"
            class="h-7 w-full rounded bg-[#8a2b25] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#75201b] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-28"
            :disabled="isReviewing"
            @click="emit('approve', milestone)"
          >
            Approve
          </button>
          <button
            type="button"
            class="h-7 w-full rounded border border-slate-300 bg-[#f3f3f3] px-4 text-xs font-semibold text-black shadow-sm hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-28"
            :disabled="isReviewing"
            @click="emit('reject', milestone)"
          >
            Reject
          </button>
        </div>

        <div v-if="showUploadEvidence" class="mt-3 flex flex-wrap items-center gap-3">
          <input
            ref="fileInput"
            class="hidden"
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
            @change="handleFileChange"
          />
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
          <p class="text-[11px] text-amber-700">
            Please upload a PNG, JPG, or PDF file (maximum 2 MB).
          </p>
        </div>

        <p
          v-if="milestone.lockedReason"
          class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {{ milestone.lockedReason }}
        </p>

        <p v-if="uploadError" class="mt-4 rounded-lg bg-[#feecec] px-3 py-2 text-xs text-[#8a2b25]">
          {{ uploadError }}
        </p>

        <p
          v-if="
            !readonly &&
            milestone.status === 'Missing' &&
            !isAdvisorAppointment &&
            !isGraduationMilestone
          "
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
    </div>

    <div
      v-if="isEvidencePreviewOpen"
      class="fixed inset-0 z-[60] flex flex-col bg-black/80"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-preview-title"
    >
      <header class="flex items-center justify-between gap-3 bg-white px-4 py-3 shadow-sm">
        <h2
          id="evidence-preview-title"
          class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-950"
        >
          {{ t('milestone.viewAttachment') }}
        </h2>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          aria-label="Close evidence preview"
          @click="closeEvidencePreview"
        >
          <svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back
        </button>
      </header>

      <div class="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
        <p v-if="isOpeningEvidence" class="text-sm font-medium text-white">
          {{ t('milestone.openingAttachment') }}
        </p>
        <p
          v-else-if="evidenceOpenError"
          class="rounded-lg bg-white px-4 py-3 text-sm text-red-600"
        >
          {{ evidenceOpenError }}
        </p>
        <img
          v-else-if="evidencePreviewType === 'image'"
          :src="evidencePreviewUrl"
          alt="Milestone evidence"
          class="max-h-full max-w-full rounded-lg bg-white object-contain shadow-xl"
        />
        <iframe
          v-else-if="evidencePreviewType === 'pdf'"
          :src="evidencePreviewUrl"
          title="Milestone evidence"
          class="h-full w-full max-w-5xl rounded-lg bg-white shadow-xl"
        ></iframe>
      </div>
    </div>
  </article>
</template>
