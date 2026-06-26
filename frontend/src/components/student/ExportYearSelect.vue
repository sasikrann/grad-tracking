<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  modelValue: string
  options: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)

const selectedLabel = computed(() => (props.modelValue === 'all' ? 'All Year' : props.modelValue))

function selectYear(year: string) {
  emit('update:modelValue', year)
  isOpen.value = false
}
</script>

<template>
  <label class="mt-4 block text-xs font-semibold">
    <span>Filter by Enrollment Year</span>
    <span class="relative mt-1 block h-9 w-full">
      <button
        type="button"
        class="flex h-9 w-full items-center justify-between rounded-lg border border-[#eeeeee] bg-white px-3 text-left text-xs font-medium text-[#333] shadow-[0_2px_4px_rgba(0,0,0,0.08)] outline-none transition-colors hover:border-[#dfcccc] focus:border-[#8a2b25]"
        :aria-expanded="isOpen"
        @click="isOpen = !isOpen"
      >
        <span>{{ selectedLabel }}</span>
        <svg
          class="size-4 shrink-0 text-[#777] transition-transform"
          :class="{ 'rotate-180': isOpen }"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          aria-hidden="true"
        >
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>

      <span
        v-if="isOpen"
        class="absolute left-0 top-[calc(100%+6px)] z-20 block w-full overflow-hidden rounded-lg border border-[#eeeeee] bg-white p-1.5 shadow-[0_5px_12px_rgba(0,0,0,0.12)]"
      >
        <button
          v-for="year in options"
          :key="year"
          type="button"
          class="flex h-8 w-full items-center justify-between rounded-md px-2.5 text-left text-xs font-medium hover:bg-[#f8eeee]"
          :class="{ 'bg-[#f8eeee] text-[#8a2b25]': modelValue === year }"
          @click="selectYear(year)"
        >
          <span>{{ year === 'all' ? 'All Year' : year }}</span>
          <svg
            v-if="modelValue === year"
            class="size-4 text-[#777]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="m5 12 4 4L19 6" />
          </svg>
        </button>
      </span>
    </span>
  </label>
</template>
