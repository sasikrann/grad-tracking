<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { useLanguage } from '@/composables/useLanguage'
import { useAutoRefresh } from '@/composables/useAutoRefresh'
import { currentUser } from '@/services/auth'
import { getAdvisorStudentOverview } from '@/services/students.api'

defineOptions({ name: 'AdvisorStudentOverallView' })

const router = useRouter()
const { isThai, t } = useLanguage()
const page = ref(1)
const pageSize = 10

async function loadAdvisorStudentOverview() {
  const advisorId = currentUser.value?.advisorId

  if (!advisorId) {
    throw new Error('Advisor profile is not linked to this account')
  }

  return getAdvisorStudentOverview(advisorId)
}

const {
  filteredStudents,
  filters,
  isLoading,
  loadError,
  loadStudents,
  search,
  statistics,
  students,
  yearOptions,
} = useStudentOverview(loadAdvisorStudentOverview, 'default')

const totalPages = computed(() => Math.ceil(filteredStudents.value.length / pageSize))
const paginatedStudents = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredStudents.value.slice(start, start + pageSize)
})
const paginationItems = computed<Array<number | 'ellipsis'>>(() => {
  const total = totalPages.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  if (page.value <= 3) return [1, 2, 3, 4, 'ellipsis']
  if (page.value >= total - 2) return ['ellipsis', total - 3, total - 2, total - 1, total]
  return ['ellipsis', page.value - 1, page.value, page.value + 1, 'ellipsis']
})

watch(
  [search, filters],
  () => {
    page.value = 1
  },
  { deep: true },
)

watch(totalPages, (total) => {
  if (total > 0 && page.value > total) page.value = total
})

function changePage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
}

useAutoRefresh(() => loadStudents({ silent: true }))

const totalStudentsTitle = computed(() => {
  if (filters.value.advisor === 'all') return t('advisorPortal.totalStudents')
  if (filters.value.advisor === 'co-advisor') return t('advisorPortal.coAdvisedStudents')
  return t('advisorPortal.advisedStudents')
})

function viewStudentMilestones(studentId: string) {
  void router.push({ name: 'advisor-student-milestones', params: { studentId } })
}
</script>

<template>
  <div
    class="min-h-screen bg-[#f7f7f7] px-3 pt-3 pb-5 font-sans text-slate-900 sm:px-6 sm:py-6 xl:px-8"
  >
    <header>
      <h1 class="text-xl font-bold tracking-tight sm:text-3xl">
        {{ t('advisorPortal.studentOverall') }}
      </h1>
      <p class="text-xs text-slate-500 sm:mt-1 sm:text-sm">
        {{ t('advisorPortal.studentOverallDescription') }}
      </p>
    </header>

    <section class="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:gap-5 xl:grid-cols-4">
      <SummaryCard
        compact-value
        :title="totalStudentsTitle"
        :value="statistics.total"
        icon="students"
      />
      <SummaryCard
        compact-value
        :title="t('advisorPortal.onTrack')"
        :value="statistics.onTrack"
        icon="on-track"
      />
      <SummaryCard
        compact-value
        :title="t('advisorPortal.overdue')"
        :value="statistics.overdue"
        icon="overdue"
      />
      <SummaryCard
        compact-value
        :title="t('advisorPortal.graduate')"
        :value="statistics.graduate"
        icon="graduate"
      />
    </section>

    <StudentOverview
      class="min-h-[430px] sm:min-h-0"
      v-model:filters="filters"
      v-model:search="search"
      :students="paginatedStudents"
      :is-loading="isLoading"
      :error="loadError"
      :year-options="yearOptions"
      :available-students="students"
      :buddhist-year="isThai"
      @view="viewStudentMilestones"
    />

    <nav v-if="totalPages > 1" class="mt-5 flex justify-end" aria-label="Student pages">
      <div
        class="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <button
          type="button"
          class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          :disabled="page === 1"
          aria-label="Previous page"
          @click="changePage(page - 1)"
        >
          ‹
        </button>
        <template v-for="(item, index) in paginationItems" :key="`${item}-${index}`">
          <span
            v-if="item === 'ellipsis'"
            class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-400"
            >…</span
          >
          <button
            v-else
            type="button"
            class="flex size-8 items-center justify-center border-r border-slate-200 text-xs font-medium transition-colors"
            :class="
              item === page ? 'bg-[#f7c9cf] text-[#a13a34]' : 'text-slate-700 hover:bg-[#fdf1f3]'
            "
            :aria-current="item === page ? 'page' : undefined"
            :aria-label="`Page ${item}`"
            @click="changePage(item)"
          >
            {{ item }}
          </button>
        </template>
        <button
          type="button"
          class="flex size-8 items-center justify-center text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          :disabled="page === totalPages"
          aria-label="Next page"
          @click="changePage(page + 1)"
        >
          ›
        </button>
      </div>
    </nav>
  </div>
</template>
