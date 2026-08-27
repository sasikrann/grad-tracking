<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { formatAcademicYear, useLanguage } from '@/composables/useLanguage'
import { getAdvisorMilestoneSummary } from '@/services/advisor-milestone-summary.api'
import { currentUser } from '@/services/auth'
import type { AdvisorMilestoneSummary, DegreeLevel } from '@/types/milestone'

defineOptions({ name: 'AdvisorMilestoneSummaryView' })

type SummaryFilterKey = 'degreeLevel' | 'educationPlan' | 'year'

const defaultSummary: AdvisorMilestoneSummary = {
  counts: { completed: 0, inProgress: 0, approved: 0, missing: 0, total: 0, totalStudents: 0 },
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
const { t } = useLanguage()

const completedCount = computed(
  () => summary.value.counts.completed + summary.value.counts.approved,
)
const inProgressCount = computed(
  () => summary.value.counts.inProgress + summary.value.counts.missing,
)

const summaryCards = computed(() => [
  {
    title: t('advisorPortal.totalStudent'),
    value: summary.value.counts.totalStudents.toString(),
    icon: 'students',
    accent: 'bg-blue-100 text-blue-500',
  },
  {
    title: t('advisorPortal.inProgress'),
    value: inProgressCount.value.toString(),
    icon: 'progress',
    accent: 'bg-amber-100 text-amber-500',
  },
  {
    title: t('advisorPortal.completed'),
    value: completedCount.value.toString(),
    icon: 'completed',
    accent: 'bg-emerald-100 text-emerald-600',
  },
  {
    title: t('advisorPortal.overallCompleted'),
    value: `${summary.value.overallProgress}%`,
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

function educationPlanLabel(plan: string) {
  const translationKeys = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  } as const
  const key = translationKeys[plan as keyof typeof translationKeys]
  return key ? t(key) : plan
}

const filterDefinitions = computed(() => [
  {
    key: 'degreeLevel' as const,
    label:
      selectedDegreeLevel.value === 'Doctoral'
        ? t('common.doctoral')
        : selectedDegreeLevel.value
          ? t('common.master')
          : '',
    options: degreeLevelOptions.value.map((level) => ({
      label: level === 'Doctoral' ? t('common.doctoral') : t('common.master'),
      value: level,
    })),
  },
  {
    key: 'educationPlan' as const,
    label: educationPlanLabel(selectedEducationPlan.value),
    options: educationPlanOptions.value.map((plan) => ({
      label: educationPlanLabel(plan),
      value: plan,
    })),
  },
  {
    key: 'year' as const,
    label: selectedYear.value,
    options: yearOptions.value.map((year) => ({
      label: formatAcademicYear(year),
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
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-5 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8">
    <header>
      <h1 class="text-xl font-bold tracking-tight sm:text-3xl">
        {{ t('advisorPortal.milestoneSummary') }}
      </h1>
      <p class="mt-1 text-sm text-slate-500">
        {{ t('advisorPortal.summaryDescription') }}
      </p>
    </header>

    <section class="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-5 xl:grid-cols-4">
      <article
        v-for="card in summaryCards"
        :key="card.title"
        class="flex h-[76px] w-full items-center rounded-lg border border-[#e6e6e6] bg-white px-3 shadow-[0_2px_3px_rgba(0,0,0,0.12)] sm:rounded-xl sm:px-5"
      >
        <div
          :class="[
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            card.accent,
          ]"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            aria-hidden="true"
          >
            <template v-if="card.icon === 'students'">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </template>
            <template v-else-if="card.icon === 'progress'">
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
        <div class="ml-3 min-w-0 sm:ml-4">
          <p class="truncate py-0.5 text-xs leading-normal text-[#7b7b7b] sm:text-sm">{{ card.title }}</p>
          <p class="mt-0.5 text-lg font-semibold text-black">
            {{ card.value }}
          </p>
        </div>
      </article>
    </section>

    <section
      class="mt-2 rounded-lg border border-[#ececec] bg-white px-2 pb-5 pt-3 shadow-[0_2px_4px_rgba(0,0,0,0.12)] sm:mt-4 sm:rounded-xl sm:px-7 sm:pt-5"
    >
      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ t('advisorPortal.milestoneBreakdown') }}</h2>
          <p class="mt-0.5 text-xs text-slate-500 sm:hidden">
            {{ t('advisorPortal.selectGroup') }}
          </p>
        </div>

        <div
          v-if="summary.filters.advisorFilters.length"
          class="grid w-full grid-cols-3 gap-2 sm:w-auto sm:gap-2 lg:min-w-[340px]"
        >
          <div v-for="filter in filterDefinitions" :key="filter.key" class="relative" @click.stop>
            <p class="mb-1 text-[10px] font-medium text-slate-500 sm:hidden">
              {{
                filter.key === 'degreeLevel'
                  ? t('advisorPortal.degree')
                  : filter.key === 'educationPlan'
                    ? t('advisorPortal.plan')
                    : t('advisorPortal.year')
              }}
            </p>
            <button
              type="button"
              class="flex h-10 w-full items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-medium shadow-sm outline-none hover:border-[#dfcccc] focus:border-[#8a2b25] sm:h-9 sm:gap-2"
              :aria-expanded="openFilter === filter.key"
              @click="openFilter = openFilter === filter.key ? null : filter.key"
            >
              <span class="truncate">{{ filter.label }}</span>
              <svg
                class="size-3.5 shrink-0 text-[#777] sm:size-4"
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
        {{ t('advisorPortal.loadingSummary') }}
      </div>
      <div v-else-if="loadError" class="py-14 text-center">
        <p class="text-sm font-semibold text-red-600">{{ loadError }}</p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-[#8a2b25] px-4 py-2 text-sm font-semibold text-white"
          @click="loadSummary()"
        >
          {{ t('advisorPortal.retry') }}
        </button>
      </div>
      <div
        v-else-if="summary.milestones.length === 0"
        class="py-14 text-center text-sm text-slate-500"
      >
        {{ t('advisorPortal.noSummaryData') }}
      </div>

      <template v-else>
        <div class="mt-4 space-y-2 sm:hidden">
          <article
            v-for="(milestone, index) in summary.milestones"
            :key="milestone.milestoneId"
            class="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          >
            <div class="flex items-start gap-2.5">
              <span
                class="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-600 shadow-sm"
              >
                {{ index + 1 }}
              </span>
              <p class="pt-1 text-xs font-semibold leading-4 text-slate-800">
                {{ milestone.title }}
              </p>
            </div>
            <div class="mt-3 grid grid-cols-2 gap-2 pl-9">
              <div class="flex items-center justify-between rounded-lg bg-amber-50 px-2.5 py-2">
                <span class="flex items-center gap-1.5 text-[10px] font-medium text-amber-700">
                  <span class="size-2 rounded-full bg-amber-400"></span>{{ t('advisorPortal.inProgress') }}
                </span>
                <strong class="text-xs text-amber-800">{{
                  milestone.inProgress + milestone.missing
                }}</strong>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-2">
                <span class="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                  <span class="size-2 rounded-full bg-emerald-500"></span>{{ t('advisorPortal.completed') }}
                </span>
                <strong class="text-xs text-emerald-800">{{
                  milestone.completed + milestone.approved
                }}</strong>
              </div>
            </div>
          </article>
        </div>

        <div class="mt-3 hidden overflow-x-auto sm:block">
          <table class="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-[#dedede]">
                <th class="w-1/2 py-3 font-semibold">{{ t('advisorPortal.milestone') }}</th>
                <th class="w-1/4 py-3 text-center font-semibold">
                  <span class="inline-flex items-center gap-1.5"
                    ><span class="size-3 rounded-full bg-[#ffbd38]"></span>{{ t('advisorPortal.inProgress') }}</span
                  >
                </th>
                <th class="w-1/4 py-3 text-center font-semibold">
                  <span class="inline-flex items-center gap-1.5"
                    ><span class="size-3 rounded-full bg-[#49b866]"></span>{{ t('advisorPortal.completed') }}</span
                  >
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(milestone, index) in summary.milestones"
                :key="milestone.milestoneId"
                class="border-b border-[#dedede]"
              >
                <td class="py-4 font-semibold">
                  {{ index + 1 }}. {{ milestone.title }}
                </td>
                <td class="py-4 text-center">{{ milestone.inProgress + milestone.missing }}</td>
                <td class="py-4 text-center">{{ milestone.completed + milestone.approved }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
  </div>
</template>
