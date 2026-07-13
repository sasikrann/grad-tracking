<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import DateInput from './DateInput.vue'
import type { EducationPlan, Milestone, MilestoneInput, MilestoneProgram } from '@/types/milestone'

const props = defineProps<{
  milestone: Milestone | null
  milestones: Milestone[]
  defaultDegreeLevel: MilestoneProgram
  defaultSemester: string
  defaultOrder: number
}>()

const emit = defineEmits<{
  close: []
  save: [input: MilestoneInput]
}>()

const form = reactive<MilestoneInput>({
  degreeLevel: props.defaultDegreeLevel,
  semester: props.defaultSemester === 'all' ? '1' : props.defaultSemester,
  plans: ['All'],
  title: '',
  description: '',
  sequenceOrder: props.defaultOrder,
  openDate: '',
  deadline: '',
  firstReminderDate: '',
  secondReminderDate: '',
  prerequisiteMilestoneIds: [],
  isEnabled: true,
})

const isEditing = computed(() => Boolean(props.milestone))
const isPlanDropdownOpen = ref(false)
const planOptions = computed<EducationPlan[]>(() => {
  if (form.degreeLevel === 'Master') return ['All', 'A1', 'A2', 'B']
  if (form.degreeLevel === 'Doctoral') return ['All', '1.1', '2.1', '2.2']
  return ['All', 'A1', 'A2', 'B', '1.1', '2.1', '2.2']
})
const selectedPlanLabel = computed(() => {
  if (form.plans.includes('All')) return 'All Plans'
  return form.plans.join(', ')
})

const prerequisiteOptions = computed(() =>
  props.milestones.filter((milestone) => milestone.milestoneId !== props.milestone?.milestoneId),
)

const nextOrderForFormSelection = computed(() => {
  return (
    Math.max(
      0,
      ...props.milestones
        .filter((milestone) => milestone.degreeLevel === form.degreeLevel)
        .filter((milestone) => milestone.semester === form.semester)
        .map((milestone) => milestone.sequenceOrder),
    ) + 1
  )
})

function saveForm() {
  emit('save', { ...form })
}

function togglePlan(plan: EducationPlan) {
  if (plan === 'All') {
    form.plans = ['All']
    return
  }

  const selectedPlans = form.plans.filter((selectedPlan) => selectedPlan !== 'All')
  form.plans = selectedPlans.includes(plan)
    ? selectedPlans.filter((selectedPlan) => selectedPlan !== plan)
    : [...selectedPlans, plan]

  if (form.plans.length === 0) form.plans = ['All']
}

watch(
  () => props.milestone,
  (milestone) => {
    isPlanDropdownOpen.value = false
    form.degreeLevel = milestone?.degreeLevel ?? props.defaultDegreeLevel
    form.semester =
      milestone?.semester ?? (props.defaultSemester === 'all' ? '1' : props.defaultSemester)
    form.plans = milestone?.plans?.length ? [...milestone.plans] : ['All']
    form.title = milestone?.title ?? ''
    form.description = milestone?.description ?? ''
    form.sequenceOrder = milestone?.sequenceOrder ?? props.defaultOrder
    form.openDate = milestone?.openDate?.slice(0, 10) ?? ''
    form.deadline = milestone?.deadline?.slice(0, 10) ?? ''
    form.firstReminderDate = milestone?.firstReminderDate?.slice(0, 10) ?? ''
    form.secondReminderDate = milestone?.secondReminderDate?.slice(0, 10) ?? ''
    form.prerequisiteMilestoneIds = [...(milestone?.prerequisiteMilestoneIds ?? [])]
    form.isEnabled = milestone?.isEnabled ?? true
  },
  { immediate: true },
)

watch(
  () => form.degreeLevel,
  () => {
    isPlanDropdownOpen.value = false
    const validPlans = form.plans.filter((plan) => planOptions.value.includes(plan))
    form.plans = validPlans.length ? validPlans : ['All']
  },
)

