<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'edit' | 'secondary'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'primary',
    type: 'button',
    disabled: false,
  },
)
</script>

<template>
  <button
    :type="type"
    class="app-btn"
    :class="`app-btn--${variant}`"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.app-btn {
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--space-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
  font-family: inherit;
}

.app-btn--primary {
  background: var(--color-primary);
  color: white;
}

.app-btn--edit {
  background: transparent;
  color: var(--color-edit);
}

.app-btn--secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--line);
}

.app-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.app-btn--edit:hover:not(:disabled) {
  opacity: 0.8;
}

.app-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
