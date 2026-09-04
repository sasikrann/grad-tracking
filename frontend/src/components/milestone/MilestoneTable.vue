<!-- Component ตารางสำหรับแสดงรายการ Milestone ในหน้า Milestone Management -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { Milestone } from '@/types/milestone'
import { useLanguage } from '@/composables/useLanguage'
const { isThai, t } = useLanguage()

const props = defineProps<{
  milestones: Milestone[]
  isLoading: boolean
  groupBySemester?: boolean
}>()

const emit = defineEmits<{
  edit: [milestone: Milestone]
  remove: [milestone: Milestone]
  setEnabled: [milestone: Milestone, isEnabled: boolean]
  move: [milestoneId: string, direction: 'up' | 'down']
  moveTo: [milestoneId: string, targetMilestoneId: string]
}>()

const draggingMilestoneId = ref<string | null>(null)
const touchStartY = ref(0)
const touchOffsetY = ref(0)
const touchTargetIndex = ref<number | null>(null)
const AUTO_SCROLL_EDGE_SIZE = 96
const AUTO_SCROLL_MAX_SPEED = 14

let activePointerId: number | null = null
let activePointerTarget: HTMLElement | null = null
let activeReorderScope: HTMLElement | null = null
let lastPointerY = 0
let reorderScrollContainer: HTMLElement | Window | null = null
let accumulatedAutoScroll = 0
let autoScrollFrame: number | null = null
let touchSourceIndex = -1
let draggedCardHeight = 0
let initialCardCenters: Array<{ milestoneId: string; centerY: number }> = []

function closeActionMenus() {
  document
    .querySelectorAll<HTMLDetailsElement>('.milestone-actions-menu[open]')
    .forEach((menu) => menu.removeAttribute('open'))
}

function handleOutsideMenuClick(event: MouseEvent) {
  if ((event.target as Element | null)?.closest('.milestone-actions-menu')) return
  closeActionMenus()
}

function handleMenuAction(event: MouseEvent, action: 'edit' | 'remove', milestone: Milestone) {
  ;(event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open')
  emit(action, milestone)
}

onMounted(() => {
  document.addEventListener('click', handleOutsideMenuClick)
  window.addEventListener('scroll', closeActionMenus, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideMenuClick)
  window.removeEventListener('scroll', closeActionMenus, true)
  stopAutoScroll()
})

function startTouchReorder(event: PointerEvent, milestoneId: string) {
  event.preventDefault()
  draggingMilestoneId.value = milestoneId
  touchStartY.value = event.clientY
  lastPointerY = event.clientY
  touchOffsetY.value = 0
  activePointerId = event.pointerId
  activePointerTarget = event.currentTarget as HTMLElement
  activePointerTarget.setPointerCapture(event.pointerId)
  activeReorderScope = activePointerTarget.closest<HTMLElement>('[data-reorder-scope]')
  reorderScrollContainer = findScrollContainer(activePointerTarget)
  accumulatedAutoScroll = 0
  const cards = reorderItems()
  touchSourceIndex = cards.findIndex((card) => card.dataset.reorderMilestoneId === milestoneId)
  touchTargetIndex.value = touchSourceIndex
  draggedCardHeight = cards[touchSourceIndex]?.getBoundingClientRect().height ?? 0
  initialCardCenters = cards.map((card) => ({
    milestoneId: card.dataset.reorderMilestoneId ?? '',
    centerY: card.getBoundingClientRect().top + card.getBoundingClientRect().height / 2,
  }))
  autoScrollFrame = requestAnimationFrame(runAutoScroll)
}

function moveTouchReorder(event: PointerEvent) {
  if (!draggingMilestoneId.value || event.pointerId !== activePointerId) return
  lastPointerY = event.clientY
  updateTouchOffset()
  updateTouchTarget()
}

function reorderItems() {
  return Array.from(
    activeReorderScope?.querySelectorAll<HTMLElement>('[data-reorder-milestone-id]') ?? [],
  )
}

function findScrollContainer(element: HTMLElement): HTMLElement | Window {
  let parent = element.parentElement

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent)
    if (/(auto|scroll)/.test(overflowY) && parent.scrollHeight > parent.clientHeight) return parent
    parent = parent.parentElement
  }

  return window
}

