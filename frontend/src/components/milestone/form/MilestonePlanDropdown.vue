<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage'
const { t } = useLanguage()
import { computed } from 'vue'

import type { EducationPlan } from '@/types/milestone'

const props = defineProps<{
  modelValue: EducationPlan[]
  options: EducationPlan[]
  open: boolean
}>()

const emit = defineEmits<{
  toggle: []
  'update:modelValue': [plans: EducationPlan[]]
}>()

const selectedLabel = computed(() =>
  props.modelValue.includes('All')
    ? t('common.allPlan')
    : props.modelValue.map(planLabel).join(', '),
)

function planLabel(plan: EducationPlan) {
  const keys = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  } as const
  return plan === 'All' || plan === '1.1' ? (plan === 'All' ? t('common.allPlan') : plan) : t(keys[plan])
}

function togglePlan(plan: EducationPlan) {
  if (plan === 'All') {
    emit('update:modelValue', ['All'])
    return
  }

  const selectedPlans = props.modelValue.filter((selectedPlan) => selectedPlan !== 'All')
  const nextPlans = selectedPlans.includes(plan)
    ? selectedPlans.filter((selectedPlan) => selectedPlan !== plan)
    : [...selectedPlans, plan]

  emit('update:modelValue', nextPlans.length ? nextPlans : ['All'])
}
</script>

<template>
  <div class="relative block text-xs font-semibold" @click.stop>
    <span>{{ t('common.plan') }}</span>
    <button
      type="button"
      class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="truncate">{{ selectedLabel }}</span>
      <svg
        class="size-4 shrink-0 text-[#777] transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <path d="m7 10 5 5 5-5" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
    >
      <label
        v-for="plan in options"
        :key="plan"
        class="flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-[#f8eeee]"
        :class="{ 'bg-[#f8eeee]': modelValue.includes(plan) }"
      >
        <input
          type="checkbox"
          class="size-4 shrink-0 accent-[#7D2923]"
          :checked="modelValue.includes(plan)"
          @change="togglePlan(plan)"
        />
        {{ planLabel(plan) }}
      </label>
    </div>
  </div>
</template>
