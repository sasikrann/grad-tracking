<script setup lang="ts">
defineProps<{
  title: string
  description: string
  tone: 'red' | 'green'
  compact?: boolean
  mobileHorizontal?: boolean
  busy?: boolean
  busyLabel?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :disabled="busy"
    class="flex items-center justify-center rounded-xl border text-center transition disabled:cursor-wait disabled:opacity-60"
    :class="[
      compact
        ? 'gap-2 rounded-xl border-[#b9efd8] bg-[#effcf6] px-2.25 py-1 text-left text-[#008f68] shadow-[0_2px_5px_rgba(0,168,120,0.1)] hover:border-[#7cddb9] hover:bg-[#e2faef] active:scale-[0.98] sm:border-slate-200 sm:bg-white sm:px-3 sm:py-2 sm:text-slate-900 sm:shadow-sm sm:hover:border-emerald-500 sm:hover:bg-white sm:active:scale-100'
        : mobileHorizontal
          ? 'min-h-16 flex-row gap-2 border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm sm:flex-col sm:gap-3 sm:px-6 sm:py-7 sm:text-center'
          : 'flex-col gap-2 border-slate-200 bg-white px-4 py-4 text-center shadow-sm sm:gap-3 sm:px-6 sm:py-7',
      !compact && (tone === 'green' ? 'hover:border-emerald-500' : 'hover:border-[#7d2923]'),
    ]"
    @click="$emit('click')"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-full"
      :class="[
        compact
          ? 'size-6 sm:size-8'
          : mobileHorizontal
            ? 'size-8 sm:size-12'
            : 'size-10 sm:size-12',
        compact && tone === 'green'
          ? 'bg-[#cdf7e5] text-[#00a878] sm:bg-emerald-50 sm:text-emerald-600'
          : tone === 'green'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-[#f8e9e9] text-[#a33a3a]',
      ]"
    >
      <svg
        :class="
          compact
            ? 'size-3.5 sm:size-4'
            : mobileHorizontal
              ? 'size-4 sm:size-6'
              : 'size-5 sm:size-6'
        "
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <template v-if="tone === 'green'">
          <path d="M12 15V3M7 8l5-5 5 5" />
          <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </template>
        <template v-else>
          <path d="M12 3v12M7 10l5 5 5-5" />
          <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </template>
      </svg>
    </span>
    <span :class="{ 'min-w-0': mobileHorizontal }">
      <span
        :class="[
          'block font-semibold',
          compact
            ? 'text-xs sm:text-sm'
            : mobileHorizontal
              ? 'text-xs sm:text-base'
              : 'text-sm sm:text-base',
        ]"
      >
        {{ busy ? (busyLabel ?? title) : title }}
      </span>
      <span
        :class="[
          'text-slate-500',
          compact
            ? 'hidden text-[10px] sm:block'
            : mobileHorizontal
              ? 'mt-0.5 block text-[10px] sm:mt-1 sm:text-xs'
              : 'mt-0.5 block text-[10px] sm:mt-1 sm:text-xs',
        ]"
      >
        {{ description }}
      </span>
    </span>
  </button>
</template>
