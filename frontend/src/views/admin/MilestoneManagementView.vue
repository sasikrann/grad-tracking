<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import CopyMilestoneModal from '@/components/milestone/CopyMilestoneModal.vue'
import MilestoneFormModal from '@/components/milestone/MilestoneFormModal.vue'
import MilestoneTable from '@/components/milestone/MilestoneTable.vue'
import { standardMilestones } from '@/data/standard-milestones'
import type { EducationPlan, Milestone, MilestoneInput, MilestoneProgram } from '@/types/milestone'

const storageKey = 'grad-tracking-milestone-management-frontend-v2'
const doctoralPlanMigrationKey = 'grad-tracking-milestone-02-doctoral-plans-v1'

const milestones = ref<Milestone[]>([])
const isLoading = ref(false)
const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
let notificationTimer: ReturnType<typeof setTimeout> | undefined
const selectedSemester = ref('all')
const selectedDegreeLevel = ref<MilestoneProgram>('All')
const selectedPlan = ref<EducationPlan>('All')
const selectedYear = ref('all')
const isFormOpen = ref(false)
const isCopyOpen = ref(false)
const editingMilestone = ref<Milestone | null>(null)
const deletingMilestone = ref<Milestone | null>(null)
const isDeleteConfirmed = ref(false)
const isDeleting = ref(false)
type MilestoneFilterKey = 'semester' | 'year' | 'degreeLevel' | 'plan'
const openFilter = ref<MilestoneFilterKey | null>(null)

const filteredMilestones = computed(() =>
  milestones.value.filter((milestone) => {
    const matchesSemester =
      selectedSemester.value === 'all' ||
      milestone.semester === 'all' ||
      milestone.semester === selectedSemester.value
    const matchesDegree =
      selectedDegreeLevel.value === 'All' ||
      milestone.degreeLevel === 'All' ||
      milestone.degreeLevel === selectedDegreeLevel.value
    const matchesPlan =
      selectedPlan.value === 'All' ||
      milestone.plans.includes('All') ||
      milestone.plans.includes(selectedPlan.value)
    const matchesYear =
      selectedYear.value === 'all' ||
      !milestone.deadline ||
      new Date(milestone.deadline).getFullYear().toString() === selectedYear.value

    return matchesSemester && matchesDegree && matchesPlan && matchesYear
  }),
)

const yearOptions = computed(() => {
  const years = new Set(
    milestones.value
      .filter((milestone) => Boolean(milestone.deadline))
      .map((milestone) => new Date(milestone.deadline as string).getFullYear().toString()),
  )
  return Array.from(years).sort()
})

const filterDefinitions = computed(() => [
  {
    key: 'degreeLevel' as const,
    label:
      selectedDegreeLevel.value === 'All'
        ? 'All Program'
        : selectedDegreeLevel.value === 'Doctoral'
          ? 'Ph.D'
          : selectedDegreeLevel.value,
    options: [
      { label: 'All Program', value: 'All' },
      { label: 'Master', value: 'Master' },
      { label: 'Ph.D', value: 'Doctoral' },
    ],
  },
  {
    key: 'plan' as const,
    label: selectedPlan.value === 'All' ? 'All Plan' : selectedPlan.value,
    options: [
      { label: 'All Plan', value: 'All' },
      ...(selectedDegreeLevel.value === 'Master'
        ? ['A1', 'A2', 'B']
        : selectedDegreeLevel.value === 'Doctoral'
          ? ['1.1', '2.1', '2.2']
          : ['A1', 'A2', 'B', '1.1', '2.1', '2.2']
      ).map((plan) => ({ label: plan, value: plan })),
    ],
  },
  {
    key: 'semester' as const,
    label: selectedSemester.value === 'all' ? 'All Semester' : selectedSemester.value,
    options: [
      { label: 'All Semester', value: 'all' },
      { label: '1', value: '1' },
      { label: '2', value: '2' },
    ],
  },
  {
    key: 'year' as const,
    label: selectedYear.value === 'all' ? 'All Year' : selectedYear.value,
    options: [
      { label: 'All Year', value: 'all' },
      ...yearOptions.value.map((year) => ({ label: year, value: year })),
    ],
  },
])

