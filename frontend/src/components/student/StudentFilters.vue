<script setup lang="ts">
import type { StudentFilterKey, StudentFiltersState } from '@/types/student'
import type { StudentTableItem } from '@/types/student'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

interface FilterOption {
  label: string
  value: string
}

interface FilterDefinition {
  key: StudentFilterKey
  defaultLabel: string
  options: FilterOption[]
}

const props = withDefaults(
  defineProps<{
    search: string
    modelValue: StudentFiltersState
    yearOptions?: string[]
    advisorMode?: 'default' | 'all-only'
    buddhistYear?: boolean
    availableStudents?: StudentTableItem[]
  }>(),
  {
    advisorMode: 'default',
    yearOptions: () => [],
    availableStudents: () => [],
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'update:modelValue': [value: StudentFiltersState]
}>()

const openFilter = ref<StudentFilterKey | null>(null)
const { isThai, t } = useLanguage()

function yearLabel(year: string) {
  if (!props.buddhistYear) return year
  const numericYear = Number(year)
  return Number.isFinite(numericYear) ? String(numericYear + 543) : year
}

function planLabel(plan: string) {
  const keys: Record<string, 'common.planA1' | 'common.planA2' | 'common.planB' | 'common.plan21' | 'common.plan22'> = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  }
  return keys[plan] ? t(keys[plan]) : plan
}

function statusLabel(status: string) {
  if (status === 'Graduate') return t('dashboard.graduate')
  if (status === 'Overdue') return t('dashboard.overdue')
  if (status === 'On-track') return t('dashboard.onTrack')
  return status
}

const planOptions = computed<FilterOption[]>(() => {
  const allPlan = { label: t('student.allPlan'), value: 'all' }
  const planOrder = ['A1', 'A2', 'B', '2.1', '2.2']
  const plans = props.availableStudents
    .filter(
      (student) => props.modelValue.degree === 'all' || student.degree === props.modelValue.degree,
    )
    .map((student) => student.educationPlan)
    .filter((plan) => plan && plan !== '-')
  return [
    allPlan,
    ...Array.from(new Set(plans))
      .sort((left, right) => {
        const leftIndex = planOrder.indexOf(left)
        const rightIndex = planOrder.indexOf(right)
        if (leftIndex === -1 || rightIndex === -1) return left.localeCompare(right)
        return leftIndex - rightIndex
      })
      .map((plan) => ({ label: planLabel(plan), value: plan })),
  ]
})

function optionsFromValues(values: Array<string | number>) {
  return Array.from(new Set(values.map(String))).sort().map((value) => ({ label: value, value }))
}

const baseFilterDefinitions = computed<FilterDefinition[]>(() => [
  {
    key: 'degree',
    defaultLabel: 'All Program',
    options: [
      { label: t('student.allProgram'), value: 'all' },
      ...optionsFromValues(props.availableStudents.map((student) => student.degree)).map(
        (option) => ({
          ...option,
          label: isThai.value
            ? option.value === 'Master'
              ? t('common.master')
              : ['Doctoral', 'Ph. D.'].includes(option.value)
                ? t('common.doctoral')
                : option.label
            : props.advisorMode === 'all-only' && option.value === 'Ph. D.'
              ? 'Doctoral'
              : option.label,
        }),
      ),
    ],
  },
  {
    key: 'plan',
    defaultLabel: 'All Plan',
    options: planOptions.value,
  },
  {
    key: 'semester',
    defaultLabel: 'All Semester',
    options: [
      { label: t('student.allSemester'), value: 'all' },
      ...optionsFromValues(props.availableStudents.map((student) => student.semester)),
    ],
  },
  {
    key: 'year',
    defaultLabel: 'All Year',
    options: [
      { label: t('student.allYear'), value: 'all' },
      ...Array.from(new Set(props.availableStudents.map((student) => student.year)))
        .sort((left, right) => Number(right) - Number(left) || right.localeCompare(left))
        .map((year) => ({ label: yearLabel(year), value: year })),
    ],
  },
  {
    key: 'status',
    defaultLabel: 'All Status',
    options: [
      { label: t('student.allStatus'), value: 'all' },
      ...optionsFromValues(props.availableStudents.map((student) => student.status)).map(
        (option) => ({ ...option, label: statusLabel(option.value) }),
      ),
    ],
  },
])

const filterDefinitions = computed<FilterDefinition[]>(() => {
  if (props.advisorMode === 'all-only') return baseFilterDefinitions.value

  return [
    ...baseFilterDefinitions.value,
    {
      key: 'advisor',
      defaultLabel: 'Advisor (Default)',
      options: [
        { label: t('student.advisorDefault'), value: 'default' },
        { label: t('student.coAdvisor'), value: 'co-advisor' },
        { label: t('student.allView'), value: 'all' },
      ],
    },
  ]
})

const searchGridClass = computed(() =>
  props.advisorMode === 'all-only' ? 'lg:col-span-5' : 'lg:col-span-4',
)

const filterGridClass = computed(() =>
  props.advisorMode === 'all-only'
    ? 'sm:grid-cols-2 lg:col-span-7 lg:grid-cols-5'
    : 'sm:grid-cols-2 lg:col-span-8 lg:grid-cols-6',
)

function selectedFilterLabel(filter: FilterDefinition) {
  return (
    filter.options.find((option) => option.value === props.modelValue[filter.key])?.label ??
    filter.defaultLabel
  )
}

function selectFilter(key: StudentFilterKey, value: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
    ...(key === 'degree' ? { plan: 'all' } : {}),
  })
  openFilter.value = null
}

function updateSearch(event: Event) {
  emit('update:search', (event.target as HTMLInputElement).value)
}

function closeDropdown() {
  openFilter.value = null
}

onMounted(() => document.addEventListener('click', closeDropdown))
onBeforeUnmount(() => document.removeEventListener('click', closeDropdown))
</script>

<template>
  <div class="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-12">
    <label class="relative" :class="searchGridClass">
      <span class="sr-only">{{ t('student.searchPlaceholder') }}</span>
      <svg
        class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#cfcfcf]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        :value="search"
        type="search"
        :placeholder="t('student.searchPlaceholder')"
        class="h-8 w-full rounded-lg border border-[#eeeeee] bg-white pl-10 pr-4 text-xs font-medium text-[#333] shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#888] focus:border-[#8a2b25]"
        @input="updateSearch"
      />
    </label>

    <div class="grid grid-cols-1 gap-2" :class="filterGridClass">
      <div v-for="filter in filterDefinitions" :key="filter.key" class="relative" @click.stop>
        <button
          type="button"
          class="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-[#eeeeee] bg-white px-3 text-left text-xs shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#8a2b25]"
          :aria-expanded="openFilter === filter.key"
          @click="openFilter = openFilter === filter.key ? null : filter.key"
        >
          <span class="truncate">{{ selectedFilterLabel(filter) }}</span>
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
            :class="{ 'bg-[#f8eeee]': modelValue[filter.key] === option.value }"
            @click="selectFilter(filter.key, option.value)"
          >
            {{ option.label }}
            <svg
              v-if="modelValue[filter.key] === option.value"
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
</template>
