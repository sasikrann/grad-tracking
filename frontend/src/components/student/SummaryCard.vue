<script setup lang="ts">
defineProps<{
  title: string
  value: number
  icon: 'students' | 'on-track' | 'overdue'
}>()
</script>

<template>
  <article
    class="flex h-[88px] w-full items-center rounded-xl border border-[#e6e6e6] bg-white px-4 shadow-[0_2px_3px_rgba(0,0,0,0.18)]"
  >
    <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f8ebeb]">
      <svg
        class="size-7 text-[#8a2b25]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        aria-hidden="true"
      >
        <template v-if="icon === 'students'">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </template>
        <template v-else-if="icon === 'on-track'">
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </template>
        <template v-else>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 17h.01" />
        </template>
      </svg>
    </div>

    <div class="ml-4 leading-tight">
      <p class="text-base text-[#7b7b7b]">{{ title }}</p>
      <p class="mt-0.5 text-xl font-semibold">{{ value }}</p>
    </div>
  </article>
</template>