function updateTouchOffset() {
  touchOffsetY.value = lastPointerY - touchStartY.value + accumulatedAutoScroll
}

function updateTouchTarget() {
  const sourceMilestoneId = draggingMilestoneId.value
  if (!sourceMilestoneId || touchSourceIndex < 0) return

  const pointerPositionInInitialViewport = lastPointerY + accumulatedAutoScroll
  const targetIndex = initialCardCenters
    .filter((card) => card.milestoneId !== sourceMilestoneId)
    .reduce((index, card) => index + (pointerPositionInInitialViewport > card.centerY ? 1 : 0), 0)
  touchTargetIndex.value = Math.max(0, Math.min(initialCardCenters.length - 1, targetIndex))
}

function reorderItemStyle(milestoneId: string) {
  if (draggingMilestoneId.value === milestoneId) {
    return { transform: `translateY(${touchOffsetY.value}px) scale(1.02)` }
  }
  if (touchTargetIndex.value === null || touchSourceIndex < 0) return undefined

  const cardIndex = initialCardCenters.findIndex((card) => card.milestoneId === milestoneId)
  const itemGap = activeReorderScope?.classList.contains('space-y-2') ? 8 : 0
  const shiftDistance = draggedCardHeight + itemGap
  if (touchSourceIndex < touchTargetIndex.value) {
    if (cardIndex > touchSourceIndex && cardIndex <= touchTargetIndex.value) {
      return { transform: `translateY(-${shiftDistance}px)` }
    }
  } else if (touchSourceIndex > touchTargetIndex.value) {
    if (cardIndex >= touchTargetIndex.value && cardIndex < touchSourceIndex) {
      return { transform: `translateY(${shiftDistance}px)` }
    }
  }
  return undefined
}

function reorderDisplayOrder(milestoneId: string, fallbackOrder: number) {
  if (!draggingMilestoneId.value || touchTargetIndex.value === null) return fallbackOrder
  const cardIndex = initialCardCenters.findIndex((card) => card.milestoneId === milestoneId)
  if (cardIndex < 0) return fallbackOrder
  if (milestoneId === draggingMilestoneId.value) return touchTargetIndex.value + 1
  if (touchSourceIndex < touchTargetIndex.value && cardIndex > touchSourceIndex) {
    return cardIndex <= touchTargetIndex.value ? cardIndex : fallbackOrder
  }
  if (touchSourceIndex > touchTargetIndex.value && cardIndex < touchSourceIndex) {
    return cardIndex >= touchTargetIndex.value ? cardIndex + 2 : fallbackOrder
  }
  return fallbackOrder
}

function autoScrollSpeed(pointerY: number, top: number, bottom: number) {
  if (pointerY < top + AUTO_SCROLL_EDGE_SIZE) {
    const strength = Math.min(1, (top + AUTO_SCROLL_EDGE_SIZE - pointerY) / AUTO_SCROLL_EDGE_SIZE)
    return -AUTO_SCROLL_MAX_SPEED * strength
  }
  if (pointerY > bottom - AUTO_SCROLL_EDGE_SIZE) {
    const strength = Math.min(
      1,
      (pointerY - (bottom - AUTO_SCROLL_EDGE_SIZE)) / AUTO_SCROLL_EDGE_SIZE,
    )
    return AUTO_SCROLL_MAX_SPEED * strength
  }
  return 0
}

function runAutoScroll() {
  if (!draggingMilestoneId.value || !reorderScrollContainer) {
    autoScrollFrame = null
    return
  }

  const containerBounds =
    reorderScrollContainer instanceof HTMLElement
      ? reorderScrollContainer.getBoundingClientRect()
      : { top: 0, bottom: window.innerHeight }
  const bounds = {
    top: Math.max(0, containerBounds.top),
    bottom: Math.min(window.innerHeight, containerBounds.bottom),
  }
  const speed = autoScrollSpeed(lastPointerY, bounds.top, bounds.bottom)

  if (speed !== 0) {
    accumulatedAutoScroll += scrollReorderContainer(speed)
    updateTouchOffset()
    updateTouchTarget()
  }

  autoScrollFrame = requestAnimationFrame(runAutoScroll)
}