const nextOrder = computed(() => {
  return (
    Math.max(
      0,
      ...milestones.value
        .filter((milestone) => milestone.degreeLevel === selectedDegreeLevel.value)
        .filter(
          (milestone) =>
            selectedSemester.value === 'all' || milestone.semester === selectedSemester.value,
        )
        .map((milestone) => milestone.sequenceOrder),
    ) + 1
  )
})

const notificationText = computed(() => errorMessage.value || message.value)

function showNotification(text: string, type: 'success' | 'error' = 'success') {
  message.value = type === 'success' ? text : ''
  errorMessage.value = type === 'error' ? text : ''
  notificationType.value = type
  // กำหนดเวลาให้ข้อความแจ้งเตือนหายไปหลังจาก 20 วินาที
  if (notificationTimer) clearTimeout(notificationTimer)
  notificationTimer = setTimeout(() => {
    message.value = ''
    errorMessage.value = ''
  }, 10000)
}

function formatMilestoneError(error: unknown, fallback: string) {
  const text = error instanceof Error ? error.message : fallback
  const readableMessages: Record<string, string> = {
    'title is required': 'Milestone could not be saved because the title is missing.',
    'openDate is required': 'Milestone could not be saved because the start date is missing.',
    'deadline is required': 'Milestone could not be saved because the deadline is missing.',
    'degreeLevel is required': 'Milestone could not be saved because the program is missing.',
    'semester is required': 'Milestone could not be saved because the semester is missing.',
    'sequenceOrder is required': 'Milestone could not be saved because the order is missing.',
  }

  return readableMessages[text] ?? text
}

function persistMilestones() {
  localStorage.setItem(storageKey, JSON.stringify(milestones.value))
}

async function loadMilestones() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const saved = localStorage.getItem(storageKey)
    const localMilestones = saved
      ? (JSON.parse(saved) as Milestone[])
      : standardMilestones.map((milestone) => ({
          ...milestone,
          plans: [...milestone.plans],
          prerequisiteMilestoneIds: [...milestone.prerequisiteMilestoneIds],
        }))

    if (!localStorage.getItem(doctoralPlanMigrationKey)) {
      const qualifyingExam = localMilestones.find(
        (milestone) => milestone.milestoneId === 'standard-milestone-02',
      )
      if (qualifyingExam?.plans.includes('All')) {
        qualifyingExam.plans = ['1.1', '2.1', '2.2']
      }
      localStorage.setItem(doctoralPlanMigrationKey, 'complete')
    }

    milestones.value = localMilestones
    persistMilestones()
  } catch (error) {
    milestones.value = []
    showNotification(
      formatMilestoneError(error, 'Unable to load standard milestones.'),
      'error',
    )
  } finally {
    isLoading.value = false
  }
}

function openAddModal() {
  editingMilestone.value = null
  isFormOpen.value = true
}

function openEditModal(milestone: Milestone) {
  editingMilestone.value = milestone
  isFormOpen.value = true
}

function openDeleteModal(milestone: Milestone) {
  deletingMilestone.value = milestone
  isDeleteConfirmed.value = false
}

function closeDeleteModal(force = false) {
  if (isDeleting.value && !force) return
  deletingMilestone.value = null
  isDeleteConfirmed.value = false
}

async function saveMilestone(input: MilestoneInput) {
  errorMessage.value = ''
  try {
    if (!input.title.trim()) throw new Error('title is required')
    if (!input.sequenceOrder || input.sequenceOrder < 1)
      throw new Error('sequenceOrder is required')
    if (!input.plans.length) throw new Error('At least one plan is required')
    const normalizedPlans: EducationPlan[] = input.plans.includes('All')
      ? ['All']
      : [...input.plans]

    if (editingMilestone.value) {
      const index = milestones.value.findIndex(
        (milestone) => milestone.milestoneId === editingMilestone.value?.milestoneId,
      )
      if (index >= 0) milestones.value[index] = {
        ...editingMilestone.value,
        ...input,
        plans: normalizedPlans,
        sequenceOrder: input.sequenceOrder as number,
        description: input.description.trim() || null,
        openDate: input.openDate || null,
        deadline: input.deadline || null,
        firstReminderDate: input.firstReminderDate || null,
        secondReminderDate: input.secondReminderDate || null,
      }
      showNotification('Milestone updated successfully')
    } else {
      milestones.value.push({
        ...input,
        milestoneId: `local-${crypto.randomUUID()}`,
        plans: normalizedPlans,
        sequenceOrder: input.sequenceOrder as number,
        prerequisiteMilestoneIds: [...input.prerequisiteMilestoneIds],
        description: input.description.trim() || null,
        openDate: input.openDate || null,
        deadline: input.deadline || null,
        firstReminderDate: input.firstReminderDate || null,
        secondReminderDate: input.secondReminderDate || null,
      })
      showNotification('Milestone added successfully')
    }
    persistMilestones()
    selectedDegreeLevel.value = input.degreeLevel
    selectedSemester.value = 'all'
    selectedPlan.value = 'All'
    selectedYear.value = input.deadline ? new Date(input.deadline).getFullYear().toString() : 'all'
    isFormOpen.value = false
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to save milestone'), 'error')
  }
}

