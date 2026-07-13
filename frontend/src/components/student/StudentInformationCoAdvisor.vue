<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Advisor } from '@/types/advisor'

const props = defineProps<{
  advisors: Advisor[]
  primaryAdvisorId: string | null
}>()

const currentCoAdvisors = ref<Array<Advisor | null>>([null, null])
const selectedCoAdvisorIds = ref(['', ''])
const isEditing = ref(false)
const saveMessage = ref('')

const hasCurrentCoAdvisors = computed(() => currentCoAdvisors.value.some(Boolean))
const coAdvisorOptions = computed(() =>
  props.advisors
    .filter((advisor) => advisor.advisorId !== props.primaryAdvisorId)
    .map((advisor) => ({
      value: advisor.advisorId,
      label: advisor.fullName,
      email: advisor.email,
    })),
)

function optionsFor(slotIndex: number) {
  const otherSelectedId = selectedCoAdvisorIds.value[slotIndex === 0 ? 1 : 0]
  return coAdvisorOptions.value.filter((advisor) => advisor.value !== otherSelectedId)
}

function startEdit() {
  selectedCoAdvisorIds.value = currentCoAdvisors.value.map((advisor) => advisor?.advisorId ?? '')
  saveMessage.value = ''
  isEditing.value = true
}

function cancelEdit() {
  selectedCoAdvisorIds.value = currentCoAdvisors.value.map((advisor) => advisor?.advisorId ?? '')
  saveMessage.value = ''
  isEditing.value = false
}

function savePreview() {
  currentCoAdvisors.value = selectedCoAdvisorIds.value.map(
    (advisorId) => props.advisors.find((advisor) => advisor.advisorId === advisorId) ?? null,
  )
  isEditing.value = false
  saveMessage.value = 'Co-advisors updated in this preview'
}
</script>

<template>
  <section class="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-lg bg-[#f7e9e8] text-[#8b2a23]">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-base font-semibold">Co-advisor Information</h2>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
            Optional
          </span>
        </div>
      </div>

      <button
        type="button"
        class="flex size-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
        aria-label="Change co-advisors"
        @click="startEdit"
      >
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" />
          <path d="m14 6 4 4" />
        </svg>
      </button>
    </div>

    <div v-if="hasCurrentCoAdvisors" class="mt-4 grid gap-3 sm:grid-cols-2">
      <template v-for="(coAdvisor, index) in currentCoAdvisors" :key="index">
        <div v-if="coAdvisor" class="rounded-lg border border-slate-200 bg-[#faf7f7] p-4">
          <p class="text-xs text-slate-500">Current Co-advisor {{ index + 1 }}</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ coAdvisor.fullName }}</p>
          <p class="mt-1 text-xs text-slate-500">{{ coAdvisor.email }}</p>
        </div>
      </template>
    </div>

    <div v-if="isEditing" class="mt-4 space-y-4">
      <div v-for="slotIndex in 2" :key="slotIndex">
        <label :for="`co-advisor-${slotIndex}`" class="text-sm font-semibold text-slate-900">
          Select / Change Co-advisor {{ slotIndex }}
        </label>
        <select
          :id="`co-advisor-${slotIndex}`"
          v-model="selectedCoAdvisorIds[slotIndex - 1]"
          class="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#8b2a23] focus:ring-2 focus:ring-[#8b2a23]/15"
          :class="selectedCoAdvisorIds[slotIndex - 1] ? 'text-slate-900' : 'text-slate-400'"
        >
          <option value="" class="text-slate-400">Select co-advisor</option>
          <option
            v-for="advisor in optionsFor(slotIndex - 1)"
            :key="advisor.value"
            :value="advisor.value"
            class="text-slate-900"
          >
            {{ advisor.label }} - {{ advisor.email }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium hover:bg-slate-50"
          @click="cancelEdit"
        >
          Cancel
        </button>
        <button
          type="button"
          class="h-10 rounded-lg bg-[#8b2a23] px-4 text-sm font-semibold text-white transition hover:bg-[#7a211c] sm:min-w-36"
          @click="savePreview"
        >
          Submit
        </button>
      </div>
    </div>

    <p v-if="saveMessage" class="mt-3 text-sm text-slate-600" role="status">
      {{ saveMessage }}
    </p>
  </section>
</template>
