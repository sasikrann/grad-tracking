<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { getAdvisorMilestoneSummary } from '@/services/advisor-milestone-summary.api'
import { currentUser } from '@/services/auth'
import type { AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

defineOptions({ name: 'AdvisorMilestoneSummaryView' })

type SummaryFilterKey = 'degreeLevel' | 'educationPlan' | 'year'

const defaultSummary: AdvisorMilestoneSummary = {
  counts: { completed: 0, inProgress: 0, approved: 0, missing: 0, total: 0 },
  overallProgress: 0,
  milestones: [],
  filters: { degreeLevels: [], educationPlans: [], years: [], advisorFilters: [] },
}

const summary = ref<AdvisorMilestoneSummary>(defaultSummary)
const selectedDegreeLevel = ref<DegreeLevel | ''>('')
const selectedEducationPlan = ref('')
const selectedYear = ref('')
const isLoading = ref(true)
const loadError = ref('')
const openFilter = ref<SummaryFilterKey | null>(null)

const completedCount = computed(() => summary.value.counts.completed)
const inProgressCount = computed(() => summary.value.counts.inProgress)
const visibleMilestoneCount = computed(() => completedCount.value + inProgressCount.value)
const overallProgress = computed(() =>
  visibleMilestoneCount.value
    ? Math.round((completedCount.value / visibleMilestoneCount.value) * 100)
    : 0,
)

const summaryCards = computed(() => [
  {
    title: 'Inprogress',
    value: inProgressCount.value.toString(),
    icon: 'progress',
    accent: 'bg-amber-100 text-amber-500',
  },
  {
    title: 'Completed',
    value: completedCount.value.toString(),
    icon: 'completed',
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: 'Overall Progress',
    value: `${overallProgress.value}%`,
    icon: 'overall',
    accent: 'bg-violet-100 text-violet-500',
  },
])

const yearOptions = computed(() =>
  Array.from(new Set(summary.value.filters.advisorFilters.map((option) => option.year))).sort(
    (first, second) => second - first,
  ),
)

const degreeLevelOptions = computed(() =>
  Array.from(
    new Set(
      summary.value.filters.advisorFilters
        .filter((option) => option.year === Number(selectedYear.value))
        .map((option) => option.degreeLevel),
    ),
  ),
)

const educationPlanOptions = computed(() =>
  Array.from(
    new Set(
      summary.value.filters.advisorFilters
        .filter(
          (option) =>
            option.year === Number(selectedYear.value) &&
            option.degreeLevel === selectedDegreeLevel.value,
        )
        .map((option) => option.educationPlan),
    ),
  ),
)

const filterDefinitions = computed(() => [
  {
    key: 'degreeLevel' as const,
    label: selectedDegreeLevel.value === 'Doctoral' ? 'Ph.D' : selectedDegreeLevel.value,
    options: degreeLevelOptions.value.map((level) => ({
      label: level === 'Doctoral' ? 'Ph.D' : level,
      value: level,
    })),
  },
  {
    key: 'educationPlan' as const,
    label: selectedEducationPlan.value,
    options: educationPlanOptions.value.map((plan) => ({ label: plan, value: plan })),
  },
  {
    key: 'year' as const,
    label: selectedYear.value,
    options: yearOptions.value.map((year) => ({
      label: year.toString(),
      value: year.toString(),
    })),
  },
])

function selectedFilterValue(key: SummaryFilterKey) {
  if (key === 'degreeLevel') return selectedDegreeLevel.value
  if (key === 'educationPlan') return selectedEducationPlan.value
  return selectedYear.value
}

function selectFilter(key: SummaryFilterKey, value: string) {
  if (key === 'degreeLevel') selectedDegreeLevel.value = value as DegreeLevel
  if (key === 'educationPlan') selectedEducationPlan.value = value
  if (key === 'year') selectedYear.value = value
  syncAdvisorFilters()
  openFilter.value = null
  void loadSummary()
}

function syncAdvisorFilters() {
  const previousSelection = [
    selectedYear.value,
    selectedDegreeLevel.value,
    selectedEducationPlan.value,
  ].join('|')

  if (!yearOptions.value.includes(Number(selectedYear.value))) {
    selectedYear.value = yearOptions.value[0]?.toString() ?? ''
  }
  if (!degreeLevelOptions.value.includes(selectedDegreeLevel.value as DegreeLevel)) {
    selectedDegreeLevel.value = degreeLevelOptions.value[0] ?? ''
  }
  if (!educationPlanOptions.value.includes(selectedEducationPlan.value)) {
    selectedEducationPlan.value = educationPlanOptions.value[0] ?? ''
  }

  return (
    previousSelection !==
    [selectedYear.value, selectedDegreeLevel.value, selectedEducationPlan.value].join('|')
  )
}

async function loadSummary({ silent = false } = {}) {
  const advisorId = currentUser.value?.advisorId

  if (!advisorId) {
    summary.value = defaultSummary
    loadError.value = 'Advisor profile is not linked to this account'
    if (!silent) isLoading.value = false
    return
  }

  if (!silent) isLoading.value = true
  if (!silent) loadError.value = ''

  try {
    let result = await getAdvisorMilestoneSummary(advisorId, {
      degreeLevel: selectedDegreeLevel.value || undefined,
      educationPlan: selectedEducationPlan.value || undefined,
      year: selectedYear.value || undefined,
    })
    summary.value = result

    if (syncAdvisorFilters()) {
      result = await getAdvisorMilestoneSummary(advisorId, {
        degreeLevel: selectedDegreeLevel.value || undefined,
        educationPlan: selectedEducationPlan.value || undefined,
        year: selectedYear.value || undefined,
      })
      summary.value = result
    }
  } catch (error) {
    summary.value = defaultSummary
    loadError.value = error instanceof Error ? error.message : 'Unable to load milestone summary'
  } finally {
    if (!silent) isLoading.value = false
  }
}

function closeDropdown() {
  openFilter.value = null
}

onMounted(() => {
  void loadSummary()
  document.addEventListener('click', closeDropdown)
})
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
useAutoRefresh(() => loadSummary({ silent: true }))
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Milestone Summary</h1>
      <p class="mt-1 text-sm font-medium text-[#7d7d7d]">
        Manage student data, track progress, and check thesis status.
      </p>
    </header>

    <section class="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
      <article
        v-for="card in summaryCards"
        :key="card.title"
        class="flex h-24 items-center rounded-xl border border-[#e6e6e6] bg-white px-5 shadow-[0_2px_3px_rgba(0,0,0,0.16)]"
      >
        <div
          :class="['flex size-12 shrink-0 items-center justify-center rounded-full', card.accent]"
        >
          <svg
            class="size-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <template v-if="card.icon === 'progress'">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </template>
            <template v-else-if="card.icon === 'completed'">
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12 2.5 2.5L16 9" />
            </template>
            <template v-else>
              <path d="M4 18V6M4 18h16m-12-4 3-3 2 2 4-5" />
            </template>
          </svg>
        </div>
        <div class="ml-4 leading-tight">
          <p class="text-sm text-[#7b7b7b]">{{ card.title }}</p>
          <p class="mt-1 text-lg font-semibold text-black">{{ card.value }}</p>
        </div>
      </article>
    </section>

    <section
      class="mt-14 rounded-xl border border-[#ececec] bg-white px-4 pb-5 pt-5 shadow-[0_2px_4px_rgba(0,0,0,0.18)] sm:px-7"
    >
      <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 class="text-lg font-semibold">Milestone Breakdown</h2>

        <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[340px]">
          <div v-for="filter in filterDefinitions" :key="filter.key" class="relative" @click.stop>
            <button
              type="button"
              class="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-[#eeeeee] bg-white px-3 text-left text-xs shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="truncate">{{ filter.label }}</span>
              <svg
                class="size-4 shrink-0 text-[#777]"
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
                class="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs hover:bg-[#f8eeee]"
                :class="{ 'bg-[#f8eeee]': selectedFilterValue(filter.key) === option.value }"
                @click="selectFilter(filter.key, option.value)"
              >
                {{ option.label }}
                <span v-if="selectedFilterValue(filter.key) === option.value">✓</span>
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
          type="button"
          class="mt-4 rounded-lg bg-[#8a2b25] px-4 py-2 text-sm font-semibold text-white"
          @click="loadSummary()"
        >
          Retry
        </button>
      </div>
      <div
        v-else-if="summary.milestones.length === 0"
        class="py-14 text-center text-sm text-slate-500"
      >
        No milestone data matches the selected filters.
      </div>

      <div v-else class="mt-3 overflow-x-auto">
        <table class="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-[#dedede]">
              <th class="w-[44%] py-3 font-semibold">Milestone</th>
              <th class="w-[22%] py-3 text-center font-semibold">
                <span class="inline-flex items-center gap-1.5"
                  ><span class="size-3 rounded-full bg-[#ffbd38]"></span>In Progress</span
                >
              </th>
              <th class="w-[22%] py-3 text-center font-semibold">
                <span class="inline-flex items-center gap-1.5"
                  ><span class="size-3 rounded-full bg-[#49b866]"></span>Completed</span
                >
              </th>
              <th class="w-[12%] py-3 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="milestone in summary.milestones"
              :key="milestone.milestoneId"
              class="border-b border-[#dedede]"
            >
              <td class="py-4 font-semibold">
                {{ milestone.sequenceOrder }}. {{ milestone.title }}
              </td>
              <td class="py-4 text-center">{{ milestone.inProgress }}</td>
              <td class="py-4 text-center">{{ milestone.completed }}</td>
              <td class="py-4 text-center">
                {{ milestone.inProgress + milestone.completed }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
