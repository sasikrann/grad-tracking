<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLanguage } from '@/composables/useLanguage'

const props = defineProps<{ label: string; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const { isThai } = useLanguage()
const isOpen = ref(false)
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())
let previousBodyOverflow = ''

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const selectedDate = computed(() => parseDate(props.modelValue))
const displayValue = computed(() =>
  selectedDate.value
    ? new Intl.DateTimeFormat(isThai.value ? 'th-TH' : 'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(selectedDate.value)
    : '',
)
const monthTitle = computed(() =>
  new Intl.DateTimeFormat(isThai.value ? 'th-TH' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(viewYear.value, viewMonth.value, 1)),
)
const weekdayLabels = computed(() =>
  isThai.value
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
)
const calendarDays = computed(() => {
  const offset = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const count = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= count ? new Date(viewYear.value, viewMonth.value, day) : null
  })
})

function openCalendar() {
  const date = selectedDate.value ?? new Date()
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
  isOpen.value = true
}
function changeMonth(offset: number) {
  const date = new Date(viewYear.value, viewMonth.value + offset, 1)
  viewYear.value = date.getFullYear()
  viewMonth.value = date.getMonth()
}
function selectDate(date: Date) {
  emit('update:modelValue', toIsoDate(date))
  isOpen.value = false
}
function selectToday() {
  selectDate(new Date())
}
function isSelected(date: Date) {
  return props.modelValue === toIsoDate(date)
}
function isToday(date: Date) {
  return toIsoDate(date) === toIsoDate(new Date())
}

watch(isOpen, (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else document.body.style.overflow = previousBodyOverflow
})
onBeforeUnmount(() => {
  document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="block text-xs font-semibold text-slate-900">
    <span>{{ label }}</span>
    <button
      type="button"
      class="relative mt-1 flex h-10 w-full items-center rounded-md border border-[#c9827c] bg-white px-3 pr-10 text-left text-xs font-normal outline-none hover:border-[#7D2923] focus:border-[#7D2923] focus:ring-1 focus:ring-[#7D2923]"
      @click="openCalendar"
    >
      <span :class="displayValue ? 'text-slate-900' : 'text-slate-400'">
        {{ displayValue || (isThai ? 'เลือกวันที่' : 'Select date') }}
      </span>
      <svg
        class="absolute right-3 size-4 text-[#7D2923]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        aria-hidden="true"
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
        role="dialog"
        aria-modal="true"
        :aria-label="label"
        @click.self="isOpen = false"
      >
        <section class="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
          <header class="bg-[#7D2923] px-5 py-4 text-white">
            <p class="text-xs text-white/75">{{ label }}</p>
            <p class="mt-1 text-xl font-semibold">
              {{ displayValue || (isThai ? 'เลือกวันที่' : 'Select a date') }}
            </p>
          </header>
          <div class="p-4">
            <div class="flex items-center justify-between">
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
                @click="changeMonth(-1)"
              >
                ‹
              </button>
              <h2 class="text-sm font-semibold">{{ monthTitle }}</h2>
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full text-xl text-slate-600 hover:bg-slate-100"
                @click="changeMonth(1)"
              >
                ›
              </button>
            </div>
            <div class="mt-2 grid grid-cols-7 text-center">
              <span
                v-for="weekday in weekdayLabels"
                :key="weekday"
                class="py-2 text-[10px] font-medium text-slate-400"
                >{{ weekday }}</span
              >
              <div
                v-for="(date, index) in calendarDays"
                :key="index"
                class="flex h-10 items-center justify-center"
              >
                <button
                  v-if="date"
                  type="button"
                  class="flex size-9 items-center justify-center rounded-full text-xs font-medium transition"
                  :class="
                    isSelected(date)
                      ? 'bg-[#7D2923] text-white shadow-sm'
                      : isToday(date)
                        ? 'border border-[#7D2923] text-[#7D2923]'
                        : 'text-slate-700 hover:bg-[#f8eeee]'
                  "
                  @click="selectDate(date)"
                >
                  {{ date.getDate() }}
                </button>
              </div>
            </div>
            <footer class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                class="px-3 py-2 text-xs font-semibold text-[#7D2923]"
                @click="selectToday"
              >
                {{ isThai ? 'วันนี้' : 'Today' }}
              </button>
              <button
                type="button"
                class="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                @click="isOpen = false"
              >
                {{ isThai ? 'ยกเลิก' : 'Cancel' }}
              </button>
            </footer>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
