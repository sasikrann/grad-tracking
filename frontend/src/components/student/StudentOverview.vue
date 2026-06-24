<script setup lang="ts">
import StudentFilters from './StudentFilters.vue'
import StudentTable from './StudentTable.vue'
import type { StudentFiltersState, StudentTableItem } from '@/types/student'

withDefaults(
  defineProps<{
    students: StudentTableItem[]
    isLoading: boolean
    error: string
    advisorMode?: 'default' | 'all-only'
  }>(),
  {
    advisorMode: 'default',
  },
)

const search = defineModel<string>('search', { required: true })
const filters = defineModel<StudentFiltersState>('filters', { required: true })
</script>

<template>
  <section
    class="mt-9 rounded-xl border border-[#ececec] bg-white px-8 pt-8 pb-5 shadow-[0_3px_4px_rgba(0,0,0,0.22)]"
  >
    <header>
      <h2 class="text-[23px] font-semibold tracking-[-0.02em]">Student Overview</h2>
      <p class="mt-2 text-base font-medium text-[#7d7d7d]">
        Filter and view student progress details
      </p>
    </header>

    <StudentFilters v-model="filters" v-model:search="search" :advisor-mode="advisorMode" />
    <StudentTable :students="students" :is-loading="isLoading" :error="error" />
  </section>
</template>