function scrollWindowBy(amount: number) {
  const previousScrollY = window.scrollY
  window.scrollBy(0, amount)
  return window.scrollY - previousScrollY
}

function scrollReorderContainer(amount: number) {
  if (!(reorderScrollContainer instanceof HTMLElement)) return scrollWindowBy(amount)

  const previousScrollTop = reorderScrollContainer.scrollTop
  reorderScrollContainer.scrollTop += amount
  const containerScroll = reorderScrollContainer.scrollTop - previousScrollTop
  const remainingScroll = amount - containerScroll

  return containerScroll + (Math.abs(remainingScroll) > 0.1 ? scrollWindowBy(remainingScroll) : 0)
}

function stopAutoScroll() {
  if (autoScrollFrame !== null) cancelAnimationFrame(autoScrollFrame)
  autoScrollFrame = null
}

function resetTouchReorder() {
  stopAutoScroll()
  if (
    activePointerTarget &&
    activePointerId !== null &&
    activePointerTarget.hasPointerCapture(activePointerId)
  ) {
    activePointerTarget.releasePointerCapture(activePointerId)
  }
  activePointerId = null
  activePointerTarget = null
  activeReorderScope = null
  reorderScrollContainer = null
  accumulatedAutoScroll = 0
  touchSourceIndex = -1
  touchTargetIndex.value = null
  draggedCardHeight = 0
  initialCardCenters = []
  touchOffsetY.value = 0
}

function finishReorder(targetMilestoneId: string) {
  const sourceMilestoneId = draggingMilestoneId.value
  draggingMilestoneId.value = null
  if (!sourceMilestoneId || sourceMilestoneId === targetMilestoneId) return
  emit('moveTo', sourceMilestoneId, targetMilestoneId)
}

function finishTouchReorder(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return

  if (Math.abs(touchOffsetY.value) < 12) {
    resetTouchReorder()
    draggingMilestoneId.value = null
    return
  }
  const targetIndex = touchTargetIndex.value
  const targetMilestoneId =
    targetIndex === null ? null : initialCardCenters[targetIndex]?.milestoneId

  resetTouchReorder()
  if (targetMilestoneId) finishReorder(targetMilestoneId)
  else draggingMilestoneId.value = null
}

