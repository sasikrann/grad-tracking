<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import MilestoneFormModal from '@/components/milestone/MilestoneFormModal.vue'
import MilestoneTable from '@/components/milestone/MilestoneTable.vue'
import { formatAcademicYear, useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import {
  createMilestone,
  deleteMilestone,
  getMilestones,
  moveMilestone,
  setMilestoneEnabled,
  updateMilestone,
} from '@/services/milestones.api'
import { getStudents } from '@/services/students.api'
import type { EducationPlan, Milestone, MilestoneInput, MilestoneProgram } from '@/types/milestone'
import type { Student } from '@/types/student'
const milestones = ref<Milestone[]>([])
const students = ref<Student[]>([])
const { language, t } = useLanguage()
const isLoading = ref(false)
const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
let notificationTimer: ReturnType<typeof setTimeout> | undefined
const selectedDegreeLevel = ref<MilestoneProgram>('Master')
const selectedPlan = ref<EducationPlan>('A1')
const selectedYear = ref<number | null>(null)
const isFormOpen = ref(false)
const editingMilestone = ref<Milestone | null>(null)
const deletingMilestone = ref<Milestone | null>(null)
const isDeleteConfirmed = ref(false)
const isDeleting = ref(false)
type MilestoneFilterKey = 'year' | 'degreeLevel' | 'plan'
const openFilter = ref<MilestoneFilterKey | null>(null)

function planLabel(plan: EducationPlan) {
  const keys = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  } as const
  return plan === 'All' || plan === '1.1' ? (plan === 'All' ? t('common.allPlan') : plan) : t(keys[plan])
}

const filteredMilestones = computed(() =>
  milestones.value
    .filter((milestone) => {
      const matchesDegree =
        milestone.degreeLevel === selectedDegreeLevel.value
      const matchesPlan =
        milestone.plans.includes(selectedPlan.value)
      const matchesYear =
        selectedYear.value === null || milestone.academicYear === selectedYear.value

      return matchesDegree && matchesPlan && matchesYear
    })
    .sort((first, second) => first.sequenceOrder - second.sequenceOrder),
)

const yearOptions = computed(() => {
  const years = new Set(
    students.value.map((student) => Number(student.enrollmentAcademicYear)),
  )
  return Array.from(years)
    .filter(Number.isInteger)
    .sort((first, second) => second - first)
})

function studentDegree(student: Student): MilestoneProgram {
  return student.degree === 'Master' ? 'Master' : 'Doctoral'
}

const degreeOptions = computed(() =>
  Array.from(
    new Set(
      students.value
        .filter(
          (student) =>
            selectedYear.value === null ||
            Number(student.enrollmentAcademicYear) === selectedYear.value,
        )
        .map(studentDegree),
    ),
  ),
)

const planOptions = computed(() =>
  Array.from(
    new Set(
      students.value
        .filter(
          (student) =>
            (selectedYear.value === null ||
              Number(student.enrollmentAcademicYear) === selectedYear.value) &&
            studentDegree(student) === selectedDegreeLevel.value,
        )
        .map((student) => student.educationPlan)
        .filter((plan) => plan && plan !== '-')
        .map((plan) => plan as EducationPlan),
    ),
  ),
)

function syncStudentFilters() {
  if (!yearOptions.value.includes(selectedYear.value ?? Number.NaN)) {
    selectedYear.value = yearOptions.value[0] ?? null
  }
  if (!degreeOptions.value.includes(selectedDegreeLevel.value)) {
    selectedDegreeLevel.value = degreeOptions.value[0] ?? 'Master'
  }
  if (!planOptions.value.includes(selectedPlan.value)) {
    selectedPlan.value = planOptions.value[0] ?? (selectedDegreeLevel.value === 'Doctoral' ? '2.1' : 'A1')
  }
}

const filterDefinitions = computed(() => [
  {
    key: 'degreeLevel' as const,
    label:
      selectedDegreeLevel.value === 'Doctoral' ? t('common.doctoral') : t('common.master'),
    options: [
      ...degreeOptions.value.map((degree) => ({
        label: degree === 'Doctoral' ? t('common.doctoral') : t('common.master'),
        value: degree,
      })),
    ],
  },
  {
    key: 'plan' as const,
    label: planLabel(selectedPlan.value),
    options: [
      ...planOptions.value.map((plan) => ({ label: planLabel(plan), value: plan })),
    ],
  },
  {
    key: 'year' as const,
    label:
      selectedYear.value === null
        ? t('common.academicYear')
        : formatAcademicYear(selectedYear.value, language.value),
    options: [
      ...yearOptions.value.map((year) => ({
        label: formatAcademicYear(year, language.value),
        value: String(year),
      })),
    ],
  },
])