watch(
  () => [form.degreeLevel, form.semester, props.milestones] as const,
  () => {
    if (!isEditing.value) {
      form.sequenceOrder = nextOrderForFormSelection.value
    }
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-4 sm:items-center sm:py-6"
  >
    <section
      class="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:max-h-[calc(100vh-3rem)] sm:p-6"
    >
      <h2 class="text-xl font-semibold">{{ isEditing ? 'Edit Milestone' : 'Add Milestone' }}</h2>
      <p class="mt-1 text-xs text-slate-500">Fill in detail for the new milestone.</p>

      <form class="mt-5 space-y-3" novalidate @submit.prevent="saveForm">
        <label class="block text-xs font-semibold">
          Title
          <input
            v-model="form.title"
            placeholder="e.g., Research Proposal"
            class="mt-1 h-10 w-full rounded-md border border-[#c9827c] px-3 text-xs outline-none focus:border-[#7D2923]"
          />
        </label>

        <label class="block text-xs font-semibold">
          Description
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="Describe this milestone..."
            class="mt-1 w-full rounded-md border border-[#c9827c] px-3 py-2 text-xs outline-none focus:border-[#7D2923]"
          ></textarea>
        </label>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-xs font-semibold">
            Program
            <select
              v-model="form.degreeLevel"
              class="mt-1 h-10 w-full rounded-md border border-[#c9827c] bg-white px-3 text-xs outline-none focus:border-[#7D2923]"
            >
              <option value="All">All Program</option>
              <option value="Master">Master</option>
              <option value="Doctoral">Ph.D</option>
            </select>
          </label>

          <label class="block text-xs font-semibold">
            Semester
            <select
              v-model="form.semester"
              class="mt-1 h-10 w-full rounded-md border border-[#c9827c] bg-white px-3 text-xs outline-none focus:border-[#7D2923]"
            >
              <option value="all">All Semester</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label class="block text-xs font-semibold">
            Order
            <input
              v-model.number="form.sequenceOrder"
              type="number"
              min="1"
              class="mt-1 h-10 w-full rounded-md border border-[#c9827c] px-3 text-xs outline-none focus:border-[#7D2923]"
            />
          </label>

          <div class="relative block text-xs font-semibold">
            <span>Plan</span>
            <button
              type="button"
              class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-md border border-[#c9827c] bg-white px-3 text-left text-xs font-normal outline-none focus:border-[#7D2923]"
              :aria-expanded="isPlanDropdownOpen"
              @click="isPlanDropdownOpen = !isPlanDropdownOpen"
            >
              <span class="truncate">{{ selectedPlanLabel }}</span>
              <svg
                class="size-4 shrink-0 text-slate-500 transition-transform"
                :class="{ 'rotate-180': isPlanDropdownOpen }"
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
              v-if="isPlanDropdownOpen"
              class="absolute left-0 top-[calc(100%+4px)] z-20 w-full rounded-md border border-[#c9827c] bg-white p-1.5 shadow-lg"
            >
              <label
                v-for="plan in planOptions"
                :key="plan"
                class="flex cursor-pointer items-center gap-2 rounded px-2.5 py-2 text-xs font-normal hover:bg-[#f8eeee]"
              >
                <input
                  type="checkbox"
                  class="size-4 accent-[#7D2923]"
                  :checked="form.plans.includes(plan)"
                  @change="togglePlan(plan)"
                />
                {{ plan === 'All' ? 'All Plans' : plan }}
              </label>
            </div>
          </div>
        </div>

        <DateInput v-model="form.openDate" label="Date" />
        <DateInput v-model="form.deadline" label="Deadline" />

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateInput v-model="form.firstReminderDate" label="First Reminder" />
          <DateInput v-model="form.secondReminderDate" label="Second Reminder" />
        </div>

        <label class="block text-xs font-semibold">
          Prerequisite Milestone (Optional)
          <select
            v-model="form.prerequisiteMilestoneIds"
            multiple
            class="mt-1 min-h-20 w-full rounded-md border border-[#c9827c] bg-white px-3 py-2 text-xs outline-none focus:border-[#7D2923]"
          >
            <option
              v-for="option in prerequisiteOptions"
              :key="option.milestoneId"
              :value="option.milestoneId"
            >
              {{ option.sequenceOrder }}. {{ option.title }}
            </option>
          </select>
          <span class="mt-1 block font-normal text-slate-500">
            Select milestones that must be completed before this one. Leave empty if it can be
            completed at any time.
          </span>
        </label>

        <label class="flex items-center gap-2 text-xs font-semibold">
          <input v-model="form.isEnabled" type="checkbox" class="accent-[#7D2923]" />
          Enable this milestone for students
        </label>

        <div class="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            class="rounded-md border border-slate-200 px-4 py-2 text-xs"
            @click="emit('close')"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-md bg-[#7D2923] px-4 py-2 text-xs font-semibold text-white"
          >
            {{ isEditing ? 'Save Changes' : 'Add Milestone' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
