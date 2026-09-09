<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  currentPage: number
  totalPages: number
  paginationLabel: string
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const items = computed<Array<number | 'ellipsis'>>(() => {
  const total = props.totalPages
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  if (props.currentPage <= 3) return [1, 2, 3, 4, 'ellipsis']
  if (props.currentPage >= total - 2) {
    return ['ellipsis', total - 3, total - 2, total - 1, total]
  }
  return ['ellipsis', props.currentPage - 1, props.currentPage, props.currentPage + 1, 'ellipsis']
})

function changePage(page: number) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return
  emit('change', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="flex justify-end" :aria-label="paginationLabel">
    <div class="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        :disabled="currentPage === 1"
        :aria-label="`${paginationLabel}: previous`"
        @click="changePage(currentPage - 1)"
      >
        ‹
      </button>
      <template v-for="(item, index) in items" :key="`${item}-${index}`">
        <span
          v-if="item === 'ellipsis'"
          class="flex size-8 items-center justify-center border-r border-slate-200 text-xs text-slate-400"
        >
          …
        </span>
        <button
          v-else
          type="button"
          class="flex size-8 items-center justify-center border-r border-slate-200 text-xs font-medium transition-colors"
          :class="
            item === currentPage
              ? 'bg-[#f7c9cf] text-[#a13a34]'
              : 'text-slate-700 hover:bg-[#fdf1f3]'
          "
          :aria-current="item === currentPage ? 'page' : undefined"
          :aria-label="`${paginationLabel}: ${item}`"
          @click="changePage(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="flex size-8 items-center justify-center text-xs text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        :disabled="currentPage === totalPages"
        :aria-label="`${paginationLabel}: next`"
        @click="changePage(currentPage + 1)"
      >
        ›
      </button>
    </div>
  </nav>
</template>
