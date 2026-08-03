<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import DateInput from './form/DateInput.vue'
import MilestonePlanDropdown from './form/MilestonePlanDropdown.vue'
import MilestoneSelectDropdown from './form/MilestoneSelectDropdown.vue'
import type { EducationPlan, Milestone, MilestoneInput, MilestoneProgram } from '@/types/milestone'

const props = defineProps<{
  milestone: Milestone | null
  milestones: Milestone[]
  defaultDegreeLevel: MilestoneProgram
  filterDegreeLevel: MilestoneProgram
  filterPlan: EducationPlan
  defaultOrder: number
}>()

const emit = defineEmits<{
  close: []
  save: [input: MilestoneInput]
}>()

const form = reactive<MilestoneInput>({
  degreeLevel: props.defaultDegreeLevel,
  semester: 'all',
  plans: ['All'],
  title: '',
  description: '',
  references: [''],
  sequenceOrder: props.defaultOrder,
  openDate: '',
  deadline: '',
  firstReminderDate: '',
  secondReminderDate: '',
  prerequisiteMilestoneIds: [],
  isEnabled: true,
})

const isEditing = computed(() => Boolean(props.milestone))
type FormDropdown = 'program' | 'plan'
const openDropdown = ref<FormDropdown | null>(null)
const programOptions: { label: string; value: MilestoneProgram }[] = [
  { label: 'All Program', value: 'All' },
  { label: 'Master', value: 'Master' },
  { label: 'Ph.D', value: 'Doctoral' },
]
const planOptions = computed<EducationPlan[]>(() => {
  if (form.degreeLevel === 'Master') return ['All', 'A1', 'A2', 'B']
  if (form.degreeLevel === 'Doctoral') return ['All', '1.1', '2.1', '2.2']
  return ['All', 'A1', 'A2', 'B', '1.1', '2.1', '2.2']
})
const prerequisiteOptions = computed(() =>
  props.milestones
    .filter((milestone) => {
      if (milestone.milestoneId === props.milestone?.milestoneId) return false
      const effectiveDegreeLevel =
        props.filterDegreeLevel === 'All' ? form.degreeLevel : props.filterDegreeLevel
      const effectivePlans = props.filterPlan === 'All' ? form.plans : [props.filterPlan]
      const matchesProgram =
        effectiveDegreeLevel === 'All' ||
        milestone.degreeLevel === 'All' ||
        milestone.degreeLevel === effectiveDegreeLevel
      const matchesPlan =
        effectivePlans.includes('All') ||
        milestone.plans.includes('All') ||
        milestone.plans.some((plan) => effectivePlans.includes(plan))
      return matchesProgram && matchesPlan
    })
    .sort((first, second) => first.sequenceOrder - second.sequenceOrder),
)

const nextOrderForFormSelection = computed(() => {
  return (
    Math.max(
      0,
      ...props.milestones
        .filter((milestone) => milestone.degreeLevel === form.degreeLevel)
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

function selectDropdown(dropdown: 'program', value: string) {
  if (dropdown === 'program') form.degreeLevel = value as MilestoneProgram
  openDropdown.value = null
}

function addReference() {
  form.references.push('')
}

function removeReference(index: number) {
  form.references.splice(index, 1)
  if (!form.references.length) form.references.push('')
}

function closeDropdown() {
  openDropdown.value = null
}

watch(
  () => props.milestone,
  (milestone) => {
    openDropdown.value = null
    form.degreeLevel = milestone?.degreeLevel ?? props.defaultDegreeLevel
    form.semester = 'all'
    form.plans = milestone?.plans?.length ? [...milestone.plans] : ['All']
    form.title = milestone?.title ?? ''
    form.description = milestone?.description ?? ''
    form.references = milestone?.references?.length ? [...milestone.references] : ['']
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
  prerequisiteOptions,
  (options) => {
    const validIds = new Set(options.map((option) => option.milestoneId))
    form.prerequisiteMilestoneIds = form.prerequisiteMilestoneIds.filter((id) =>
      validIds.has(id),
    )
  },
)

watch(
  () => [form.degreeLevel, props.milestones] as const,
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

        <div>
          <MilestoneSelectDropdown
            label="Program"
            :model-value="form.degreeLevel"
            :options="programOptions"
            :open="openDropdown === 'program'"
            @toggle="toggleDropdown('program')"
            @select="selectDropdown('program', $event)"
          />
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

          <MilestonePlanDropdown
            v-model="form.plans"
            :options="planOptions"
            :open="openDropdown === 'plan'"
            @toggle="toggleDropdown('plan')"
          />
        </div>

        <fieldset class="space-y-2">
          <div class="flex items-center justify-between gap-3">
            <legend class="text-xs font-semibold">Reference Links (Optional)</legend>
            <button
              type="button"
              class="text-xs font-semibold text-[#7D2923] hover:underline"
              @click="addReference"
            >
              + Add Link
            </button>
          </div>
          <div
            v-for="(_reference, index) in form.references"
            :key="index"
            class="flex items-center gap-2"
          >
            <input
              v-model="form.references[index]"
              type="url"
              placeholder="https://example.com"
              class="h-10 min-w-0 flex-1 rounded-md border border-[#c9827c] px-3 text-xs outline-none focus:border-[#7D2923]"
            />
            <button
              type="button"
              class="rounded-md border border-red-100 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
              aria-label="Remove reference link"
              @click="removeReference(index)"
            >
              Remove
            </button>
          </div>
        </fieldset>

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
