<script setup lang="ts">
import { computed } from 'vue'

export interface MilestoneSelectOption {
  label: string
  value: string
}

const props = defineProps<{
  label: string
  modelValue: string
  options: MilestoneSelectOption[]
  open: boolean
  clearable?: boolean
  hideEmptyOption?: boolean
}>()

const emit = defineEmits<{
  toggle: []
  select: [value: string]
}>()

const dropdownOptions = computed(() =>
  props.clearable || props.hideEmptyOption
    ? props.options.filter((option) => option.value !== '')
    : props.options,
)
</script>

<template>
  <div class="relative block text-xs font-semibold leading-normal" @click.stop>
    <span class="inline-block py-0.5">{{ label }}</span>
    <button
      type="button"
      class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold leading-normal shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="truncate py-0.5">
        {{ options.find((option) => option.value === modelValue)?.label ?? options[0]?.label }}
      </span>
      <span
        v-if="clearable && modelValue"
        class="flex size-6 shrink-0 items-center justify-center rounded-full text-lg font-normal leading-none text-slate-500 hover:bg-red-50 hover:text-red-600"
        role="button"
        tabindex="0"
        aria-label="Clear selected advisor"
        @click.stop="emit('select', '')"
        @keydown.enter.stop="emit('select', '')"
        @keydown.space.prevent.stop="emit('select', '')"
      >
        &times;
      </span>
      <svg
        v-else
        class="size-4 shrink-0 text-[#777] transition-transform"
        :class="{ 'rotate-180': open }"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <path d="m7 10 5 5 5-5" />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-[calc(100%+8px)] z-30 w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
    >
      <button
        v-for="option in dropdownOptions"
        :key="option.value"
        type="button"
        class="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs font-semibold leading-normal hover:bg-[#f8eeee]"
        :class="{ 'bg-[#f8eeee]': modelValue === option.value }"
        @click="emit('select', option.value)"
      >
        <span class="min-w-0 truncate py-0.5" :title="option.label">{{ option.label }}</span>
        <svg
          v-if="modelValue === option.value"
          class="size-4 text-[#777]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </button>
    </div>
  </div>
</template>
