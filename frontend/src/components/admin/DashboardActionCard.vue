<script setup lang="ts">
defineProps<{
  title: string
  description: string
  tone: 'red' | 'green'
  compact?: boolean
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
        ? 'gap-2 rounded-xl border-[#b9efd8] bg-[#effcf6] px-2.25 py-1 text-left text-[#008f68] shadow-[0_2px_5px_rgba(0,168,120,0.1)] hover:border-[#7cddb9] hover:bg-[#e2faef] active:scale-[0.98]'
        : 'flex-col gap-2 border-slate-200 bg-white px-4 py-4 text-center shadow-sm sm:gap-3 sm:px-6 sm:py-7',
      !compact && (tone === 'green' ? 'hover:border-emerald-500' : 'hover:border-[#7d2923]'),
    ]"
    @click="$emit('click')"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-full"
      :class="[
        compact ? 'size-6' : 'size-10 sm:size-12',
        compact && tone === 'green'
          ? 'bg-[#cdf7e5] text-[#00a878]'
          : tone === 'green'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-[#f8e9e9] text-[#a33a3a]',
      ]"
    >
      <svg
        :class="compact ? 'size-3.5' : 'size-5 sm:size-6'"
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
    <span>
      <span :class="['block font-semibold', compact ? 'text-xs' : 'text-sm sm:text-base']">
        {{ busy ? (busyLabel ?? title) : title }}
      </span>
      <span
        v-if="!compact"
        :class="['block text-slate-500', 'mt-0.5 text-[10px] sm:mt-1 sm:text-xs']"
      >
        {{ description }}
      </span>
    </span>
  </button>
</template>
