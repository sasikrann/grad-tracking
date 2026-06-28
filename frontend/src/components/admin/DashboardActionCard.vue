<script setup lang="ts">
defineProps<{
  title: string
  description: string
  tone: 'red' | 'green'
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
    class="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-7 text-center shadow-sm transition disabled:cursor-wait disabled:opacity-60"
    :class="tone === 'green' ? 'hover:border-emerald-500' : 'hover:border-[#7d2923]'"
    @click="$emit('click')"
  >
    <span
      class="flex size-12 items-center justify-center rounded-full"
      :class="tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#f8e9e9] text-[#a33a3a]'"
    >
      <svg class="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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
    <span class="mt-3 font-semibold">{{ busy ? (busyLabel ?? title) : title }}</span>
    <span class="mt-1 text-xs text-slate-500">{{ description }}</span>
  </button>
</template>
