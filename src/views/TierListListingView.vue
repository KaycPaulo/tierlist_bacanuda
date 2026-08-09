<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTierlistListingStore } from '@/stores/tierlistListing'
import TierListCard from '@/components/TierListCard.vue'
import FabButton from '@/components/FabButton.vue'

const store = useTierlistListingStore()
const router = useRouter()

onMounted(() => {
  store.fetchSummaries()
})

function navigateToTierlist(id: number) {
  router.push({ name: 'tierlist', params: { id: id.toString() } })
}
</script>

<template>
  <div class="listing-page">
    <header class="listing-header">
      <h1 class="listing-title">Ranqueando os desgraçados dos meus amigos</h1>
      <div class="listing-actions">
        <button type="button" class="btn-primary" disabled>Adicionar amigo</button>
        <button type="button" class="btn-edit" disabled>Editar amigos</button>
      </div>
    </header>

    <p v-if="store.error" class="listing-status listing-status--error">{{ store.error }}</p>
    <p v-else-if="store.loading" class="listing-status">Carregando tier lists...</p>
    <p v-else-if="store.usingLocalMock" class="listing-status">
      Usando dados mock locais (Supabase não configurado ou sem dados)
    </p>

    <div v-if="store.summaries.length === 0 && !store.loading" class="listing-empty">
      <p>Nenhuma tier list encontrada.</p>
    </div>

    <div v-else class="listing-grid">
      <TierListCard
        v-for="summary in store.summaries"
        :key="summary.id"
        :summary="summary"
        @click="navigateToTierlist(summary.id)"
      />
    </div>

    <footer class="listing-footer">
      <p>By: Sergio e Kayc</p>
    </footer>

    <FabButton disabled />
  </div>
</template>

<style scoped>
.listing-page {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  padding-bottom: calc(var(--space-6) * 3);
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
  font-family: 'Playwrite US Modern', cursive;
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

.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--space-2);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-edit {
  background: transparent;
  color: var(--color-edit);
  border: none;
  padding: var(--space-2) var(--space-4);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-edit:hover:not(:disabled) {
  opacity: 0.8;
}

.btn-edit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.listing-footer {
  position: fixed;
  bottom: var(--space-6);
  left: var(--space-6);
  font-family: 'Playwrite US Modern', cursive;
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
