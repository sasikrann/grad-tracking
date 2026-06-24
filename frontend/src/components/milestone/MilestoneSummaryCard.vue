<script setup lang="ts">
defineProps<{
  label: string
  value: number | string
  tone: 'completed' | 'progress' | 'approved' | 'overall'
}>()
</script>

<template>
  <article
    class="flex min-h-24 items-center rounded-xl border border-[#e6e6e6] bg-white px-5 shadow-[0_2px_3px_rgba(0,0,0,0.14)]"
  >
    <div
      class="flex size-12 shrink-0 items-center justify-center rounded-full"
      :class="{
        'bg-emerald-50 text-emerald-500': tone === 'completed',
        'bg-amber-50 text-amber-500': tone === 'progress',
        'bg-orange-50 text-[#c46b49]': tone === 'approved',
        'bg-violet-50 text-violet-500': tone === 'overall',
      }"
    >
      <svg
        class="size-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <template v-if="tone === 'completed'">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16.5 8" />
        </template>
        <template v-else-if="tone === 'progress'">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </template>
        <template v-else-if="tone === 'approved'">
          <circle cx="12" cy="10" r="5" />
          <path d="m9 15-1 6 4-2 4 2-1-6" />
          <path d="m12 7 .8 1.5 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2L12 7Z" />
        </template>
        <template v-else>
          <path d="M4 19V5M4 19h16" />
          <path d="m7 15 4-4 3 2 4-6" />
        </template>
      </svg>
    </div>

    <div class="ml-4 leading-tight">
      <p class="text-sm text-[#7b7b7b]">{{ label }}</p>
      <p class="mt-1 text-xl font-semibold text-slate-950">{{ value }}</p>
    </div>
  </article>
</template>
