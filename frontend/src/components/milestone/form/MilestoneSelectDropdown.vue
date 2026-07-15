<script setup lang="ts">
export interface MilestoneSelectOption {
  label: string
  value: string
}

defineProps<{
  label: string
  modelValue: string
  options: MilestoneSelectOption[]
  open: boolean
}>()

const emit = defineEmits<{
  toggle: []
  select: [value: string]
}>()
</script>

<template>
  <div class="relative block text-xs font-semibold" @click.stop>
    <span>{{ label }}</span>
    <button
      type="button"
      class="mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[#c9827c] bg-white px-3 text-left text-xs font-semibold shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none hover:border-[#dfcccc] focus:border-[#7D2923]"
      :aria-expanded="open"
      @click="emit('toggle')"
    >
      <span class="truncate">
        {{ options.find((option) => option.value === modelValue)?.label ?? options[0]?.label }}
      </span>
      <svg
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
      class="absolute left-0 top-[calc(100%+8px)] z-30 min-w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-2.5 py-2 text-left text-xs font-semibold hover:bg-[#f8eeee]"
        :class="{ 'bg-[#f8eeee]': modelValue === option.value }"
        @click="emit('select', option.value)"
      >
        {{ option.label }}
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