async function removeMilestone() {
  if (!deletingMilestone.value || !isDeleteConfirmed.value) return
  errorMessage.value = ''
  isDeleting.value = true
  try {
    milestones.value = milestones.value.filter(
      (milestone) => milestone.milestoneId !== deletingMilestone.value?.milestoneId,
    )
    persistMilestones()
    showNotification('Milestone deleted successfully')
    closeDeleteModal(true)
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to delete milestone'), 'error')
  } finally {
    isDeleting.value = false
  }
}

async function setMilestoneStatus(milestone: Milestone, isEnabled: boolean) {
  errorMessage.value = ''
  try {
    milestone.isEnabled = isEnabled
    persistMilestones()
    showNotification(
      isEnabled ? 'Milestone enabled successfully' : 'Milestone disabled successfully',
    )
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to update milestone'), 'error')
  }
}

async function moveMilestoneOrder(milestoneId: string, direction: 'up' | 'down') {
  errorMessage.value = ''
  try {
    const current = milestones.value.find((milestone) => milestone.milestoneId === milestoneId)
    if (!current) throw new Error('Milestone not found')
    const siblings = milestones.value
      .filter((milestone) => milestone.degreeLevel === current.degreeLevel)
      .filter((milestone) => milestone.semester === current.semester)
      .sort((first, second) => first.sequenceOrder - second.sequenceOrder)
    const currentIndex = siblings.findIndex((milestone) => milestone.milestoneId === milestoneId)
    const target = siblings[currentIndex + (direction === 'up' ? -1 : 1)]
    if (target) {
      const currentOrder = current.sequenceOrder
      current.sequenceOrder = target.sequenceOrder
      target.sequenceOrder = currentOrder
      persistMilestones()
    }
    showNotification('Milestone order updated successfully')
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to reorder milestone'), 'error')
  }
}

async function copyMilestoneTemplates(
  fromDegreeLevel: Exclude<MilestoneProgram, 'All'>,
  toDegreeLevel: Exclude<MilestoneProgram, 'All'>,
  fromSemester: string,
  toSemester: string,
  toYear: string,
  milestoneIds: string[],
) {
  errorMessage.value = ''
  try {
    const selected = milestones.value.filter((milestone) =>
      milestoneIds.includes(milestone.milestoneId),
    )
    const nextOrderStart = Math.max(
      0,
      ...milestones.value
        .filter((milestone) => milestone.degreeLevel === toDegreeLevel)
        .filter((milestone) => milestone.semester === toSemester)
        .map((milestone) => milestone.sequenceOrder),
    )
    const shiftYear = (value: string | null) =>
      !value || toYear === 'all' ? value : `${toYear}${value.slice(4)}`
    milestones.value.push(
      ...selected.map((milestone, index) => ({
        ...milestone,
        milestoneId: `local-${crypto.randomUUID()}`,
        degreeLevel: toDegreeLevel,
        semester: toSemester,
        plans: ['All' as const],
        prerequisiteMilestoneIds: [],
        sequenceOrder: nextOrderStart + index + 1,
        openDate: shiftYear(milestone.openDate),
        deadline: shiftYear(milestone.deadline),
        firstReminderDate: shiftYear(milestone.firstReminderDate),
        secondReminderDate: shiftYear(milestone.secondReminderDate),
        isStandard: false,
      })),
    )
    persistMilestones()
    showNotification(`Copied ${selected.length} milestones successfully`)
    selectedDegreeLevel.value = toDegreeLevel
    selectedSemester.value = 'all'
    selectedYear.value = toYear
    isCopyOpen.value = false
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to copy milestones'), 'error')
  }
}

