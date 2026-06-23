<script setup lang="ts">
import { computed, ref } from 'vue'
import { students } from '@/data/admin/students'

const search = ref('')
const semester = ref('all')
const program = ref('all')
const status = ref('all')

const statistics = computed(() => ({
  total: students.length,
  onTrack: students.filter((student) => student.status === 'On-track').length,
  overdue: students.filter((student) => student.status === 'Overdue').length,
}))

const filteredStudents = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return students.filter((student) => {
    const matchesSearch =
      !keyword ||
      student.name.toLowerCase().includes(keyword) ||
      student.studentId.toLowerCase().includes(keyword)

    const matchesSemester = semester.value === 'all' || student.semester === Number(semester.value)
    const matchesProgram = program.value === 'all' || student.program === program.value
    const matchesStatus = status.value === 'all' || student.status === status.value

    return matchesSearch && matchesSemester && matchesProgram && matchesStatus
  })
})
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 font-sans text-slate-900">
    <!-- ส่วนหัวของหน้า -->
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Student Dashboard</h1>
      <p class="mt-1 text-sm text-slate-500">
        Manage student data, track progress, and monitor thesis status
      </p>
    </header>

    <!-- การ์ด Import และ Export เป็น Frontend UI เท่านั้น -->
    <section class="translate-y-3 mt-6 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Import and export">
      <button
        type="button"
        class="flex cursor-default flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm"
      >
        <span
          class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#a33a3a]"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M12 3v12M7 10l5 5 5-5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">Import Excel</span>
        <span class="mt-1 text-xs text-slate-500">Upload students/advisor from excel file.</span>
      </button>

      <button
        type="button"
        class="flex cursor-default flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm"
      >
        <span
          class="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path d="M12 15V3M7 8l5-5 5 5" />
            <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span class="mt-3 font-semibold">Export Excel</span>
        <span class="mt-1 text-xs text-slate-500">Download all student information.</span>
      </button>
    </section>

    <!-- การ์ดสถิติ -->
    <section class="translate-y-6 mt-6 grid grid-cols-1 gap-5 md:grid-cols-3" aria-label="Student statistics">
      <article
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div
          class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#9d3434]"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            />
          </svg>
        </div>
        <div>
          <p class="text-sm text-slate-500">Total Students</p>
          <p class="text-2xl font-bold">{{ statistics.total }}</p>
        </div>
      </article>

      <article
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div
          class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#9d3434]"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.5 2.5L16 9" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-slate-500">On-track</p>
          <p class="text-2xl font-bold">{{ statistics.onTrack }}</p>
        </div>
      </article>

      <article
        class="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div
          class="flex size-12 items-center justify-center rounded-full bg-[#f8e9e9] text-[#9d3434]"
        >
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v6M12 17h.01" />
          </svg>
        </div>
        <div>
          <p class="text-sm text-slate-500">Overdue</p>
          <p class="text-2xl font-bold">{{ statistics.overdue }}</p>
        </div>
      </article>
    </section>

    <!-- ตารางข้อมูลนักศึกษา -->
    <section class="translate-y-10 mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 class="text-lg font-semibold">Student Overview</h2>
        <p class="mt-1 text-xs text-slate-500">Filter and view student progress details</p>
      </div>

      <!-- ค้นหาและตัวกรอง -->
      <div class="mt-5 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_140px_140px_140px]">
        <label class="relative block">
          <span class="sr-only">Search students</span>
          <svg
            class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            v-model="search"
            type="search"
            placeholder="Search by name or ID..."
            class="h-10 w-full rounded-lg border border-slate-200 bg-white pr-3 pl-10 text-sm outline-none focus:border-[#9d3434] focus:ring-2 focus:ring-[#9d3434]/15"
          />
        </label>

        <select
          v-model="semester"
          class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9d3434]"
        >
          <option value="all">All Semesters</option>
          <option value="1">Semester 1</option>
          <option value="2">Semester 2</option>
        </select>

        <select
          v-model="program"
          class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9d3434]"
        >
          <option value="all">All Programs</option>
          <option value="Ph.D.">Ph.D.</option>
        </select>

        <select
          v-model="status"
          class="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9d3434]"
        >
          <option value="all">All Statuses</option>
          <option value="On-track">On-track</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-190 border-collapse text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-xs text-slate-500">
              <th class="px-2 py-3 font-medium">Student</th>
              <th class="px-2 py-3 font-medium">Program</th>
              <th class="px-2 py-3 font-medium">Semester</th>
              <th class="px-2 py-3 font-medium">Progress</th>
              <th class="px-2 py-3 font-medium">Status</th>
              <th class="px-2 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="student in filteredStudents"
              :key="student.id"
              class="border-b border-slate-100 last:border-0"
            >
              <td class="px-2 py-3">
                <div class="flex items-center gap-3">
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f8e9e9] text-[#9d3434]"
                  >
                    <svg
                      class="size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                    >
                      <path d="m3 10 9-5 9 5-9 5-9-5Z" />
                      <path d="M7 12.5V17c3 2 7 2 10 0v-4.5" />
                    </svg>
                  </div>
                  <div>
                    <p class="font-medium text-slate-800">{{ student.name }}</p>
                    <p class="text-xs text-slate-400">{{ student.studentId }}</p>
                  </div>
                </div>
              </td>
              <td class="px-2 py-3">
                <span class="rounded border border-slate-200 px-2 py-0.5 text-xs">{{
                  student.program
                }}</span>
                <p class="mt-1 text-xs text-slate-500">{{ student.department }}</p>
              </td>
              <td class="px-2 py-3">{{ student.semester }}</td>
              <td class="px-2 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-2 w-28 overflow-hidden rounded-full bg-rose-100">
                    <div
                      class="h-full rounded-full bg-[#cf0015]"
                      :style="{ width: `${student.progress}%` }"
                    ></div>
                  </div>
                  <span class="text-xs font-medium">{{ student.progress }}%</span>
                </div>
              </td>
              <td class="px-2 py-3">
                <span
                  class="inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-medium text-white"
                  :class="student.status === 'Overdue' ? 'bg-[#cf0015]' : 'bg-amber-400'"
                >
                  {{ student.status }}
                </span>
              </td>
              <td class="px-2 py-3 text-right">
                <button type="button" class="font-medium text-sky-500 hover:text-sky-600">
                  View
                </button>
              </td>
            </tr>

            <tr v-if="filteredStudents.length === 0">
              <td colspan="6" class="px-3 py-12 text-center text-slate-500">
                No students match the selected filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
