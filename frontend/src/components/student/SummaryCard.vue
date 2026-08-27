<script setup lang="ts">
defineProps<{
  title: string
  value: number
  icon: 'students' | 'on-track' | 'overdue' | 'graduate'
}>()
</script>

<template>
  <article
    class="flex h-[76px] w-full items-center rounded-lg border border-[#e6e6e6] bg-white px-3 shadow-[0_2px_3px_rgba(0,0,0,0.12)] sm:rounded-xl sm:px-5"
  >
    <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f8ebeb]">
      <svg
        class="size-6 text-[#8a2b25]"
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
        <template v-else-if="icon === 'overdue'">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6M12 17h.01" />
        </template>
        <template v-else>
          <path d="m3 9 9-4 9 4-9 4-9-4Z" />
          <path d="M7 11v4.5c2.7 2 7.3 2 10 0V11" />
        </template>
      </svg>
    </div>

    <div class="ml-3 min-w-0 sm:ml-4">
      <p class="truncate py-0.5 text-xs leading-normal text-[#7b7b7b] sm:text-sm">{{ title }}</p>
      <p class="mt-0.5 text-lg font-semibold">{{ value }}</p>
    </div>
  </article>
</template>
