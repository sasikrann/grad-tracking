<script setup lang="ts">
import StudentFilters from './StudentFilters.vue'
import StudentTable from './StudentTable.vue'
import type { StudentFiltersState, StudentTableItem } from '@/types/student'

withDefaults(
  defineProps<{
    students: StudentTableItem[]
    isLoading: boolean
    error: string
    yearOptions?: string[]
    advisorMode?: 'default' | 'all-only'
  }>(),
  {
    advisorMode: 'default',
    yearOptions: () => [],
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
    <header>
      <h2 class="text-xl font-semibold tracking-[-0.01em]">Student Overview</h2>
      <p class="mt-1 text-sm font-medium text-[#7d7d7d]">
        Filter and view student progress details
      </p>
    </header>

    <StudentFilters
      v-model="filters"
      v-model:search="search"
      :advisor-mode="advisorMode"
      :year-options="yearOptions"
    />
    <StudentTable
      :students="students"
      :is-loading="isLoading"
      :error="error"
      @view="emit('view', $event)"
    />
  </section>
</template>
