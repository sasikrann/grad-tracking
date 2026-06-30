<script setup lang="ts">
import { computed, ref } from 'vue'

import { resolveEvidenceUrl } from '@/services/student-milestones.api'
import type { StudentMilestone, StudentMilestoneStatus } from '@/types/milestone'

defineOptions({ name: 'StudentMilestoneCard' })

const props = defineProps<{
  milestone: StudentMilestone
  index: number
  isUploading?: boolean
  canReview?: boolean
  isReviewing?: boolean
  readonly?: boolean
}>()

const emit = defineEmits<{
  upload: [milestoneId: string, file: File]
  removeEvidence: [milestoneId: string]
  approve: [milestone: StudentMilestone]
  reject: [milestone: StudentMilestone]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

const statusStyles: Record<StudentMilestoneStatus, string> = {
  Approved: 'bg-[#49b866] text-white',
  Completed: 'bg-[#58d184] text-white',
  Missing: 'bg-[#ee3647] text-white',
  'In Progress': 'bg-[#ffbb2a] text-white',
}

const needsEvidence = computed(() =>
  !props.readonly &&
    ['Missing', 'In Progress'].includes(props.milestone.status) &&
    !props.milestone.evidenceUrl,
)
const hasReachedRevisionLimit = computed(
  () =>
    needsEvidence.value &&
    (props.milestone.rejectionCount ?? 0) >= (props.milestone.maxRejectedRevisionRounds ?? 3),
)
const canUploadEvidence = computed(() => needsEvidence.value && !hasReachedRevisionLimit.value)

const isDeadlineUrgent = computed(() =>
  ['Missing', 'In Progress'].includes(props.milestone.status) && !props.milestone.evidenceUrl,
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
const canRemoveEvidence = computed(() =>
  !props.readonly && Boolean(props.milestone.evidenceUrl) && props.milestone.status !== 'Approved',
)

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function openUploadPicker() {
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
  <article class="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-4 md:grid-cols-[2rem_minmax(0,1fr)]">
    <div class="relative flex justify-center">
      <div
        class="relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
        :class="milestone.status === 'Missing' || milestone.status === 'In Progress' ? 'bg-[#ffbb2a]' : 'bg-[#49b866]'"
      >
        {{ index }}
      </div>
    </div>

    <div
      class="rounded-lg border border-slate-200 bg-white px-4 pb-4 pt-3 shadow-sm sm:px-5 sm:pb-4 sm:pt-3"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-black">{{ milestone.title }}</h3>
          <p class="mt-0.5 text-sm text-slate-500">
            {{ milestone.description || 'Complete course registration for first semester' }}
          </p>
        </div>

        <span
          class="rounded-lg px-3 py-1.5 text-xs font-semibold leading-tight"
          :class="statusStyles[milestone.status]"
        >
          {{ milestone.status }}
        </span>
      </div>

      <div
        class="mt-2 flex items-center gap-2 text-sm"
        :class="isDeadlineUrgent ? 'text-red-600' : 'text-slate-500'"
      >
        <svg
          class="size-4 shrink-0"
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
      </div>

      <div v-if="milestone.evidenceUrl" class="mt-3 flex flex-wrap items-center gap-2">
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

      <div v-if="canUploadEvidence" class="mt-3 flex flex-wrap items-center gap-3">
        <input
          ref="fileInput"
          class="hidden"
          type="file"
          @change="handleFileChange"
        />
        <button
          type="button"
          class="inline-flex h-7 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-xs font-semibold text-black shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isUploading"
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

      <p
        v-if="!readonly && milestone.status === 'Missing'"
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

      <div v-if="milestone.advisorComment !== null" class="mt-3 flex items-center gap-3">
        <span class="text-xs font-semibold text-[#4a240f]">Comment :</span>
        <p class="min-h-6 flex-1 rounded-lg bg-[#f5dfe0] px-3 py-1 text-xs text-[#4a240f]">
          {{ milestone.advisorComment }}
        </p>
      </div>
    </div>
  </article>
</template>
