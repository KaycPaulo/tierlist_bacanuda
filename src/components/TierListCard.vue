<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { TierlistSummary } from '@/types/tierlist'

const props = defineProps<{
  summary: TierlistSummary
}>()

const emit = defineEmits<{
  edit: [id: number]
  delete: [id: number]
}>()

const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const avatarUrl = computed(() => {
  return (
    props.summary.host.avatar_url ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(props.summary.host.username)}`
  )
})

const statusInfo = computed(() => {
  if (props.summary.status === 'completed') {
    return {
      icon: 'check' as const,
      text: 'Concluído',
      color: 'var(--color-completed)',
    }
  }

  return {
    icon: 'clipboard' as const,
    text: 'Em andamento',
    color: 'var(--color-in-progress)',
  }
})

const friendsText = computed(() => {
  return `${props.summary.rankedCount}/${props.summary.totalFriends} amigos ranqueados`
})

function openContextMenu(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  menuX.value = event.clientX
  menuY.value = event.clientY
  menuOpen.value = true
}

function closeContextMenu() {
  menuOpen.value = false
}

function onEdit() {
  closeContextMenu()
  emit('edit', props.summary.id)
}

function onDelete() {
  closeContextMenu()
  emit('delete', props.summary.id)
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!menuOpen.value) return
  const target = event.target
  if (target instanceof Element && target.closest('.tier-card__menu')) return
  closeContextMenu()
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeContextMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <div class="tier-card" @contextmenu="openContextMenu">
    <div class="tier-card__top">
      <div class="tier-card__content">
        <h3 class="tier-card__title">{{ summary.name }}</h3>
        <p class="tier-card__host">Host: <span>{{ summary.host.username }}</span></p>
      </div>
      <div class="tier-card__aside">
        <img :src="avatarUrl" :alt="summary.host.username" class="tier-card__avatar" />
      </div>
    </div>

    <div class="tier-card__divider"></div>

    <div class="tier-card__meta">
      <div class="tier-card__friends">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.5 5.5C5.5 6.88071 4.38071 8 3 8C1.61929 8 0.5 6.88071 0.5 5.5C0.5 4.11929 1.61929 3 3 3C4.38071 3 5.5 4.11929 5.5 5.5Z"/>
          <path d="M15.5 5.5C15.5 6.88071 14.3807 8 13 8C11.6193 8 10.5 6.88071 10.5 5.5C10.5 4.11929 11.6193 3 13 3C14.3807 3 15.5 4.11929 15.5 5.5Z"/>
          <path d="M6 11C6 9.34315 4.65685 8 3 8C1.34315 8 0 9.34315 0 11V13H6V11Z"/>
          <path d="M16 11C16 9.34315 14.6569 8 13 8C11.3431 8 10 9.34315 10 11V13H16V11Z"/>
        </svg>
        <span>{{ friendsText }}</span>
      </div>

      <div class="tier-card__status" :style="{ color: statusInfo.color }">
        <svg v-if="statusInfo.icon === 'check'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M5 8L7 10L11 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M6 1H10V3H6V1Z" fill="currentColor"/>
          <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5.5" y1="9" x2="10.5" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>{{ statusInfo.text }}</span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="menuOpen"
        class="tier-card__menu"
        :style="{ top: `${menuY}px`, left: `${menuX}px` }"
        @click.stop
      >
        <button type="button" class="tier-card__menu-item" @click="onEdit">Editar</button>
        <button type="button" class="tier-card__menu-item tier-card__menu-item--danger" @click="onDelete">
          Deletar
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped src="./TierListCard.css"></style>

<style>
.tier-card__menu {
  position: fixed;
  z-index: 1200;
  min-width: 148px;
  padding: 6px;
  border-radius: 10px;
  background: #282828;
  border: 1px solid var(--line);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tier-card__menu-item {
  border: none;
  background: transparent;
  color: var(--color-text);
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.tier-card__menu-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.tier-card__menu-item--danger {
  color: var(--color-pending);
}

.tier-card__menu-item--danger:hover {
  background: rgba(204, 51, 51, 0.15);
}
</style>

