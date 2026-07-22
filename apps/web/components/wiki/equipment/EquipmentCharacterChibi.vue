<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  image: string
  size?: 'sm' | 'md'
}>(), {
  size: 'sm'
})
</script>

<template>
  <UTooltip :text="name" :delay-duration="120">
    <span
      class="equipment-character-chibi grid place-items-center overflow-hidden rounded-sm border border-white/12 bg-white/[0.05]"
      :class="size === 'md' ? 'size-12' : 'size-10'"
      :aria-label="name"
      role="img"
      tabindex="0"
    >
      <img
        :src="image"
        :alt="name"
        class="size-full object-contain p-0.5"
        loading="lazy"
        decoding="async"
      >
    </span>
  </UTooltip>
</template>

<style scoped>
.equipment-character-chibi {
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05);
}
</style>