function selectedFilterValue(key: MilestoneFilterKey) {
  if (key === 'semester') return selectedSemester.value
  if (key === 'year') return selectedYear.value
  if (key === 'plan') return selectedPlan.value
  return selectedDegreeLevel.value
}

function selectFilter(key: MilestoneFilterKey, value: string) {
  if (key === 'semester') selectedSemester.value = value
  if (key === 'year') selectedYear.value = value
  if (key === 'plan') selectedPlan.value = value as EducationPlan
  if (key === 'degreeLevel') {
    selectedDegreeLevel.value = value as MilestoneProgram
    selectedPlan.value = 'All'
  }
  openFilter.value = null
}

function closeDropdown() {
  openFilter.value = null
}

onMounted(() => {
  loadMilestones()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
  if (notificationTimer) clearTimeout(notificationTimer)
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 font-sans text-slate-900">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Milestone Management</h1>
        <p class="mt-1 text-sm text-slate-500">Create, Edit and manage milestone</p>
      </div>

      <div class="flex gap-3">
        <button
          type="button"
          class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#7a211c]"
          @click="openAddModal"
        >
          + Add Milestone
        </button>
        <button
          type="button"
          class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#7a211c]"
          @click="isCopyOpen = true"
        >
          ⧉ Copy Milestone
        </button>
      </div>
    </header>

    <section
      class="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Milestones</h2>
          <p class="mt-2 text-xs text-slate-500">
            {{ filteredMilestones.length }} milestones configured
          </p>
        </div>

        <div class="flex gap-3">
          <div v-for="filter in filterDefinitions" :key="filter.key" class="relative" @click.stop>
            <button
              type="button"
              class="flex h-9 min-w-32 items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 text-left text-xs shadow-sm outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
              :class="{ 'border-[#8a2b25]': openFilter === filter.key }"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="whitespace-nowrap">{{ filter.label }}</span>
              <svg
                class="size-4 shrink-0 text-slate-500 transition-transform"
                :class="{ 'rotate-180': openFilter === filter.key }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>

            <div
              v-if="openFilter === filter.key"
              class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-slate-100 bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <button
                v-for="option in filter.options"
                :key="option.value"
                type="button"
                class="flex w-full items-center justify-between gap-4 whitespace-nowrap rounded-md px-3 py-2 text-left text-xs hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': selectedFilterValue(filter.key) === option.value }"
                @click="selectFilter(filter.key, option.value)"
              >
                {{ option.label }}
                <svg
                  v-if="selectedFilterValue(filter.key) === option.value"
                  class="size-4 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <MilestoneTable
        :milestones="filteredMilestones"
        :is-loading="isLoading"
        :group-by-semester="false"
        @edit="openEditModal"
        @remove="openDeleteModal"
        @set-enabled="setMilestoneStatus"
        @move="moveMilestoneOrder"
      />
    </section>

    <MilestoneFormModal
      v-if="isFormOpen"
      :milestone="editingMilestone"
      :milestones="milestones"
      :default-degree-level="selectedDegreeLevel"
      :default-semester="selectedSemester"
      :default-order="nextOrder"
      @close="isFormOpen = false"
      @save="saveMilestone"
    />

    <CopyMilestoneModal
      v-if="isCopyOpen"
      :milestones="milestones"
      :year-options="yearOptions"
      @close="isCopyOpen = false"
      @copy="copyMilestoneTemplates"
    />

    <div
      v-if="deletingMilestone"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-milestone-title"
    >
      <section class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="delete-milestone-title" class="text-xl font-semibold text-slate-900">
          Delete Milestone
        </h2>
        <p class="mt-2 text-sm text-slate-600">
          Do you want to delete milestone
          <span class="font-semibold text-slate-900">"{{ deletingMilestone.title }}"</span>?
        </p>

        <label class="mt-5 flex items-center gap-3 text-sm text-slate-700">
          <input
            v-model="isDeleteConfirmed"
            type="checkbox"
            class="size-4 rounded-full accent-[#7D2923]"
            :disabled="isDeleting"
          />
          <span>Yes, I want to delete this milestone.</span>
        </label>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-4 py-2 text-xs"
            :disabled="isDeleting"
            @click="closeDeleteModal()"
          >
            Cancel
          </button>
          <button
            type="button"
            class="rounded-md bg-[#7D2923] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!isDeleteConfirmed || isDeleting"
            @click="removeMilestone"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </section>
    </div>

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
