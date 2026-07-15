<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

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
type FormDropdown = 'program' | 'semester' | 'plan'
const openDropdown = ref<FormDropdown | null>(null)
const programOptions: { label: string; value: MilestoneProgram }[] = [
  { label: 'All Program', value: 'All' },
  { label: 'Master', value: 'Master' },
  { label: 'Ph.D', value: 'Doctoral' },
]
const semesterOptions = [
  { label: 'All Semester', value: 'all' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
]
const selectedProgramLabel = computed(
  () => programOptions.find((option) => option.value === form.degreeLevel)?.label ?? 'All Program',
)
const selectedSemesterLabel = computed(
  () => semesterOptions.find((option) => option.value === form.semester)?.label ?? 'All Semester',
)
const planOptions = computed<EducationPlan[]>(() => {
  if (form.degreeLevel === 'Master') return ['All', 'A1', 'A2', 'B']
  if (form.degreeLevel === 'Doctoral') return ['All', '1.1', '2.1', '2.2']
  return ['All', 'A1', 'A2', 'B', '1.1', '2.1', '2.2']
})
const selectedPlanLabel = computed(() => {
  if (form.plans.includes('All')) return 'All Plan'
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

function toggleDropdown(dropdown: FormDropdown) {
  openDropdown.value = openDropdown.value === dropdown ? null : dropdown
}

function selectProgram(value: MilestoneProgram) {
  form.degreeLevel = value
  openDropdown.value = null
}

function selectSemester(value: string) {
  form.semester = value
  openDropdown.value = null
}

function closeDropdown() {
  openDropdown.value = null
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
    openDropdown.value = null
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
    openDropdown.value = null
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

onMounted(() => document.addEventListener('click', closeDropdown))
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
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
          <div class="relative block text-xs font-semibold" @click.stop>
            <span>Program</span>
            <button
              type="button"
              class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
              :aria-expanded="openDropdown === 'program'"
              @click="toggleDropdown('program')"
            >
              <span class="truncate">{{ selectedProgramLabel }}</span>
              <svg
                class="size-4 shrink-0 text-[#777] transition-transform"
                :class="{ 'rotate-180': openDropdown === 'program' }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>

            <div
              v-if="openDropdown === 'program'"
              class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <button
                v-for="option in programOptions"
                :key="option.value"
                type="button"
                class="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': form.degreeLevel === option.value }"
                @click="selectProgram(option.value)"
              >
                {{ option.label }}
                <svg
                  v-if="form.degreeLevel === option.value"
                  class="size-4 text-[#777]"
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

          <div class="relative block text-xs font-semibold" @click.stop>
            <span>Semester</span>
            <button
              type="button"
              class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
              :aria-expanded="openDropdown === 'semester'"
              @click="toggleDropdown('semester')"
            >
              <span class="truncate">{{ selectedSemesterLabel }}</span>
              <svg
                class="size-4 shrink-0 text-[#777] transition-transform"
                :class="{ 'rotate-180': openDropdown === 'semester' }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                aria-hidden="true"
              >
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>

            <div
              v-if="openDropdown === 'semester'"
              class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <button
                v-for="option in semesterOptions"
                :key="option.value"
                type="button"
                class="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': form.semester === option.value }"
                @click="selectSemester(option.value)"
              >
                {{ option.label }}
                <svg
                  v-if="form.semester === option.value"
                  class="size-4 text-[#777]"
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

          <div class="relative block text-xs font-semibold" @click.stop>
            <span>Plan</span>
            <button
              type="button"
              class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
              :aria-expanded="openDropdown === 'plan'"
              @click="toggleDropdown('plan')"
            >
              <span class="truncate">{{ selectedPlanLabel }}</span>
              <svg
                class="size-4 shrink-0 text-[#777] transition-transform"
                :class="{ 'rotate-180': openDropdown === 'plan' }"
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
              v-if="openDropdown === 'plan'"
              class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <label
                v-for="plan in planOptions"
                :key="plan"
                class="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': form.plans.includes(plan) }"
              >
                <input
                  type="checkbox"
                  class="size-4 shrink-0 accent-[#7D2923]"
                  :checked="form.plans.includes(plan)"
                  @change="togglePlan(plan)"
                />
                {{ plan === 'All' ? 'All Plan' : plan }}
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
            class="rounded-md border border-slate-200 px-4 py-2 text-xs font-semibold"
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
