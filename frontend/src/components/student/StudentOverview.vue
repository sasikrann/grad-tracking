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
    class="mt-4 rounded-xl border border-[#ececec] bg-white px-7 pt-5 pb-4 shadow-[0_2px_4px_rgba(0,0,0,0.18)]"
  >
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-lg font-semibold">{{ t('student.overview') }}</h2>
        <p class="mt-1 text-sm font-medium text-[#7d7d7d]">
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
    />
    <StudentTable
      :students="students"
      :is-loading="isLoading"
      :error="error"
      :use-doctoral-label="advisorMode === 'all-only'"
      :buddhist-year="buddhistYear"
      @view="emit('view', $event)"
    />
  </section>
</template>
