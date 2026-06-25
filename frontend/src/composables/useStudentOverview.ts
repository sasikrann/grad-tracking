import { computed, onMounted, ref } from 'vue'
import type { Student, StudentFiltersState } from '@/types/student'

export function useStudentOverview(
  loadStudentData: () => Promise<Student[]>,
  initialAdvisorFilter: 'default' | 'all',
) {
  const students = ref<Student[]>([])
  const isLoading = ref(true)
  const loadError = ref('')
  const search = ref('')
  const filters = ref<StudentFiltersState>({
    semester: 'all',
    year: 'all',
    degree: 'all',
    status: 'all',
    advisor: initialAdvisorFilter,
  })

  const statistics = computed(() => ({
    total: students.value.length,
    onTrack: students.value.filter((student) => student.status === 'On-track').length,
    overdue: students.value.filter((student) => student.status === 'Overdue').length,
  }))

  const filteredStudents = computed(() => {
    const keyword = search.value.trim().toLowerCase()

    return students.value.filter((student) => {
      const matchesSearch =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        student.studentId.toLowerCase().includes(keyword)
      const matchesSemester =
        filters.value.semester === 'all' || student.semester === Number(filters.value.semester)
      const matchesYear = filters.value.year === 'all' || student.year === filters.value.year
      const matchesDegree =
        filters.value.degree === 'all' || student.degree === filters.value.degree
      const matchesStatus =
        filters.value.status === 'all' || student.status === filters.value.status
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

  const yearOptions = computed(() =>
    Array.from(new Set(students.value.map((student) => student.year))).sort(),
  )

  async function loadStudents() {
    isLoading.value = true
    loadError.value = ''

    try {
      students.value = await loadStudentData()
    } catch (error) {
      students.value = []
      loadError.value = error instanceof Error ? error.message : 'Unable to load students'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(loadStudents)

  return {
    filteredStudents,
    filters,
    isLoading,
    loadError,
    loadStudents,
    search,
    statistics,
    yearOptions,
  }
}
