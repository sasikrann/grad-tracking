<script setup lang="ts">
import StudentOverview from '@/components/student/StudentOverview.vue'
import SummaryCard from '@/components/student/SummaryCard.vue'
import { useStudentOverview } from '@/composables/useStudentOverview'
import { getStudents } from '@/services/students.api'

const { filteredStudents, filters, isLoading, loadError, search, statistics } = useStudentOverview(
  getStudents,
  'all',
)

// template สำหรับดาวน์โหลดไฟล์ CSV ตัวอย่างสำหรับการนำเข้าข้อมูลนักศึกษา 
const downloadTemplate = () => {
  const headers = ['Name', 'Student ID', 'Program', 'Semester']
  const exampleRow = ['Example Name', '6600000000', 'Master of Computer Engineering', '1']

  const csvContent = [headers, exampleRow]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = 'student_import_template.csv'
  link.click()

  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-8 py-6 font-sans text-slate-900">
    <header class="flex items-start justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">Student Dashboard</h1>
      <p class="mt-1 text-sm text-slate-500">
        Manage student data, track progress, and monitor thesis status
      </p>
    </div>

    <button
      type="button"
      @click="downloadTemplate"
      class="rounded-lg bg-[#8b2a23] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#7a211c]"
    >
      Download Template
    </button>
</header>

    <!-- การ์ด Import และ Export เป็น Frontend UI เท่านั้น -->
    <section class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Import and export">
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

    <!-- ใช้ SummaryCard component ร่วมกับหน้า Lecturer -->
    <section class="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
      <SummaryCard title="Total Students" :value="statistics.total" icon="students" />
      <SummaryCard title="On-track" :value="statistics.onTrack" icon="on-track" />
      <SummaryCard title="Overdue" :value="statistics.overdue" icon="overdue" />
    </section>

    <StudentOverview
      v-model:filters="filters"
      v-model:search="search"
      :students="filteredStudents"
      :is-loading="isLoading"
      :error="loadError"
      advisor-mode="all-only"
    />
  </div>
</template>