const nextOrder = computed(() => {
  return (
    Math.max(
      0,
      ...milestones.value
        .filter(
          (milestone) =>
            milestone.degreeLevel === selectedDegreeLevel.value &&
            milestone.academicYear === selectedYear.value &&
            milestone.plans.includes(selectedPlan.value),
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
    'degreeLevel is required': 'Milestone could not be saved because the program is missing.',
    'sequenceOrder is required': 'Milestone could not be saved because the order is missing.',
  }

  return readableMessages[text] ?? text
}

async function loadMilestones({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  if (!silent) errorMessage.value = ''
  try {
    const [milestoneList, studentList] = await Promise.all([getMilestones(), getStudents()])
    milestones.value = milestoneList
    students.value = studentList
    syncStudentFilters()
  } catch (error) {
    milestones.value = []
    students.value = []
    showNotification(
      formatMilestoneError(error, 'Unable to load milestones.'),
      'error',
    )
  } finally {
    if (!silent) isLoading.value = false
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
    const normalizedInput: MilestoneInput = {
      ...input,
      academicYear: selectedYear.value ?? input.academicYear,
      semester: 'all',
      plans: normalizedPlans,
      description: input.description.trim(),
      references: input.references.map((reference) => reference.trim()).filter(Boolean),
      openDate: '',
    }

    if (editingMilestone.value) {
      await updateMilestone(editingMilestone.value.milestoneId, normalizedInput, selectedPlan.value)
      showNotification('Milestone updated successfully')
    } else {
      await createMilestone(normalizedInput)
      showNotification('Milestone added successfully')
    }
    await loadMilestones()
    selectedDegreeLevel.value = input.degreeLevel
    selectedPlan.value = normalizedPlans.includes(selectedPlan.value)
      ? selectedPlan.value
      : normalizedPlans[0] ?? 'A1'
    selectedYear.value = normalizedInput.academicYear
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
    await deleteMilestone(deletingMilestone.value.milestoneId)
    await loadMilestones()
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
    if (milestone.isEnabled === isEnabled) return
    await setMilestoneEnabled(milestone.milestoneId, isEnabled)
    await loadMilestones()
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
    await moveMilestone(milestoneId, direction)
    await loadMilestones()
    showNotification('Milestone order updated successfully')
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to reorder milestone'), 'error')
  }
}

function selectedFilterValue(key: MilestoneFilterKey) {
  if (key === 'year') return selectedYear.value === null ? '' : String(selectedYear.value)
  if (key === 'plan') return selectedPlan.value
  return selectedDegreeLevel.value
}

function selectFilter(key: MilestoneFilterKey, value: string) {
  if (key === 'year') {
    selectedYear.value = Number(value)
    syncStudentFilters()
  }
  if (key === 'plan') selectedPlan.value = value as EducationPlan
  if (key === 'degreeLevel') {
    selectedDegreeLevel.value = value as MilestoneProgram
    if (!planOptions.value.includes(selectedPlan.value)) {
      selectedPlan.value = planOptions.value[0] ?? (value === 'Doctoral' ? '2.1' : 'A1')
    }
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

useAutoRefresh(() => loadMilestones({ silent: true }), {
  canRefresh: () => !isFormOpen.value && !deletingMilestone.value && !isDeleting.value,
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-8">
    <header class="flex flex-col items-start justify-between gap-4 sm:flex-row">
      <div>
        <h1 class="text-xl font-bold tracking-tight sm:text-3xl">
          {{ t('milestone.pageTitle') }}
        </h1>
        <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
          {{ t('milestone.pageDescription') }}
        </p>
      </div>

      <div class="flex w-full gap-3 sm:w-auto">
        <button
          type="button"
          class="w-full rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium whitespace-nowrap text-white shadow-sm hover:bg-[#7a211c] sm:w-36"
          @click="openAddModal"
        >
          + {{ t('milestone.add') }}
        </button>
      </div>
    </header>

    <section
      class="mt-6 min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-6 shadow-[0_2px_4px_rgba(0,0,0,0.18)] sm:px-6"
    >
      <div class="flex min-w-0 flex-col items-start justify-between gap-4 lg:flex-row">
        <div class="shrink-0">
          <h2 class="text-lg font-semibold">{{ t('milestone.milestones') }}</h2>
          <p class="mt-2 text-xs text-slate-500">
            {{ t('milestone.configured', { count: filteredMilestones.length }) }}
          </p>
        </div>

        <div class="grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
          <div
            v-for="filter in filterDefinitions"
            :key="filter.key"
            class="relative min-w-0 lg:w-36"
            @click.stop
          >
            <button
              type="button"
              class="flex h-9 w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-4 text-left text-xs whitespace-nowrap shadow-sm outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
              :class="{ 'border-[#8a2b25]': openFilter === filter.key }"
              :disabled="filter.options.length === 0"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="min-w-0 truncate">{{ filter.label }}</span>
              <svg
                v-if="filter.options.length"
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
              v-if="openFilter === filter.key && filter.options.length"
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
      :filter-degree-level="selectedDegreeLevel"
      :filter-plan="selectedPlan"
      :default-academic-year="selectedYear ?? new Date().getFullYear()"
      :default-order="nextOrder"
      @close="isFormOpen = false"
      @save="saveMilestone"
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
          {{ t('milestone.deleteTitle') }}
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
          <span>{{ t('milestone.deleteAgreement') }}</span>
        </label>

        <div class="mt-6 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-4 py-2 text-xs"
            :disabled="isDeleting"
            @click="closeDeleteModal()"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            class="rounded-md bg-[#7D2923] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!isDeleteConfirmed || isDeleting"
            @click="removeMilestone"
          >
            {{ isDeleting ? t('common.loading') : t('common.delete') }}
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
