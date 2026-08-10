<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTierlistListingStore } from '@/stores/tierlistListing'
import AppButton from '@/components/AppButton.vue'
import TierListCard from '@/components/TierListCard.vue'
import FabButton from '@/components/FabButton.vue'
import ShimmerBlock from '@/components/ShimmerBlock.vue'

const store = useTierlistListingStore()
const router = useRouter()
const deleting = ref(false)

onMounted(() => {
  store.fetchSummaries()
})

function navigateToTierlist(id: number) {
  router.push({ name: 'tierlist', params: { id: id.toString() } })
}

function navigateToAddFriend() {
  router.push({ name: 'add-friend' })
}

function navigateToFriendsList() {
  router.push({ name: 'friends-list' })
}

function navigateToCreateTierlist() {
  router.push({ name: 'create-tierlist' })
}

function navigateToEditTierlist(id: number) {
  router.push({ name: 'edit-tierlist', params: { id: id.toString() } })
}

async function handleDeleteTierlist(id: number) {
  const summary = store.summaries.find((item) => item.id === id)
  const label = summary?.name ?? 'esta tier list'
  const confirmed = confirm(`Tem certeza que deseja deletar "${label}"?`)
  if (!confirmed || deleting.value) return

  deleting.value = true
  try {
    await store.removeSummary(id)
  } catch {
    // erro já preenchido no store
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="listing-page">
    <header class="listing-header">
      <h1 class="listing-title">Ranqueando os desgraçados dos meus amigos</h1>
      <div class="listing-actions">
        <AppButton @click="navigateToAddFriend">Adicionar amigo</AppButton>
        <AppButton variant="edit" @click="navigateToFriendsList">Editar amigos</AppButton>
      </div>
    </header>

    <p v-if="store.error" class="listing-status listing-status--error">{{ store.error }}</p>
    <p v-else-if="store.usingLocalMock && !store.loading" class="listing-status">
      Usando dados mock locais (Supabase não configurado ou sem dados)
    </p>

    <div v-if="store.loading" class="listing-grid" aria-busy="true" aria-label="Carregando tier lists">
      <div v-for="n in 6" :key="n" class="listing-skeleton-card">
        <div class="listing-skeleton-card__top">
          <div class="listing-skeleton-card__content">
            <ShimmerBlock height="1.25rem" width="70%" />
            <ShimmerBlock height="0.9rem" width="45%" />
          </div>
          <ShimmerBlock width="56px" height="56px" radius="50%" />
        </div>
        <ShimmerBlock height="1px" radius="0" />
        <ShimmerBlock height="0.9rem" width="55%" />
        <ShimmerBlock height="0.9rem" width="65%" />
      </div>
    </div>

    <div v-else-if="store.summaries.length === 0" class="listing-empty">
      <p>Nenhuma tier list encontrada.</p>
    </div>

    <div v-else class="listing-grid">
      <TierListCard
        v-for="summary in store.summaries"
        :key="summary.id"
        :summary="summary"
        @click="navigateToTierlist(summary.id)"
        @edit="navigateToEditTierlist"
        @delete="handleDeleteTierlist"
      />
    </div>

    <footer class="listing-footer">
      <p>By: Sergio e Kayc</p>
    </footer>

    <FabButton @click="navigateToCreateTierlist" />
  </div>
</template>

<style scoped>
.listing-page {
  width: 100%;
  min-height: 100vh;
  position: relative;
  padding: var(--space-6);
  padding-bottom: calc(var(--space-6) * 3);
  box-sizing: border-box;
}

.listing-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

.listing-title {
  font-family: var(--font-title);
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  flex: 1;
  min-width: 280px;
}

.listing-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}

.listing-status {
  padding: var(--space-3) var(--space-4);
  background: rgba(255, 255, 255, 0.1);
  border-radius: var(--space-2);
  margin-bottom: var(--space-4);
  color: var(--color-text);
}

.listing-status--error {
  background: rgba(204, 51, 51, 0.2);
  color: var(--color-pending);
}

.listing-empty {
  text-align: center;
  padding: var(--space-6);
  color: var(--color-text);
  opacity: 0.7;
}

.listing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.listing-skeleton-card {
  background: var(--color-card-bg);
  border-radius: var(--space-3);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.listing-skeleton-card__top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: flex-start;
}

.listing-skeleton-card__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.listing-footer {
  position: fixed;
  bottom: var(--space-6);
  left: var(--space-6);
  font-family: var(--font-title);
  font-size: 14px;
  color: var(--color-text);
  opacity: 0.7;
}

.listing-footer p {
  margin: 0;
}

@media (max-width: 768px) {
  .listing-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .listing-title {
    min-width: 100%;
  }

  .listing-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .listing-footer {
    position: static;
    margin-top: var(--space-6);
    text-align: center;
  }
}
</style>
