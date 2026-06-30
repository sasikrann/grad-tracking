<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { getAdvisorMilestoneSummary } from '@/services/advisor-milestone-summary.api'
import { currentUser } from '@/services/auth'
import type { AdvisorMilestoneBreakdown, AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

type SummaryIcon = 'completed' | 'progress' | 'approved' | 'overall'
type SummaryFilterKey = 'degreeLevel' | 'semester' | 'year'

const defaultSummary: AdvisorMilestoneSummary = {
  counts: { completed: 0, inProgress: 0, approved: 0, missing: 0, total: 0 },
  overallProgress: 0,
  milestones: [],
  filters: { degreeLevels: [], semesters: [], years: [] },
}
const currentYear = new Date().getFullYear().toString()

function getCurrentSemester() {
  const currentMonth = new Date().getMonth() + 1

  return currentMonth >= 1 && currentMonth <= 5 ? '2' : '1'
}

const summary = ref<AdvisorMilestoneSummary>(defaultSummary)
const selectedDegreeLevel = ref<DegreeLevel>('Master')
const selectedSemester = ref(getCurrentSemester())
const selectedYear = ref(currentYear)
const degreeLevelOptions = ref<DegreeLevel[]>(['Master', 'Doctoral'])
const semesterOptions = ref<string[]>(['1', '2'])
const yearOptions = ref<number[]>([Number(currentYear)])
const isLoading = ref(true)
const loadError = ref('')
const openFilter = ref<SummaryFilterKey | null>(null)

const summaryCards = computed(() => [
  {
    title: 'Completed',
    value: summary.value.counts.completed.toString(),
    icon: 'completed' as SummaryIcon,
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: 'In Progress',
    value: summary.value.counts.inProgress.toString(),
    icon: 'progress' as SummaryIcon,
    accent: 'bg-amber-100 text-amber-600',
  },
  {
    title: 'Approved',
    value: summary.value.counts.approved.toString(),
    icon: 'approved' as SummaryIcon,
    accent: 'bg-orange-100 text-orange-600',
  },
  {
    title: 'Overall Progress',
    value: `${summary.value.overallProgress}%`,
    icon: 'overall' as SummaryIcon,
    accent: 'bg-violet-100 text-violet-600',
  },
])

const hasBreakdown = computed(() => summary.value.milestones.length > 0)

const milestoneGroups = computed(() => {
  const groups = new Map<string, AdvisorMilestoneBreakdown[]>()

  summary.value.milestones.forEach((milestone) => {
    const milestones = groups.get(milestone.semester) ?? []
    milestones.push(milestone)
    groups.set(milestone.semester, milestones)
  })

  return Array.from(groups.entries())
    .sort(([firstSemester], [secondSemester]) => Number(firstSemester) - Number(secondSemester))
    .map(([semester, milestones]) => ({ semester, milestones }))
})

const filterDefinitions = computed(() => [
  {
    key: 'semester' as const,
    label: selectedSemester.value === 'all' ? 'All Semester' : selectedSemester.value,
    options: [
      { label: 'All Semester', value: 'all' },
      ...semesterOptions.value.map((semester) => ({ label: semester, value: semester })),
    ],
  },
  {
    key: 'year' as const,
    label: selectedYear.value === 'all' ? 'All Year' : selectedYear.value,
    options: [
      { label: 'All Year', value: 'all' },
      ...yearOptions.value.map((year) => ({ label: year.toString(), value: year.toString() })),
    ],
  },
  {
    key: 'degreeLevel' as const,
    label: selectedDegreeLevel.value === 'Doctoral' ? 'Ph.D' : selectedDegreeLevel.value,
    options: degreeLevelOptions.value.map((degreeLevel) => ({
      label: degreeLevel === 'Doctoral' ? 'Ph.D' : degreeLevel,
      value: degreeLevel,
    })),
  },
])

function mergeOptions(nextSummary: AdvisorMilestoneSummary) {
  degreeLevelOptions.value = Array.from(
    new Set(['Master' as DegreeLevel, 'Doctoral' as DegreeLevel, ...degreeLevelOptions.value, ...nextSummary.filters.degreeLevels]),
  )

  semesterOptions.value = Array.from(
    new Set(['1', '2', ...semesterOptions.value, ...nextSummary.filters.semesters]),
  ).sort((first, second) => Number(first) - Number(second))

  yearOptions.value = Array.from(
    new Set([Number(currentYear), ...yearOptions.value, ...nextSummary.filters.years]),
  ).sort((first, second) => second - first)
}

async function loadSummary() {
  const advisorId = currentUser.value?.advisorId

  if (!advisorId) {
    summary.value = defaultSummary
    loadError.value = 'Advisor profile is not linked to this account'
    isLoading.value = false
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const result = await getAdvisorMilestoneSummary(advisorId, {
      degreeLevel: selectedDegreeLevel.value,
      semester: selectedSemester.value,
      year: selectedYear.value,
    })
    summary.value = result
    mergeOptions(result)
  } catch (error) {
    summary.value = defaultSummary
    loadError.value = error instanceof Error ? error.message : 'Unable to load milestone summary'
  } finally {
    isLoading.value = false
  }
}

function segmentWidth(count: number, total: number) {
  return total ? `${(count / total) * 100}%` : '0%'
}

function selectedFilterValue(key: SummaryFilterKey) {
  if (key === 'degreeLevel') return selectedDegreeLevel.value
  return key === 'semester' ? selectedSemester.value : selectedYear.value
}

function selectFilter(key: SummaryFilterKey, value: string) {
  if (key === 'degreeLevel') selectedDegreeLevel.value = value as DegreeLevel
  if (key === 'semester') selectedSemester.value = value
  if (key === 'year') selectedYear.value = value
  openFilter.value = null
}

function closeDropdown() {
  openFilter.value = null
}

onMounted(() => {
  loadSummary()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
watch([selectedDegreeLevel, selectedSemester, selectedYear], loadSummary)
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header class="mb-6">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">Milestone Summary</h1>
        <p class="mt-1 text-sm text-slate-500">
          Manage student data, track progress, and check thesis status.
        </p>
      </div>
    </header>

    <section class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="card in summaryCards"
        :key="card.title"
        class="flex h-[76px] w-full items-center rounded-xl border border-[#e6e6e6] bg-white px-5 shadow-[0_2px_3px_rgba(0,0,0,0.16)]"
      >
        <div :class="['flex size-10 shrink-0 items-center justify-center rounded-xl', card.accent]">
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            aria-hidden="true"
          >
            <template v-if="card.icon === 'completed'">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </template>
            <template v-else-if="card.icon === 'progress'">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </template>
            <template v-else-if="card.icon === 'approved'">
              <circle cx="12" cy="8" r="3" />
              <path d="M8.5 13.5 7 21l5-3 5 3-1.5-7.5" />
              <path d="m10 8 1.2 1.2L14 6.5" />
            </template>
            <template v-else>
              <path d="M4 18V6" />
              <path d="M4 18h16" />
              <path d="m8 14 3-3 2 2 4-5" />
            </template>
          </svg>
        </div>

        <div class="ml-4 min-w-0 leading-tight">
          <p class="truncate text-sm text-[#7b7b7b]">{{ card.title }}</p>
          <p class="mt-1 text-lg font-semibold">{{ card.value }}</p>
        </div>
      </article>
    </section>

    <section
      class="mt-4 rounded-xl border border-[#ececec] bg-white px-7 pt-5 pb-4 shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
    >
      <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 class="text-xl font-semibold tracking-[-0.01em]">Milestone Breakdown</h2>
          <p class="mt-1 text-sm font-medium text-[#7d7d7d]">
            View milestone completion by status
          </p>
        </div>

        <div
          class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[390px] lg:grid-cols-3"
        >
          <div
            v-for="filter in filterDefinitions"
            :key="filter.key"
            class="relative"
            @click.stop
          >
            <button
              type="button"
              class="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-[#eeeeee] bg-white px-3 text-left text-xs shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
              :class="{ 'border-[#8a2b25]': openFilter === filter.key }"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="truncate">{{ filter.label }}</span>
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
              class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
            >
              <button
                v-for="option in filter.options"
                :key="option.value"
                type="button"
                class="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs whitespace-nowrap hover:bg-[#f8eeee]"
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
      </header>

      <div v-if="isLoading" class="py-14 text-center text-sm text-slate-500">
        Loading milestone summary...
      </div>

      <div v-else-if="loadError" class="py-14 text-center">
        <p class="text-sm font-semibold text-red-600">{{ loadError }}</p>
        <button
          class="mt-4 rounded-lg bg-[#8a2b25] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6f211d]"
          type="button"
          @click="loadSummary"
        >
          Retry
        </button>
      </div>

      <div v-else-if="!hasBreakdown" class="py-14 text-center text-sm text-slate-500">
        No milestone data matches the selected filters.
      </div>

      <div v-else class="overflow-x-auto">
        <div class="min-w-[820px]">
          <div
            class="mt-3 grid grid-cols-[minmax(220px,1.15fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_100px] items-center gap-x-5 border-b border-[#e4e4e4] py-3 text-sm font-semibold text-[#333]"
          >
            <span>Milestone</span>
            <span class="flex items-center justify-center gap-2">
              <span class="size-3 rounded-full bg-[#49b866]"></span>
              Completed
            </span>
            <span class="flex items-center justify-center gap-2">
              <span class="size-3 rounded-full bg-[#ffbd38]"></span>
              In Progress
            </span>
            <span class="flex items-center justify-center gap-2">
              <span class="size-3 rounded-full bg-[#f97316]"></span>
              Approved
            </span>
            <span class="text-center">Total Students</span>
          </div>

          <template v-if="selectedSemester === 'all'">
            <template v-for="group in milestoneGroups" :key="group.semester">
              <div
                class="mt-4 grid grid-cols-[minmax(220px,1.15fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_100px] items-center gap-x-5 rounded-lg bg-[#f8eeee] px-4 py-2 text-sm font-semibold text-[#8a2b25]"
              >
                <span class="col-span-5">Semester {{ group.semester }}</span>
              </div>

              <article
                v-for="milestone in group.milestones"
                :key="milestone.milestoneId"
                class="grid grid-cols-[minmax(220px,1.15fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_100px] items-center gap-x-5 border-b border-[#e4e4e4] py-4"
              >
                <div class="min-w-0 pl-3">
                  <p class="text-sm font-semibold leading-snug text-[#111]">
                    {{ milestone.sequenceOrder }}. {{ milestone.title }}
                  </p>
                </div>

                <div class="col-span-3 min-w-0">
                  <div class="grid grid-cols-3 text-center text-xs font-semibold text-[#111]">
                    <span>{{ milestone.completed }}</span>
                    <span>{{ milestone.inProgress }}</span>
                    <span>{{ milestone.approved }}</span>
                  </div>
                  <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
                    <span
                      class="h-full bg-[#49b866]"
                      :style="{ width: segmentWidth(milestone.completed, milestone.totalStudents) }"
                    ></span>
                    <span
                      class="h-full bg-[#ffbd38]"
                      :style="{ width: segmentWidth(milestone.inProgress, milestone.totalStudents) }"
                    ></span>
                    <span
                      class="h-full bg-[#f97316]"
                      :style="{ width: segmentWidth(milestone.approved, milestone.totalStudents) }"
                    ></span>
                    <span
                      class="h-full bg-slate-300"
                      :style="{ width: segmentWidth(milestone.missing, milestone.totalStudents) }"
                    ></span>
                  </div>
                </div>

                <div class="text-center text-sm font-semibold text-[#111]">
                  {{ milestone.totalStudents }}
                </div>
              </article>
            </template>
          </template>

          <template v-else>
            <article
              v-for="milestone in summary.milestones"
              :key="milestone.milestoneId"
              class="grid grid-cols-[minmax(220px,1.15fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_100px] items-center gap-x-5 border-b border-[#e4e4e4] py-4"
            >
              <div class="min-w-0">
                <p class="text-sm font-semibold leading-snug text-[#111]">
                  {{ milestone.sequenceOrder }}. {{ milestone.title }}
                </p>
              </div>

              <div class="col-span-3 min-w-0">
                <div class="grid grid-cols-3 text-center text-xs font-semibold text-[#111]">
                  <span>{{ milestone.completed }}</span>
                  <span>{{ milestone.inProgress }}</span>
                  <span>{{ milestone.approved }}</span>
                </div>
                <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-200">
                  <span
                    class="h-full bg-[#49b866]"
                    :style="{ width: segmentWidth(milestone.completed, milestone.totalStudents) }"
                  ></span>
                  <span
                    class="h-full bg-[#ffbd38]"
                    :style="{ width: segmentWidth(milestone.inProgress, milestone.totalStudents) }"
                  ></span>
                  <span
                    class="h-full bg-[#f97316]"
                    :style="{ width: segmentWidth(milestone.approved, milestone.totalStudents) }"
                  ></span>
                  <span
                    class="h-full bg-slate-300"
                    :style="{ width: segmentWidth(milestone.missing, milestone.totalStudents) }"
                  ></span>
                </div>
              </div>

              <div class="text-center text-sm font-semibold text-[#111]">
                {{ milestone.totalStudents }}
              </div>
            </article>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
