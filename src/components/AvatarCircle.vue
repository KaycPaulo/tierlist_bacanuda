<script setup lang="ts">
interface Props {
  imageUrl?: string
  characterName: string
  username: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
  draggable?: boolean
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  draggable: false,
  showTooltip: true,
})

const sizeMap = {
  xs: '36px',
  sm: '72px',
  md: '100px',
  lg: '200px',
  xl: '120px',
  xxl: '280px',
}
</script>

<template>
  <div
    class="avatar-circle"
    :class="[`avatar-circle--${size}`, { 'avatar-circle--draggable': draggable }]"
    :style="{ width: sizeMap[size], height: sizeMap[size] }"
    :title="showTooltip ? username : undefined"
  >
    <img v-if="imageUrl" :src="imageUrl" :alt="characterName" />
    <span v-else class="avatar-circle__fallback">{{ characterName.slice(0, 1) }}</span>
  </div>
</template>

<style scoped>
.avatar-circle {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #2a4a5e;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: transform 0.15s ease;
}

.avatar-circle--draggable {
  cursor: grab;
}

.avatar-circle--draggable:active {
  cursor: grabbing;
}

.avatar-circle--drag-preview {
  opacity: 0.95 !important;
  transform: scale(1.08) rotate(-4deg) !important;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4) !important;
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.avatar-circle__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #f3f4f6;
  font-size: 1.2em;
  background: #232833;
}
</style>
