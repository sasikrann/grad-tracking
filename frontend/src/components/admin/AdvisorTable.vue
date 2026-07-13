<script setup lang="ts">
import type { Advisor } from '@/types/advisor'

defineProps<{
  advisors: Advisor[]
  isLoading: boolean
  error: string
}>()

defineEmits<{ status: [advisorId: string, status: Advisor['status']] }>()

function initials(name: string) {
  return name
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function statusLabel(status: Advisor['status']) {
  return status === 'inactive' ? 'Active' : 'Disable'
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold">Advisor</h2>
        <p class="text-xs text-slate-500">Showing {{ advisors.length }} users</p>
      </div>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-sm text-slate-500">Loading advisors...</div>
    <div v-else-if="error" class="py-10 text-center text-sm text-red-600">{{ error }}</div>
    <div v-else class="mt-4 overflow-x-auto">
      <table class="min-w-full table-fixed text-left text-sm">
        <thead class="border-b border-slate-200 text-xs font-semibold text-slate-900">
          <tr>
            <th class="w-[38%] py-3 pr-4">Advisors</th>
            <th class="w-[37%] px-4 py-3">
              <div class="mx-auto w-64 text-left">Email</div>
            </th>
            <th class="w-[25%] py-3 pl-4">
              <div class="ml-auto w-38 text-center">Status</div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="advisor in advisors" :key="advisor.advisorId">
            <td class="w-[38%] py-3 pr-4">
              <div class="flex items-center gap-4">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4e7e7] text-xs font-semibold text-[#a33a3a]">
                  {{ initials(advisor.fullName) }}
                </span>
                <span class="font-semibold">{{ advisor.fullName }}</span>
              </div>
            </td>
            <td class="w-[37%] px-4 py-3 text-xs text-slate-600">
              <div class="mx-auto w-64 text-left">{{ advisor.email }}</div>
            </td>
            <td class="w-[25%] py-3 pl-4 text-right">
              <div class="ml-auto flex w-38 justify-center gap-2">
                <button v-for="status in (['inactive', 'disabled'] as const)" :key="status" type="button" :disabled="advisor.status === status" :aria-label="`Set ${advisor.fullName} status to ${statusLabel(status)}`" class="rounded-md border px-3 py-1 text-[11px] disabled:cursor-default" :class="advisor.status === status ? (status === 'inactive' ? 'border-green-200 bg-green-100 text-green-700' : 'border-red-200 bg-red-50 text-red-700') : 'border-slate-200 text-slate-500 hover:bg-slate-50'" @click="$emit('status', advisor.advisorId, status)">
                  {{ statusLabel(status) }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="advisors.length === 0">
            <td colspan="3" class="py-10 text-center text-sm text-slate-500">
              No advisors match the selected filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
