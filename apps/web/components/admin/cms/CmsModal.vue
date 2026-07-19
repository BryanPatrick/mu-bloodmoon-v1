<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[100] grid place-items-center bg-black/72 p-4 backdrop-blur-sm" @mousedown.self="$emit('close')">
      <section class="bm-panel max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-md border border-white/15 p-5 shadow-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p class="bm-kicker">Gerenciamento</p>
            <h2 class="mt-1 font-display text-2xl font-black uppercase text-white">{{ title }}</h2>
          </div>
          <button class="grid size-9 place-items-center rounded-md border border-white/12 bg-white/8 text-white" type="button" aria-label="Fechar" @click="$emit('close')">
            <X :size="17" />
          </button>
        </header>
        <div class="mt-5"><slot /></div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{ open: boolean; title: string }>()
defineEmits<{ close: [] }>()
</script>
