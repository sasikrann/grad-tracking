<script setup lang="ts">
defineProps<{
  title: string
  description: string
  countLabel: string
  isExporting: boolean
}>()

defineEmits<{
  close: []
  export: []
}>()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-modal-title"
  >
    <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
      <h2 id="export-modal-title" class="text-base font-semibold">{{ title }}</h2>
      <p class="mt-1 text-xs text-slate-500">{{ description }}</p>

      <div class="mt-5 rounded-lg bg-slate-100 px-4 py-10 text-center">
        <svg class="mx-auto size-9 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <rect x="4" y="5" width="16" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M4 11h16" />
        </svg>
        <p class="mt-2 text-xs font-semibold">{{ countLabel }}</p>
        <p class="text-[10px] text-slate-500">Ready for export</p>
      </div>

      <div class="mt-4 flex justify-end gap-2">
        <button
          type="button"
          class="rounded border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="isExporting"
          class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-wait disabled:opacity-60"
          @click="$emit('export')"
        >
          {{ isExporting ? 'Exporting...' : 'Export' }}
        </button>
      </div>
    </section>
  </div>
</template>
