<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import DateInput from './DateInput.vue'
import type { DegreeLevel, Milestone, MilestoneInput } from '@/types/milestone'

const props = defineProps<{
  milestone: Milestone | null
  defaultDegreeLevel: DegreeLevel
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
  title: '',
  description: '',
  sequenceOrder: props.defaultOrder,
  openDate: '',
  deadline: '',
  firstReminderDate: '',
  secondReminderDate: '',
  isEnabled: true,
})

const isEditing = computed(() => Boolean(props.milestone))

watch(
  () => props.milestone,
  (milestone) => {
    form.degreeLevel = milestone?.degreeLevel ?? props.defaultDegreeLevel
    form.semester =
      milestone?.semester ?? (props.defaultSemester === 'all' ? '1' : props.defaultSemester)
    form.title = milestone?.title ?? ''
    form.description = milestone?.description ?? ''
    form.sequenceOrder = milestone?.sequenceOrder ?? props.defaultOrder
    form.openDate = milestone?.openDate?.slice(0, 10) ?? ''
    form.deadline = milestone?.deadline?.slice(0, 10) ?? ''
    form.firstReminderDate = milestone?.firstReminderDate?.slice(0, 10) ?? ''
    form.secondReminderDate = milestone?.secondReminderDate?.slice(0, 10) ?? ''
    form.isEnabled = milestone?.isEnabled ?? true
  },
  { immediate: true },
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
    <section class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
      <h2 class="text-xl font-semibold">{{ isEditing ? 'Edit Milestone' : 'Add Milestone' }}</h2>
      <p class="mt-1 text-xs text-slate-500">Fill in detail for the new milestone.</p>
      <p class="mt-1 text-xs text-red-600">** Adding this milestone will notify the student immediately. **</p>

      <form class="mt-5 space-y-3" @submit.prevent="emit('save', { ...form })">
        <label class="block text-xs font-semibold">
          Title
          <input
            v-model="form.title"
            required
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

        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-semibold">
            Program
            <select
              v-model="form.degreeLevel"
              class="mt-1 h-10 w-full rounded-md border border-[#c9827c] bg-white px-3 text-xs outline-none focus:border-[#7D2923]"
            >
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
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="block text-xs font-semibold">
            Order
            <input
              v-model.number="form.sequenceOrder"
              type="number"
              min="1"
              class="mt-1 h-10 w-full rounded-md border border-[#c9827c] px-3 text-xs outline-none focus:border-[#7D2923]"
            />
          </label>
        </div>

        <DateInput v-model="form.openDate" label="Date" />
        <DateInput v-model="form.deadline" label="Deadline" />

        <div class="grid grid-cols-2 gap-3">
          <DateInput v-model="form.firstReminderDate" label="First Reminder" />
          <DateInput v-model="form.secondReminderDate" label="Second Reminder" />
        </div>

        <label class="flex items-center gap-2 text-xs font-semibold">
          <input v-model="form.isEnabled" type="checkbox" class="accent-[#7D2923]" />
          Enable this milestone for students
        </label>

        <div class="flex justify-end gap-3 pt-2">
          <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-xs" @click="emit('close')">
            Cancel
          </button>
          <button type="submit" class="rounded-md bg-[#7D2923] px-4 py-2 text-xs font-semibold text-white">
            {{ isEditing ? 'Save Changes' : 'Add Milestone' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
