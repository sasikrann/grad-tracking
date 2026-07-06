<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import CopyMilestoneModal from '@/components/milestone/CopyMilestoneModal.vue'
import MilestoneFormModal from '@/components/milestone/MilestoneFormModal.vue'
import MilestoneTable from '@/components/milestone/MilestoneTable.vue'
import {
  copyMilestones,
  createMilestone,
  deleteMilestone,
  getMilestones,
  moveMilestone,
  setMilestoneEnabled,
  updateMilestone,
} from '@/services/milestones.api'
import type { DegreeLevel, Milestone, MilestoneInput } from '@/types/milestone'

const milestones = ref<Milestone[]>([])
const isLoading = ref(false)
const message = ref('')
const errorMessage = ref('')
const notificationType = ref<'success' | 'error'>('success')
let notificationTimer: ReturnType<typeof setTimeout> | undefined
const selectedSemester = ref('all')
const selectedDegreeLevel = ref<DegreeLevel>('Master')
const selectedYear = ref('all')
const isFormOpen = ref(false)
const isCopyOpen = ref(false)
const editingMilestone = ref<Milestone | null>(null)
type MilestoneFilterKey = 'semester' | 'year' | 'degreeLevel'
const openFilter = ref<MilestoneFilterKey | null>(null)

const filteredMilestones = computed(() =>
  milestones.value.filter((milestone) => {
    const matchesSemester =
      selectedSemester.value === 'all' || milestone.semester === selectedSemester.value
    const matchesDegree = milestone.degreeLevel === selectedDegreeLevel.value
    const matchesYear =
      selectedYear.value === 'all' ||
      new Date(milestone.deadline).getFullYear().toString() === selectedYear.value

    return matchesSemester && matchesDegree && matchesYear
  }),
)

const yearOptions = computed(() => {
  const years = new Set(
    milestones.value.map((milestone) => new Date(milestone.deadline).getFullYear().toString()),
  )
  return Array.from(years).sort()
})

const filterDefinitions = computed(() => [
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
  {
    key: 'degreeLevel' as const,
    label: selectedDegreeLevel.value === 'Doctoral' ? 'Ph.D' : selectedDegreeLevel.value,
    options: [
      { label: 'Master', value: 'Master' },
      { label: 'Ph.D', value: 'Doctoral' },
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

async function loadMilestones() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    milestones.value = await getMilestones()
  } catch (error) {
    milestones.value = []
    const text = error instanceof Error ? error.message : 'Unable to load milestones'
    if (!text.includes('not found')) {
      showNotification('ไม่สามารถโหลดข้อมูล milestone ได้ กรุณาลองใหม่อีกครั้ง', 'error')
    }
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

async function saveMilestone(input: MilestoneInput) {
  errorMessage.value = ''
  try {
    if (editingMilestone.value) {
      await updateMilestone(editingMilestone.value.milestoneId, input)
      showNotification('Milestone updated successfully')
    } else {
      await createMilestone(input)
      showNotification('Milestone added successfully')
    }
    selectedDegreeLevel.value = input.degreeLevel
    selectedSemester.value = 'all'
    selectedYear.value = new Date(input.deadline).getFullYear().toString()
    isFormOpen.value = false
    await loadMilestones()
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to save milestone'), 'error')
  }
}

async function removeMilestone(milestoneId: string) {
  if (!confirm('Delete this milestone?')) return
  errorMessage.value = ''
  try {
    await deleteMilestone(milestoneId)
    showNotification('Milestone deleted successfully')
    await loadMilestones()
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to delete milestone'), 'error')
  }
}

async function setMilestoneStatus(milestone: Milestone, isEnabled: boolean) {
  errorMessage.value = ''
  try {
    await setMilestoneEnabled(milestone.milestoneId, isEnabled)
    showNotification(
      isEnabled ? 'Milestone enabled successfully' : 'Milestone disabled successfully',
    )
    await loadMilestones()
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to update milestone'), 'error')
  }
}

async function moveMilestoneOrder(milestoneId: string, direction: 'up' | 'down') {
  errorMessage.value = ''
  try {
    await moveMilestone(milestoneId, direction)
    showNotification('Milestone order updated successfully')
    await loadMilestones()
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to reorder milestone'), 'error')
  }
}

async function copyMilestoneTemplates(
  fromDegreeLevel: DegreeLevel,
  toDegreeLevel: DegreeLevel,
  fromSemester: string,
  toSemester: string,
  toYear: string,
  milestoneIds: string[],
) {
  errorMessage.value = ''
  try {
    const result = await copyMilestones(
      fromDegreeLevel,
      toDegreeLevel,
      fromSemester,
      toSemester,
      toYear,
      milestoneIds,
    )
    showNotification(`Copied ${result.copiedRecords} milestones successfully`)
    selectedDegreeLevel.value = toDegreeLevel
    selectedSemester.value = toSemester
    selectedYear.value = toYear
    isCopyOpen.value = false
    await loadMilestones()
  } catch (error) {
    showNotification(formatMilestoneError(error, 'Unable to copy milestones'), 'error')
  }
}

function selectedFilterValue(key: MilestoneFilterKey) {
  if (key === 'semester') return selectedSemester.value
  if (key === 'year') return selectedYear.value
  return selectedDegreeLevel.value
}

function selectFilter(key: MilestoneFilterKey, value: string) {
  if (key === 'semester') selectedSemester.value = value
  if (key === 'year') selectedYear.value = value
  if (key === 'degreeLevel') selectedDegreeLevel.value = value as DegreeLevel
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
        :group-by-semester="selectedSemester === 'all'"
        @edit="openEditModal"
        @remove="removeMilestone"
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
