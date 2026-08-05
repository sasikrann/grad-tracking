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
    class="flex items-center justify-center rounded-xl border border-slate-200 bg-white text-center shadow-sm transition disabled:cursor-wait disabled:opacity-60"
    :class="[
      compact ? 'gap-2 px-3 py-2 text-left' : 'flex-col px-6 py-7',
      tone === 'green' ? 'hover:border-emerald-500' : 'hover:border-[#7d2923]',
    ]"
    @click="$emit('click')"
  >
    <span
      class="flex shrink-0 items-center justify-center rounded-full"
      :class="[
        compact ? 'size-8' : 'size-12',
        tone === 'green'
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-[#f8e9e9] text-[#a33a3a]',
      ]"
    >
      <svg
        :class="compact ? 'size-4' : 'size-6'"
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
    <span :class="compact ? '' : 'mt-3'">
      <span :class="['block font-semibold', compact ? 'text-sm' : '']">
        {{ busy ? (busyLabel ?? title) : title }}
      </span>
      <span :class="['block text-slate-500', compact ? 'text-[10px]' : 'mt-1 text-xs']">
        {{ description }}
      </span>
    </span>
  </button>
</template>
