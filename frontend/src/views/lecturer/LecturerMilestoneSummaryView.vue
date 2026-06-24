<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import MilestoneBreakdown, {
  type MilestoneBreakdownItem,
} from '@/components/milestone/MilestoneBreakdown.vue'
import MilestoneSummaryCard from '@/components/milestone/MilestoneSummaryCard.vue'

type FilterKey = 'semester' | 'year'

interface FilterDefinition {
  key: FilterKey
  label: string
  options: { label: string; value: string }[]
}

const filters = ref<Record<FilterKey, string>>({
  semester: 'all',
  year: 'all',
})
const openFilter = ref<FilterKey | null>(null)

const filterDefinitions: FilterDefinition[] = [
  {
    key: 'semester',
    label: 'All Semester',
    options: [
      { label: 'All Semester', value: 'all' },
      { label: '1', value: '1' },
      { label: '2', value: '2' },
    ],
  },
  {
    key: 'year',
    label: 'All Year',
    options: [
      { label: 'All Year', value: 'all' },
      { label: '2023', value: '2023' },
      { label: '2024', value: '2024' },
      { label: '2025', value: '2025' },
      { label: '2026', value: '2026' },
    ],
  },
]

function selectedLabel(filter: FilterDefinition) {
  return (
    filter.options.find((option) => option.value === filters.value[filter.key])?.label ??
    filter.label
  )
}

function selectFilter(key: FilterKey, value: string) {
  filters.value[key] = value
  openFilter.value = null
}

function closeDropdown() {
  openFilter.value = null
}

onMounted(() => document.addEventListener('click', closeDropdown))
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))

const milestones: MilestoneBreakdownItem[] = [
  { name: 'Attend ethics training', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Submit the English proficiency test', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Pass Proposal Exam', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Pass Defense Exam', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Publish research findings', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Pass the Format Checking', completed: 10, inProgress: 10, approved: 5 },
  { name: 'Submit the complete thesis file', completed: 10, inProgress: 10, approved: 5 },
]
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Milestone Summary</h1>
      <p class="mt-1 text-sm text-slate-500">
        Manage student data, track progress, and check thesis status.
      </p>
    </header>

    <section
      class="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4"
      aria-label="Milestone statistics"
    >
      <MilestoneSummaryCard label="Completed" :value="20" tone="completed" />
      <MilestoneSummaryCard label="In Progress" :value="20" tone="progress" />
      <MilestoneSummaryCard label="Approved" :value="20" tone="approved" />
      <MilestoneSummaryCard label="Overall Progress" value="40%" tone="overall" />
    </section>

    <section
      class="mt-8 rounded-xl border border-[#e6e6e6] bg-white p-4 shadow-[0_2px_3px_rgba(0,0,0,0.16)] sm:p-6"
      aria-labelledby="milestone-breakdown-title"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 id="milestone-breakdown-title" class="text-base font-semibold text-slate-950">
          Milestone Breakdown
        </h2>

        <div class="flex flex-wrap gap-2" aria-label="Milestone filters">
          <div
            v-for="filter in filterDefinitions"
            :key="filter.key"
            class="relative min-w-36"
            @click.stop
          >
            <button
              type="button"
              class="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-[#eeeeee] bg-white px-3 text-left text-xs shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="truncate">{{ selectedLabel(filter) }}</span>
              <svg
                class="size-4 shrink-0 text-[#777] transition-transform"
                :class="{ 'rotate-180': openFilter === filter.key }"
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
              v-if="openFilter === filter.key"
              class="absolute right-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <button
                v-for="option in filter.options"
                :key="option.value"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs whitespace-nowrap hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': filters[filter.key] === option.value }"
                @click="selectFilter(filter.key, option.value)"
              >
                {{ option.label }}
                <svg
                  v-if="filters[filter.key] === option.value"
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
      </div>

      <div class="mt-3">
        <MilestoneBreakdown :milestones="milestones" />
      </div>
    </section>
  </div>
</template>
