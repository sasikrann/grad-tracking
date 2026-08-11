<script setup lang="ts">
import { onMounted, ref } from 'vue'

import StudentInformationAdvisor from '@/components/student/StudentInformationAdvisor.vue'
import StudentInformationCoAdvisor from '@/components/student/StudentInformationCoAdvisor.vue'
import StudentInformationStudyPlan from '@/components/student/StudentInformationStudyPlan.vue'
import {
  getMyStudentProfile,
  type StudentProfile,
} from '@/services/student-profile.api'
import { useAutoRefresh } from '@/composables/useAutoRefresh'

const profile = ref<StudentProfile | null>(null)
const isLoading = ref(true)
const loadError = ref('')

async function loadPage({ silent = false } = {}) {
  if (!silent) isLoading.value = true
  if (!silent) loadError.value = ''

  try {
    profile.value = await getMyStudentProfile()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load student information'
  } finally {
    if (!silent) isLoading.value = false
  }
}

onMounted(loadPage)
useAutoRefresh(() => loadPage({ silent: true }))
</script>

<template>
  <div class="min-h-screen bg-[#f7f7f7] px-4 py-6 font-sans text-slate-900 sm:px-6 xl:px-8">
    <header>
      <h1 class="text-3xl font-bold tracking-tight">Student Information</h1>
      <p class="mt-1 text-sm text-slate-500">View student information and manage your advisory team</p>
    </header>

    <p v-if="isLoading" class="mt-6 text-sm text-slate-500" role="status">
      Loading student information...
    </p>

    <p v-else-if="loadError" class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {{ loadError }}
    </p>

    <template v-else-if="profile">
      <StudentInformationStudyPlan :profile="profile" />
      <StudentInformationAdvisor
        :profile="profile"
      />
      <StudentInformationCoAdvisor
        :co-advisors="profile.coAdvisors"
      />
    </template>
  </div>
</template>