function cancelTouchReorder(event: PointerEvent) {
  if (event.pointerId !== activePointerId) return
  resetTouchReorder()
  draggingMilestoneId.value = null
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(isThai.value ? 'th-TH' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function isWebReference(value: string) {
  return /^https?:\/\//i.test(value)
}

function descriptionLines(description: string | null) {
  return (
    description
      ?.split(/\r?\n|(?=\s*\([ก-๙])/)
      .map((line) => line.trim())
      .filter(Boolean) ?? []
  )
}

function planLabel(plan: string) {
  const keys: Record<
    string,
    'common.planA1' | 'common.planA2' | 'common.planB' | 'common.plan21' | 'common.plan22'
  > = {
    A1: 'common.planA1',
    A2: 'common.planA2',
    B: 'common.planB',
    '2.1': 'common.plan21',
    '2.2': 'common.plan22',
  }
  return plan === 'All' ? t('common.allPlan') : keys[plan] ? t(keys[plan]) : plan
}

const tableRows = computed(() => {
  if (!props.groupBySemester) {
    return props.milestones.map((milestone, index) => ({
      type: 'milestone' as const,
      key: milestone.milestoneId,
      milestone,
      displayOrder: index + 1,
    }))
  }

  const groups = new Map<string, Milestone[]>()

  props.milestones.forEach((milestone) => {
    const milestones = groups.get(milestone.semester) ?? []
    milestones.push(milestone)
    groups.set(milestone.semester, milestones)
  })

  return Array.from(groups.entries())
    .sort(([firstSemester], [secondSemester]) => Number(firstSemester) - Number(secondSemester))
    .flatMap(([semester, milestones]) => [
      {
        type: 'semester' as const,
        key: `semester-${semester}`,
        semester,
      },
      ...[...milestones]
        .sort((first, second) => first.sequenceOrder - second.sequenceOrder)
        .map((milestone, index) => ({
          type: 'milestone' as const,
          key: milestone.milestoneId,
          milestone,
          displayOrder: index + 1,
        })),
    ])
})
</script>

<template>
  <div data-reorder-scope class="mt-4 space-y-2 md:hidden">
    <article
      v-for="row in tableRows.filter((item) => item.type === 'milestone')"
      :key="row.key"
      :data-milestone-id="row.milestone.milestoneId"
      :data-reorder-milestone-id="row.milestone.milestoneId"
      class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
      :class="{
        'relative z-30 border-[#9b2525]/60 bg-white shadow-[0_14px_30px_rgba(0,0,0,0.24)]':
          draggingMilestoneId === row.milestone.milestoneId,
        'transition-transform duration-200 ease-out':
          draggingMilestoneId !== row.milestone.milestoneId,
      }"
      :style="reorderItemStyle(row.milestone.milestoneId)"
    >
      <div class="flex items-start gap-2">
        <div class="flex shrink-0 items-center">
          <span
            class="flex size-7 items-center justify-center rounded-full bg-[#9b2525] text-xs font-semibold text-white"
          >
            {{ reorderDisplayOrder(row.milestone.milestoneId, row.displayOrder) }}
          </span>
        </div>

        <div class="min-w-0 flex-1">
          <h3 class="break-words text-xs font-semibold leading-snug">{{ row.milestone.title }}</h3>
          <div
            v-if="row.milestone.description"
            class="mt-2 space-y-0.5 text-[10px] leading-relaxed text-[#607995]"
            :title="row.milestone.description"
          >
            <p
              v-for="(line, index) in descriptionLines(row.milestone.description).slice(0, 2)"
              :key="index"
              class="truncate"
            >
              {{ line }}
            </p>
          </div>
        </div>

        <details class="milestone-actions-menu relative shrink-0">
          <summary
            class="flex size-7 cursor-pointer list-none items-center justify-center rounded-md text-lg leading-none text-[#607995] hover:bg-slate-50"
            aria-label="Milestone actions"
          >
            ⋮
          </summary>
          <div
            class="absolute top-7 right-0 z-20 w-28 rounded-lg border border-slate-200 bg-white p-1.5 text-[11px] shadow-lg"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded px-2 py-2 text-left hover:bg-slate-50"
              @click="handleMenuAction($event, 'edit', row.milestone)"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
              </svg>
              {{ t('common.edit') }}
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-red-600 hover:bg-red-50"
              @click="handleMenuAction($event, 'remove', row.milestone)"
            >
              <svg
                class="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
              {{ t('common.delete') }}
            </button>
          </div>
        </details>
      </div>

      <div class="mt-2 flex items-center gap-1.5 pl-9">
        <span
          class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-[#607995]"
        >
          {{ row.milestone.degreeLevel === 'Doctoral' ? t('common.doctoral') : t('common.master') }}
        </span>
        <span
          class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-[#607995]"
        >
          {{ row.milestone.plans.map(planLabel).join(', ') }}
        </span>
        <span
          class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] text-[#607995]"
        >
          ◫ {{ formatDate(row.milestone.deadline) }}
        </span>
      </div>

      <div class="mt-2 flex flex-wrap items-center gap-3 pl-9 text-[9px] text-[#607995]">
        <button
          type="button"
          class="flex cursor-grab touch-none items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#607995] hover:bg-slate-50 active:cursor-grabbing active:border-[#9b2525]"
          :aria-label="isThai ? 'กดค้างแล้วลากเพื่อเปลี่ยนลำดับ' : 'Press and drag to reorder'"
          @pointerdown="startTouchReorder($event, row.milestone.milestoneId)"
          @pointermove="moveTouchReorder"
          @pointerup="finishTouchReorder"
          @pointercancel="cancelTouchReorder"
        >
          ⇅ {{ isThai ? 'กดค้างแล้วลาก' : 'Press and drag' }}
        </button>
        <div class="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            class="min-w-11 rounded-md border px-2.5 py-1 text-[10px] font-medium"
            :class="
              row.milestone.isEnabled
                ? 'border-green-200 bg-green-100 text-green-700'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            "
            @click="$emit('setEnabled', row.milestone, true)"
          >
            {{ t('common.enable') }}
          </button>
          <button
            type="button"
            class="min-w-11 rounded-md border px-2.5 py-1 text-[10px] font-medium"
            :class="
              !row.milestone.isEnabled
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
            "
            @click="$emit('setEnabled', row.milestone, false)"
          >
            {{ t('common.disable') }}
          </button>
        </div>
      </div>
    </article>

    <p v-if="isLoading" class="py-10 text-center text-xs text-slate-500">
      {{ t('milestone.loading') }}
    </p>
    <p v-else-if="milestones.length === 0" class="py-10 text-center text-xs text-slate-500">
      {{ t('milestone.noConfigured') }}
    </p>
  </div>

  <div data-reorder-scope class="mt-5 hidden overflow-x-auto md:block">
    <table class="w-full min-w-[1120px] table-fixed border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-200 text-xs whitespace-nowrap">
          <th class="w-[10%] py-3 font-semibold">{{ t('common.order') }}</th>
          <th class="w-[22.5%] py-3 font-semibold">{{ t('common.title') }}</th>
          <th class="w-[16%] py-3 font-semibold">{{ t('common.description') }}</th>
          <th class="w-[13%] py-3 pl-4 font-semibold">{{ t('common.reference') }}</th>
          <th class="w-[10%] py-3 text-center font-semibold">{{ t('common.program') }}</th>
          <th class="w-[11%] py-3 text-center font-semibold">{{ t('common.plan') }}</th>
          <th class="w-[9.5%] py-3 text-center font-semibold">{{ t('common.deadline') }}</th>
          <th class="w-[210px] py-3 text-center font-semibold">
            <span class="inline-block translate-x-2">{{ t('common.actions') }}</span>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr v-if="isLoading">
          <td colspan="8" class="py-12 text-center text-sm text-slate-500">
            {{ t('milestone.loading') }}
          </td>
        </tr>

        <tr v-else-if="milestones.length === 0">
          <td colspan="8" class="py-12 text-center text-sm text-slate-500">
            {{ t('milestone.noConfigured') }}
          </td>
        </tr>

        <template v-else>
          <template v-for="row in tableRows" :key="row.key">
            <tr v-if="row.type === 'semester'" class="border-b border-slate-200">
              <td colspan="8" class="pt-4 pb-2">
                <div class="rounded-lg bg-[#f8eeee] px-4 py-2 text-sm font-semibold text-[#8a2b25]">
                  Semester {{ row.semester }}
                </div>
              </td>
            </tr>

            <tr
              v-else
              :data-reorder-milestone-id="row.milestone.milestoneId"
              class="border-b border-slate-200 text-xs transition-colors"
              :class="{
                'bg-red-50/70 shadow-[0_8px_20px_rgba(0,0,0,0.12)]':
                  draggingMilestoneId === row.milestone.milestoneId,
                'transition-transform duration-200 ease-out':
                  draggingMilestoneId !== row.milestone.milestoneId,
              }"
              :style="reorderItemStyle(row.milestone.milestoneId)"
            >
              <td class="py-4 align-top">
                <button
                  type="button"
                  class="inline-flex cursor-grab touch-none items-center gap-2 rounded-md px-1.5 py-1 text-slate-500 hover:bg-slate-100 hover:text-[#7D2923] active:cursor-grabbing"
                  aria-label="Drag to reorder milestone"
                  @pointerdown="startTouchReorder($event, row.milestone.milestoneId)"
                  @pointermove="moveTouchReorder"
                  @pointerup="finishTouchReorder"
                  @pointercancel="cancelTouchReorder"
                >
                  <span class="text-sm tracking-tighter text-slate-400" aria-hidden="true">⠿</span>
                  <span class="min-w-5 text-center font-semibold">{{
                    reorderDisplayOrder(row.milestone.milestoneId, row.displayOrder)
                  }}</span>
                </button>
              </td>

              <td class="py-4 align-top font-semibold leading-snug">
                <div class="w-60 max-w-full break-words">
                  {{ row.milestone.title }}
                </div>
              </td>
              <td class="py-4 align-top leading-snug text-slate-500">
                <div
                  v-if="row.milestone.description"
                  class="min-w-0 space-y-0.5"
                  :title="row.milestone.description"
                >
                  <div
                    v-for="(line, index) in descriptionLines(row.milestone.description)"
                    :key="index"
                    class="truncate"
                  >
                    {{ line }}
                  </div>
                </div>
                <span v-else>-</span>
              </td>
              <td class="py-4 pl-4 align-top leading-snug">
                <div v-if="row.milestone.references.length" class="space-y-1">
                  <component
                    v-for="reference in row.milestone.references"
                    :key="reference"
                    :is="isWebReference(reference) ? 'a' : 'span'"
                    :href="isWebReference(reference) ? reference : undefined"
                    :target="isWebReference(reference) ? '_blank' : undefined"
                    :rel="isWebReference(reference) ? 'noopener noreferrer' : undefined"
                    class="block max-w-40 text-xs"
                    :class="
                      isWebReference(reference)
                        ? 'truncate text-[#7D2923] underline'
                        : 'leading-snug text-slate-600'
                    "
                    :title="reference"
                  >
                    {{ reference }}
                  </component>
                </div>
                <span v-else class="text-slate-500">-</span>
              </td>

              <td class="py-4 text-center align-middle">
                <span
                  class="inline-flex min-w-14 items-center justify-center rounded-md border border-slate-200 px-3 py-1 leading-none"
                >
                  {{
                    row.milestone.degreeLevel === 'Doctoral'
                      ? t('common.doctoral')
                      : t('common.master')
                  }}
                </span>
              </td>

              <td class="py-4 text-center align-middle">
                <span
                  class="inline-flex min-w-14 items-center justify-center rounded-md border border-slate-200 px-3 py-1 leading-none"
                >
                  {{ row.milestone.plans.map(planLabel).join(', ') }}
                </span>
              </td>

              <td class="py-4 text-center align-middle text-slate-500">
                {{ formatDate(row.milestone.deadline) }}
              </td>

              <td class="py-4 align-middle">
                <div class="-mt-1 flex flex-nowrap justify-end gap-2 whitespace-nowrap">
                  <button
                    type="button"
                    class="rounded-md border px-3 py-1 text-[11px]"
                    :class="
                      row.milestone.isEnabled
                        ? 'border-green-200 bg-green-100 text-green-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    "
                    @click="$emit('setEnabled', row.milestone, true)"
                  >
                    {{ t('common.enable') }}
                  </button>

                  <button
                    type="button"
                    class="rounded-md border px-3 py-1 text-[11px]"
                    :class="
                      !row.milestone.isEnabled
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    "
                    @click="$emit('setEnabled', row.milestone, false)"
                  >
                    {{ t('common.disable') }}
                  </button>

                  <button
                    type="button"
                    class="rounded-md border border-slate-200 p-1.5 hover:bg-slate-50"
                    aria-label="Edit milestone"
                    @click="$emit('edit', row.milestone)"
                  >
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="rounded-md border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
                    aria-label="Delete milestone"
                    @click="$emit('remove', row.milestone)"
                  >
                    <svg
                      class="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.7"
                      aria-hidden="true"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v5M14 11v5" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>
  </div>
</template>
