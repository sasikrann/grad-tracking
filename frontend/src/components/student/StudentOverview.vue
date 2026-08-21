<script setup lang="ts">
import StudentFilters from './StudentFilters.vue'
import StudentTable from './StudentTable.vue'
import type { StudentFiltersState, StudentTableItem } from '@/types/student'
import { useLanguage } from '@/composables/useLanguage'

const { t } = useLanguage()

withDefaults(
  defineProps<{
    students: StudentTableItem[]
    availableStudents?: StudentTableItem[]
    isLoading: boolean
    error: string
    yearOptions?: string[]
    advisorMode?: 'default' | 'all-only'
    buddhistYear?: boolean
    colorProgramBadges?: boolean
    filterOptions?: {
      semesters: Array<string | number>
      years: Array<string | number>
      degrees: string[]
      plans: string[]
      statuses: string[]
    }
  }>(),
  {
    advisorMode: 'default',
    yearOptions: () => [],
    availableStudents: () => [],
  },
)

const emit = defineEmits<{
  view: [studentId: string]
}>()

const search = defineModel<string>('search', { required: true })
const filters = defineModel<StudentFiltersState>('filters', { required: true })
</script>

<template>
  <section
    class="mt-2 rounded-lg border border-[#ececec] bg-white px-2 pt-3 pb-4 shadow-[0_2px_4px_rgba(0,0,0,0.12)] sm:mt-4 sm:rounded-xl sm:px-7 sm:pt-5"
  >
    <header class="flex items-start justify-between gap-2 sm:flex-wrap sm:gap-4">
      <div class="min-w-0">
        <h2 class="text-base font-semibold sm:text-lg">{{ t('student.overview') }}</h2>
        <p class="text-xs font-medium text-[#7d7d7d] sm:mt-1 sm:text-sm">
          {{ t('student.overviewDescription') }}
        </p>
      </div>
      <slot name="action" />
    </header>

    <StudentFilters
      v-model="filters"
      v-model:search="search"
      :advisor-mode="advisorMode"
      :year-options="yearOptions"
      :buddhist-year="buddhistYear"
      :available-students="availableStudents"
      :filter-options="filterOptions"
    />
    <StudentTable
      :students="students"
      :is-loading="isLoading"
      :error="error"
      :use-doctoral-label="advisorMode === 'all-only'"
      :buddhist-year="buddhistYear"
      :color-program-badges="colorProgramBadges"
      @view="emit('view', $event)"
    />
  </section>
</template>
