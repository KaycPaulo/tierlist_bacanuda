<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
    className?: string
  }>(),
  {
    width: '100%',
    height: '1rem',
    radius: '8px',
    className: '',
  },
)
</script>

<template>
  <div
    class="shimmer-block"
    :class="className"
    :style="{ width, height, borderRadius: radius }"
    aria-hidden="true"
  />
</template>

<style scoped>
.shimmer-block {
  display: block;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.12) 45%,
    rgba(255, 255, 255, 0.04) 100%
  );
  background-size: 200% 100%;
  animation: shimmer-slide 1.35s ease-in-out infinite;
}

@keyframes shimmer-slide {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
