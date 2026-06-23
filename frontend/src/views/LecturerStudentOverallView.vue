<script setup lang="ts">
import StudentFilters from '@/components/lecturer/StudentFilters.vue'
import StudentTable from '@/components/lecturer/StudentTable.vue'
import SummaryCard from '@/components/lecturer/SummaryCard.vue'
import type { LecturerStudent, StudentFiltersState, StudentStatus } from '@/types/lecturer'
import { computed, onMounted, ref } from 'vue'

interface AdvisorStudentApi {
  studentId: string
  fullName: string
  program: string
  degreeLevel: 'Master' | 'Doctoral'
  semester: string
  expectedGraduationYear: number
  advisorId: string
}

interface AdvisorStudentsResponse {
  data: AdvisorStudentApi[]
}

const advisorId = 'ADV001'
const students = ref<LecturerStudent[]>([])
const isLoading = ref(true)
const loadError = ref('')
const search = ref('')
const filters = ref<StudentFiltersState>({
  semester: 'all',
  year: 'all',
  degree: 'all',
  status: 'all',
  advisor: 'default',
})

// ใช้ชั่วคราวจนกว่า backend จะมี API ของ milestone/progress
const milestonePreview: Record<string, { progress: number; status: StudentStatus }> = {
  '6631500006': { progress: 98, status: 'On-track' },
  '6631500007': { progress: 50, status: 'Overdue' },
  '6631500008': { progress: 100, status: 'On-track' },
}

async function loadAdvisorStudents() {
  isLoading.value = true
  loadError.value = ''

  try {
    const response = await fetch(`http://localhost:3000/api/advisors/${advisorId}/students`)

    if (!response.ok) {
      throw new Error(`Unable to load students (${response.status})`)
    }

    const result = (await response.json()) as AdvisorStudentsResponse

    students.value = result.data.map((student) => {
      const milestone = milestonePreview[student.studentId] ?? {
        progress: 0,
        status: 'On-track' as StudentStatus,
      }

      return {
        name: student.fullName,
        studentId: student.studentId,
        degree: student.degreeLevel === 'Doctoral' ? 'Ph. D.' : 'Master',
        program: student.program,
        semester: Number(student.semester),
        year: String(student.expectedGraduationYear),
        progress: milestone.progress,
        status: milestone.status,
        isAdvised: student.advisorId === advisorId,
      }
    })
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load students'
  } finally {
    isLoading.value = false
  }
}

const filteredStudents = computed(() => {
  const query = search.value.trim().toLowerCase()

  return students.value.filter((student) => {
    const matchesSearch =
      !query ||
      student.name.toLowerCase().includes(query) ||
      student.studentId.toLowerCase().includes(query)
    const matchesSemester =
      filters.value.semester === 'all' || student.semester === Number(filters.value.semester)
    const matchesYear = filters.value.year === 'all' || student.year === filters.value.year
    const matchesDegree = filters.value.degree === 'all' || student.degree === filters.value.degree
    const matchesStatus = filters.value.status === 'all' || student.status === filters.value.status
    const matchesAdvisor = filters.value.advisor === 'all' || student.isAdvised

    return (
      matchesSearch &&
      matchesSemester &&
      matchesYear &&
      matchesDegree &&
      matchesStatus &&
      matchesAdvisor
    )
  })
})

const advisedStudentsCount = computed(
  () => students.value.filter((student) => student.isAdvised).length,
)
const onTrackCount = computed(
  () => students.value.filter((student) => student.status === 'On-track').length,
)
const overdueCount = computed(
  () => students.value.filter((student) => student.status === 'Overdue').length,
)

onMounted(loadAdvisorStudents)
</script>

<template>
  <div class="lecturer-student-overall-page">
    <header class="mb-4">
      <h1 class="text-3xl font-semibold tracking-[-0.02em]">Student Dashboard</h1>
      <p class="mt-1 text-sm font-medium text-[#7d7d7d]">
        Monitor advised students, track their progress, and review thesis status
      </p>
    </header>

    <section class="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 xl:gap-10">
      <SummaryCard
        title="Advised Students"
        :value="advisedStudentsCount"
        icon="students"
        position="start"
      />
      <SummaryCard title="On-track" :value="onTrackCount" icon="on-track" position="center" />
      <SummaryCard title="Overdue" :value="overdueCount" icon="overdue" position="end" />
    </section>

    <section
      class="mt-9 rounded-xl border border-[#ececec] bg-white px-8 pb-5 pt-8 shadow-[0_3px_4px_rgba(0,0,0,0.22)]"
    >
      <header>
        <h1 class="text-[23px] font-semibold tracking-[-0.02em]">Student Overview</h1>
        <p class="mt-2 text-base font-medium text-[#7d7d7d]">
          Filter and view student progress details
        </p>
      </header>

      <StudentFilters v-model="filters" v-model:search="search" />
      <StudentTable :students="filteredStudents" :is-loading="isLoading" :error="loadError" />
    </section>
  </div>
</template>

<style scoped>
.lecturer-student-overall-page {
  width: 100%;
  min-width: 0;
  min-height: 100vh;
  padding: 2rem 1.5rem;
  color: #111111;
  background-color: #f8f8f8;
}

@media (min-width: 1280px) {
  .lecturer-student-overall-page {
    padding-right: 2.5rem;
    padding-left: 2.5rem;
  }
}
</style>
