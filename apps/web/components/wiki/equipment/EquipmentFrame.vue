<template>
  <div class="equipment-frame" :class="`equipment-frame--${family}`">
    <span class="equipment-frame__rail equipment-frame__rail--top" aria-hidden="true" />
    <span class="equipment-frame__rail equipment-frame__rail--bottom" aria-hidden="true" />
    <span class="equipment-frame__rail equipment-frame__rail--left" aria-hidden="true" />
    <span class="equipment-frame__rail equipment-frame__rail--right" aria-hidden="true" />
    <span class="equipment-frame__crest equipment-frame__crest--top" aria-hidden="true" />
    <div class="equipment-frame__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { EquipmentFrameFamily } from './types'

withDefaults(defineProps<{
  family?: EquipmentFrameFamily
}>(), {
  family: 'normal'
})
</script>

<style scoped>
.equipment-frame {
  --frame-primary: #969da6;
  --frame-secondary: #3d434a;
  --frame-glow: rgba(150, 157, 166, 0.18);
  position: relative;
  min-width: 0;
  padding: 8px;
  isolation: isolate;
}

.equipment-frame--excellent {
  --frame-primary: #63e72e;
  --frame-secondary: #176c25;
  --frame-glow: rgba(85, 255, 0, 0.22);
}

.equipment-frame--ancient-blue {
  --frame-primary: #59d7ff;
  --frame-secondary: #245fa8;
  --frame-glow: rgba(52, 140, 255, 0.22);
}

.equipment-frame--ancient {
  --frame-primary: #38d4c4;
  --frame-secondary: #806c3d;
  --frame-glow: rgba(0, 184, 169, 0.2);
}

.equipment-frame--socket {
  --frame-primary: #c06aff;
  --frame-secondary: #57148c;
  --frame-glow: rgba(163, 60, 255, 0.24);
}

.equipment-frame--mastery-ancient {
  --frame-primary: #43d2aa;
  --frame-secondary: #b98935;
  --frame-glow: rgba(185, 137, 53, 0.24);
}

.equipment-frame--enhanced-ancient {
  --frame-primary: #70eaff;
  --frame-secondary: #d7ad51;
  --frame-glow: rgba(107, 232, 255, 0.25);
}

.equipment-frame--lucky {
  --frame-primary: #f0c96a;
  --frame-secondary: #8a6424;
  --frame-glow: rgba(240, 201, 106, 0.22);
}

.equipment-frame__content {
  position: relative;
  z-index: 1;
  height: 100%;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--frame-primary) 36%, transparent);
  border-radius: 5px;
  background:
    radial-gradient(circle at 50% 14%, var(--frame-glow), transparent 44%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.055), transparent 34%),
    rgba(8, 9, 13, 0.94);
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.equipment-frame__rail,
.equipment-frame__crest {
  position: absolute;
  z-index: 2;
  display: block;
  pointer-events: none;
}

.equipment-frame__rail--top,
.equipment-frame__rail--bottom {
  right: 18px;
  left: 18px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--frame-secondary) 18%, var(--frame-primary) 50%, var(--frame-secondary) 82%, transparent);
  box-shadow: 0 0 8px var(--frame-glow);
}

.equipment-frame__rail--top { top: 5px; }
.equipment-frame__rail--bottom { bottom: 5px; }

.equipment-frame__rail--left,
.equipment-frame__rail--right {
  top: 18px;
  bottom: 18px;
  width: 2px;
  background: linear-gradient(180deg, transparent, var(--frame-secondary) 18%, var(--frame-primary) 50%, var(--frame-secondary) 82%, transparent);
  box-shadow: 0 0 8px var(--frame-glow);
}

.equipment-frame__rail--left { left: 5px; }
.equipment-frame__rail--right { right: 5px; }

.equipment-frame__crest {
  left: 50%;
  width: 17px;
  height: 17px;
  border: 1px solid var(--frame-primary);
  background: linear-gradient(135deg, var(--frame-secondary), var(--frame-primary));
  box-shadow: 0 0 10px var(--frame-glow);
  transform: translateX(-50%) rotate(45deg);
}

.equipment-frame__crest::after {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.equipment-frame__crest--top { top: 0; }

@media (prefers-reduced-motion: no-preference) {
  .equipment-frame__content {
    transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
  }

  .equipment-frame:hover .equipment-frame__content {
    border-color: color-mix(in srgb, var(--frame-primary) 66%, transparent);
    box-shadow: 0 18px 38px rgba(0, 0, 0, 0.38), 0 0 18px var(--frame-glow);
    transform: translateY(-2px);
  }
}
</style>
