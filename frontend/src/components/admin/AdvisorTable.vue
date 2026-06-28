<script setup lang="ts">
import type { Advisor } from '@/types/advisor'

defineProps<{
  advisors: Advisor[]
  isLoading: boolean
  error: string
}>()

function initials(name: string) {
  return name
    .replace(/^(Mr\.?|Mrs\.?|Ms\.?|Dr\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold">Advisor</h2>
        <p class="text-xs text-slate-500">Showing {{ advisors.length }} users</p>
      </div>
    </div>

    <div v-if="isLoading" class="py-10 text-center text-sm text-slate-500">Loading advisors...</div>
    <div v-else-if="error" class="py-10 text-center text-sm text-red-600">{{ error }}</div>
    <div v-else class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-slate-200 text-xs font-semibold text-slate-900">
          <tr>
            <th class="py-3 pr-4">Advisors</th>
            <th class="px-4 py-3 text-right">Email</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="advisor in advisors" :key="advisor.advisorId">
            <td class="py-3 pr-4">
              <div class="flex items-center gap-4">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4e7e7] text-xs font-semibold text-[#a33a3a]">
                  {{ initials(advisor.fullName) }}
                </span>
                <span class="font-semibold">{{ advisor.fullName }}</span>
              </div>
            </td>
            <td class="px-4 py-3 text-right text-xs text-slate-600">{{ advisor.email }}</td>
          </tr>
          <tr v-if="advisors.length === 0">
            <td colspan="2" class="py-10 text-center text-sm text-slate-500">No advisors found</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
