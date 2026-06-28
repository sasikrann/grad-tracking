<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  title: string
  description: string
  selectedFile: File | null
  isImporting: boolean
  actionLabel?: string
}>()

const emit = defineEmits<{
  close: []
  import: []
  'select-file': [file: File | null]
}>()

const fileInput = ref<HTMLInputElement | null>(null)

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  emit('select-file', input.files?.[0] ?? null)
}

function handleFileDrop(event: DragEvent) {
  emit('select-file', event.dataTransfer?.files?.[0] ?? null)
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="import-modal-title"
  >
    <section class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
      <h2 id="import-modal-title" class="text-base font-semibold">{{ title }}</h2>
      <p class="mt-1 text-xs text-slate-500">{{ description }}</p>

      <button
        type="button"
        class="mt-5 flex h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 text-center transition hover:border-[#8b2a23]"
        @click="fileInput?.click()"
        @dragover.prevent
        @drop.prevent="handleFileDrop"
      >
        <svg class="size-8 text-[#8b2a23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
          <path d="M12 3v12M7 10l5 5 5-5" />
          <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
        <span class="mt-3 text-xs text-slate-500">
          {{ selectedFile ? selectedFile.name : 'Drag and drop your file here, or click to browse' }}
        </span>
        <span class="mt-2 rounded bg-[#8b2a23] px-3 py-1.5 text-xs font-medium text-white">
          Browse File
        </span>
        <span class="mt-2 text-[10px] text-slate-400">Supported formats: .xlsx, .csv</span>
      </button>

      <input ref="fileInput" class="hidden" type="file" accept=".csv,.xlsx" @change="handleFileSelect" />

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
          :disabled="!selectedFile || isImporting"
          class="rounded bg-[#8b2a23] px-3 py-2 text-xs font-medium text-white hover:bg-[#7a211c] disabled:cursor-not-allowed disabled:opacity-60"
          @click="$emit('import')"
        >
          {{ isImporting ? 'Importing...' : (actionLabel ?? 'Import Advisor') }}
        </button>
      </div>
    </section>
  </div>
</template>
