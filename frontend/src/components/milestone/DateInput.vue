<script setup lang="ts">
defineProps<{
  label: string
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <label class="block text-xs font-semibold text-slate-900">
    {{ label }}
    <div class="relative mt-1">
      <input
        :value="modelValue"
        type="date"
        class="h-10 w-full rounded-md border border-[#c9827c] bg-white px-3 text-xs outline-none focus:border-[#7D2923] focus:ring-1 focus:ring-[#7D2923]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </label>
</template>
