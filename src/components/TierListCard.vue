<script setup lang="ts">
import { computed } from 'vue'
import type { TierlistSummary } from '@/types/tierlist'

const props = defineProps<{
  summary: TierlistSummary
}>()

const avatarUrl = computed(() => {
  return (
    props.summary.host.avatar_url ||
    `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(props.summary.host.username)}`
  )
})

const statusInfo = computed(() => {
  switch (props.summary.status) {
    case 'completed':
      return {
        icon: 'check',
        text: 'Concluída',
        color: 'var(--color-completed)',
      }
    case 'in_progress':
      return {
        icon: 'clipboard',
        text: 'Em andamento',
        color: 'var(--color-in-progress)',
      }
    case 'pending':
      return {
        icon: 'alert',
        text: `${props.summary.pendingCount} amigos pendentes de ranqueamento`,
        color: 'var(--color-pending)',
      }
    default:
      return {
        icon: 'alert',
        text: 'Status desconhecido',
        color: 'var(--color-text)',
      }
  }
})

const friendsText = computed(() => {
  if (props.summary.status === 'pending') {
    return `${props.summary.totalFriends} amigos para ranquear`
  }
  return `${props.summary.rankedCount} amigos ranqueados`
})
</script>

<template>
  <div class="tier-card">
    <div class="tier-card__top">
      <div class="tier-card__content">
        <h3 class="tier-card__title">{{ summary.name }}</h3>
        <p class="tier-card__host">Host: <span>{{ summary.host.username }}</span></p>
      </div>
      <img :src="avatarUrl" :alt="summary.host.username" class="tier-card__avatar" />
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
        <svg v-else-if="statusInfo.icon === 'clipboard'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="M6 1H10V3H6V1Z" fill="currentColor"/>
          <line x1="5.5" y1="6" x2="10.5" y2="6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="5.5" y1="9" x2="10.5" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <svg v-else-if="statusInfo.icon === 'alert'" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" fill="currentColor"/>
          <line x1="8" y1="5" x2="8" y2="9" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <circle cx="8" cy="11.5" r="0.75" fill="white"/>
        </svg>
        <span>{{ statusInfo.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped src="./TierListCard.css"></style>
