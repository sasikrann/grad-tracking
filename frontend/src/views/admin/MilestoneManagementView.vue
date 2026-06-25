<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

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
const selectedSemester = ref('all')
const selectedDegreeLevel = ref<DegreeLevel>('Master')
const selectedYear = ref('all')
const isFormOpen = ref(false)
const isCopyOpen = ref(false)
const editingMilestone = ref<Milestone | null>(null)

const filteredMilestones = computed(() =>
  milestones.value.filter((milestone) => {
    const matchesSemester = selectedSemester.value === 'all'
    const matchesDegree = milestone.degreeLevel === selectedDegreeLevel.value
    const matchesYear =
      selectedYear.value === 'all' || new Date(milestone.deadline).getFullYear().toString() === selectedYear.value

    return matchesSemester && matchesDegree && matchesYear
  }),
)

const yearOptions = computed(() => {
  const years = new Set(milestones.value.map((milestone) => new Date(milestone.deadline).getFullYear().toString()))
  return Array.from(years).sort()
})

const nextOrder = computed(() => {
  return (
    Math.max(
      0,
      ...milestones.value
        .filter((milestone) => milestone.degreeLevel === selectedDegreeLevel.value)
        .map((milestone) => milestone.sequenceOrder),
    ) + 1
  )
})

async function loadMilestones() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    milestones.value = await getMilestones()
  } catch (error) {
    milestones.value = []
    const text = error instanceof Error ? error.message : 'Unable to load milestones'
    errorMessage.value = text.includes('not found') ? '' : text
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
      message.value = 'Milestone updated successfully'
    } else {
      await createMilestone(input)
      message.value = 'Milestone added successfully'
    }
    selectedDegreeLevel.value = input.degreeLevel
    selectedYear.value = new Date(input.deadline).getFullYear().toString()
    isFormOpen.value = false
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to save milestone'
  }
}

async function removeMilestone(milestoneId: string) {
  if (!confirm('Delete this milestone?')) return
  errorMessage.value = ''
  try {
    await deleteMilestone(milestoneId)
    message.value = 'Milestone deleted successfully'
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to delete milestone'
  }
}

async function setMilestoneStatus(milestone: Milestone, isEnabled: boolean) {
  errorMessage.value = ''
  try {
    await setMilestoneEnabled(milestone.milestoneId, isEnabled)
    message.value = ''
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to update milestone'
  }
}

async function moveMilestoneOrder(milestoneId: string, direction: 'up' | 'down') {
  errorMessage.value = ''
  try {
    await moveMilestone(milestoneId, direction)
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to reorder milestone'
  }
}

async function copyMilestoneTemplates(
  fromDegreeLevel: DegreeLevel,
  toDegreeLevel: DegreeLevel,
  milestoneIds: string[],
) {
  errorMessage.value = ''
  try {
    const result = await copyMilestones(fromDegreeLevel, toDegreeLevel, milestoneIds)
    message.value = `Copied ${result.copiedRecords} milestones successfully`
    selectedDegreeLevel.value = toDegreeLevel
    isCopyOpen.value = false
    await loadMilestones()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to copy milestones'
  }
}

onMounted(loadMilestones)
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

    <p v-if="message" class="mt-4 text-sm text-slate-600">{{ message }}</p>
    <p v-if="errorMessage" class="mt-4 text-sm text-red-600">{{ errorMessage }}</p>

    <section class="mt-6 rounded-xl border border-slate-200 bg-white px-6 py-6 shadow-[0_2px_4px_rgba(0,0,0,0.18)]">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold">Milestones</h2>
          <p class="mt-2 text-xs text-slate-500">{{ filteredMilestones.length }} milestones configured</p>
        </div>

        <div class="flex gap-3">
          <select v-model="selectedSemester" class="h-9 rounded-lg border border-slate-100 bg-white px-4 text-xs shadow-sm">
            <option value="all">All Semester</option>
          </select>

          <select v-model="selectedYear" class="h-9 rounded-lg border border-slate-100 bg-white px-4 text-xs shadow-sm">
            <option value="all">All Year</option>
            <option v-for="year in yearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>

          <select v-model="selectedDegreeLevel" class="h-9 rounded-lg border border-slate-100 bg-white px-4 text-xs shadow-sm">
            <option value="Master">Master</option>
            <option value="Doctoral">Ph.D</option>
          </select>
        </div>
      </div>

      <MilestoneTable
        :milestones="filteredMilestones"
        :is-loading="isLoading"
        @edit="openEditModal"
        @remove="removeMilestone"
        @set-enabled="setMilestoneStatus"
        @move="moveMilestoneOrder"
      />
    </section>

    <MilestoneFormModal
      v-if="isFormOpen"
      :milestone="editingMilestone"
      :default-degree-level="selectedDegreeLevel"
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
  </div>
</template>
