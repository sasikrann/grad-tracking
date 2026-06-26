<!-- Component Modal สำหรับ Copy Milestone -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { DegreeLevel, Milestone } from '@/types/milestone'

// รับข้อมูลจากหน้าหลักเข้ามาใช้ใน component นี้
const props = defineProps<{
  milestones: Milestone[]
  yearOptions: string[]
}>()

// copy ใช้ตอนกดปุ่ม Copy Milestone พร้อมส่งข้อมูลต้นทาง ปลายทาง และ milestone ที่เลือก
const emit = defineEmits<{
  close: []
  copy: [
    fromDegreeLevel: DegreeLevel,
    toDegreeLevel: DegreeLevel,
    fromSemester: string,
    toSemester: string,
    milestoneIds: string[],
  ]
}>()

// เก็บค่าที่ user เลือกฝั่งต้นทาง
const fromSemester = ref('1')
const fromYear = ref('all')
const fromDegreeLevel = ref<DegreeLevel>('Master')
// เก็บค่าที่ user เลือกฝั่งปลายทาง
const toSemester = ref('1')
const toYear = ref('all')
const toDegreeLevel = ref<DegreeLevel>('Doctoral')
const selectedMilestoneIds = ref<string[]>([])

// กรอง milestone เฉพาะที่ตรงกับต้นทางที่เลือก
// เช่น program ตรงกัน, year ตรงกัน และ semester ตรงกัน
const sourceMilestones = computed(() =>
  props.milestones.filter((milestone) => {
    const matchesProgram = milestone.degreeLevel === fromDegreeLevel.value
    const matchesYear =
      fromYear.value === 'all' ||
      new Date(milestone.deadline).getFullYear().toString() === fromYear.value
    const matchesSemester = milestone.semester === fromSemester.value

    return matchesProgram && matchesYear && matchesSemester
  }),
)

// เช็คว่า milestone ฝั่งต้นทางถูกเลือกครบทุกอันแล้วหรือยัง
// ใช้กับ checkbox Select All
const allSelected = computed(
  () =>
    sourceMilestones.value.length > 0 &&
    sourceMilestones.value.every((milestone) =>
      selectedMilestoneIds.value.includes(milestone.milestoneId),
    ),
)
// ถ้ารายการ milestone ต้นทางเปลี่ยน ให้เลือก milestone ทั้งหมดของต้นทางนั้นอัตโนมัติ
watch(
  sourceMilestones,
  (milestones) => {
    selectedMilestoneIds.value = milestones.map((milestone) => milestone.milestoneId)
  },
  { immediate: true },
)

function toggleAll() {
  selectedMilestoneIds.value = allSelected.value
    ? []
    : sourceMilestones.value.map((milestone) => milestone.milestoneId)
}

function submitCopy() {
  emit(
    'copy',
    fromDegreeLevel.value,
    toDegreeLevel.value,
    fromSemester.value,
    toSemester.value,
    selectedMilestoneIds.value,
  )
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
    <section class="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
      <h2 class="text-lg font-semibold">Copy Milestone</h2>
      <p class="mt-1 text-xs text-slate-500">Copy milestone from one semester/program to another.</p>

      <!-- From (Source) -->
      <div class="mt-7 grid grid-cols-[1fr_auto_1fr] items-end gap-8">
        <section>
          <h3 class="text-xs font-semibold text-[#8b0000]">1. From (Source)</h3>
          <div class="mt-4 grid grid-cols-3 gap-3">
            <label class="text-xs font-semibold">
              Semester
              <select v-model="fromSemester" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>

            <label class="text-xs font-semibold">
              Year
              <select v-model="fromYear" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="all">All Year</option>
                <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>

            <label class="text-xs font-semibold">
              Program
              <select v-model="fromDegreeLevel" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="Master">Master</option>
                <option value="Doctoral">Ph.D</option>
              </select>
            </label>
          </div>
        </section>

        <svg
          class="mb-3 size-8 text-[#8b0000]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>

        <!-- To (Destination) -->
        <section>
          <h3 class="text-xs font-semibold text-[#8b0000]">2. To (Destination)</h3>
          <div class="mt-4 grid grid-cols-3 gap-3">
            <label class="text-xs font-semibold">
              Semester
              <select v-model="toSemester" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>

            <label class="text-xs font-semibold">
              Year
              <select v-model="toYear" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="all">All Year</option>
                <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}</option>
              </select>
            </label>

            <label class="text-xs font-semibold">
              Program
              <select v-model="toDegreeLevel" class="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-xs shadow-sm">
                <option value="Master">Master</option>
                <option value="Doctoral">Ph.D</option>
              </select>
            </label>
          </div>
        </section>
      </div>

      <section class="mt-7 border-t border-slate-200 pt-5">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-xs font-semibold text-[#8b0000]">3. Select Milestones to Copy</h3>
            <label class="mt-3 flex items-center gap-2 text-xs font-semibold">
              <input type="checkbox" :checked="allSelected" class="accent-[#8b2a23]" @change="toggleAll" />
              Select All
            </label>
          </div>
          <p class="text-xs text-slate-500">
            {{ selectedMilestoneIds.length }} of {{ sourceMilestones.length }} selected
          </p>
        </div>

        <div class="mt-3 max-h-64 space-y-2 overflow-y-auto">
          <label
            v-for="milestone in sourceMilestones"
            :key="milestone.milestoneId"
            class="flex items-center gap-4 rounded-md px-4 py-3 text-sm font-semibold"
            :class="
              selectedMilestoneIds.includes(milestone.milestoneId)
                ? 'bg-[#f8e7e7]'
                : 'bg-slate-50'
            "
          >
            <span class="cursor-grab text-slate-400" aria-hidden="true">::</span>
            <input
              v-model="selectedMilestoneIds"
              type="checkbox"
              :value="milestone.milestoneId"
              class="accent-[#8b2a23]"
            />
            <span class="min-w-6 text-center text-xs font-bold text-[#8b2a23]">
              {{ milestone.sequenceOrder }}.
            </span>
            {{ milestone.title }}
          </label>

          <p v-if="sourceMilestones.length === 0" class="py-8 text-center text-sm text-slate-500">
            No milestones match the selected source.
          </p>
        </div>
      </section>

      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="rounded-md border border-slate-200 px-4 py-2 text-xs" @click="emit('close')">
          Cancel
        </button>
        <button
          type="button"
          :disabled="selectedMilestoneIds.length === 0"
          class="rounded-md bg-[#7D2923] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          @click="submitCopy"
        >
          Copy Milestone
        </button>
      </div>
    </section>
  </div>
</template>
