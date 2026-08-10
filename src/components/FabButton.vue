<script setup lang="ts">
defineProps<{
  disabled?: boolean
}>()
</script>

<template>
  <button type="button" class="fab" :disabled="disabled">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    </svg>
  </button>
</template>

<style scoped>
.fab {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--color-primary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  color: white;
}

.fab:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.fab:active:not(:disabled) {
  transform: scale(0.95);
}

.fab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
