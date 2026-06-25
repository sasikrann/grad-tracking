<script setup lang="ts">
import type { StudentFilterKey, StudentFiltersState } from '@/types/student'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

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
  }>(),
  {
    advisorMode: 'default',
    yearOptions: () => [],
  },
)

const emit = defineEmits<{
  'update:search': [value: string]
  'update:modelValue': [value: StudentFiltersState]
}>()

const openFilter = ref<StudentFilterKey | null>(null)

const baseFilterDefinitions = computed<FilterDefinition[]>(() => [
  {
    key: 'semester',
    defaultLabel: 'All Semester',
    options: [
      { label: 'All Semester', value: 'all' },
      { label: '1', value: '1' },
      { label: '2', value: '2' },
    ],
  },
  {
    key: 'year',
    defaultLabel: 'All Year',
    options: [
      { label: 'All Year', value: 'all' },
      ...props.yearOptions.map((year) => ({ label: year, value: year })),
    ],
  },
  {
    key: 'degree',
    defaultLabel: 'All Program',
    options: [
      { label: 'All Program', value: 'all' },
      { label: 'Master', value: 'Master' },
      { label: 'Ph. D.', value: 'Ph. D.' },
    ],
  },
  {
    key: 'status',
    defaultLabel: 'All Status',
    options: [
      { label: 'All Status', value: 'all' },
      { label: 'On-track', value: 'On-track' },
      { label: 'Overdue', value: 'Overdue' },
    ],
  },
])

const filterDefinitions = computed<FilterDefinition[]>(() => [
  ...baseFilterDefinitions.value,
  {
    key: 'advisor',
    defaultLabel: props.advisorMode === 'all-only' ? 'All View' : 'Advisor (Default)',
    options:
      props.advisorMode === 'all-only'
        ? [{ label: 'All View', value: 'all' }]
        : [
            { label: 'Advisor (Default)', value: 'default' },
            { label: 'All View', value: 'all' },
          ],
  },
])

function selectedFilterLabel(filter: FilterDefinition) {
  return (
    filter.options.find((option) => option.value === props.modelValue[filter.key])?.label ??
    filter.defaultLabel
  )
}

function selectFilter(key: StudentFilterKey, value: string) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
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
  <div class="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-12">
    <label class="relative lg:col-span-5">
      <span class="sr-only">Search by name or ID</span>
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
        placeholder="Search by name or ID..."
        class="h-8 w-full rounded-lg border border-[#eeeeee] bg-white pl-10 pr-4 text-xs font-medium text-[#333] shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none placeholder:text-[#888] focus:border-[#8a2b25]"
        @input="updateSearch"
      />
    </label>

    <div
      class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-[0.9fr_0.9fr_1.1fr_1fr_1.35fr]"
    >
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
