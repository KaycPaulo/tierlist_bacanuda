<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listPeoples, deletePerson } from '@/lib/cadastro'
import type { Person } from '@/types/tierlist'
import ShimmerBlock from '@/components/ShimmerBlock.vue'

const router = useRouter()

const peoples = ref<Person[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const deletingId = ref<string | null>(null)

async function loadPeoples() {
  loading.value = true
  error.value = null
  try {
    peoples.value = await listPeoples()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar amigos'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPeoples()
})

function navigateToAdd() {
  router.push({ name: 'add-friend' })
}

function navigateToEdit(personId: string) {
  router.push({ name: 'edit-friend', params: { id: personId } })
}

async function handleDelete(person: Person) {
  const confirmed = confirm(`Tem certeza que deseja deletar ${person.username}?`)
  if (!confirmed) return

  deletingId.value = person.id
  error.value = null

  try {
    await deletePerson(person.id)
    peoples.value = peoples.value.filter((p) => p.id !== person.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao deletar amigo'
  } finally {
    deletingId.value = null
  }
}

function goBack() {
  router.push({ name: 'listing' })
}
</script>

<template>
  <div class="friends-listing">
    <header class="friends-listing__header">
      <button type="button" class="friends-listing__back" @click="goBack">← Voltar</button>
      <div class="friends-listing__header-content">
        <h1 class="friends-listing__title">Gerenciar Amigos</h1>
        <button type="button" class="friends-listing__add" @click="navigateToAdd">
          + Adicionar Amigo
        </button>
      </div>
    </header>

    <p v-if="error" class="friends-listing__error">{{ error }}</p>

    <div v-if="loading" class="friends-listing__grid" aria-busy="true" aria-label="Carregando amigos">
      <div v-for="n in 6" :key="n" class="friend-skeleton-card">
        <ShimmerBlock width="72px" height="72px" radius="50%" />
        <div class="friend-skeleton-card__info">
          <ShimmerBlock height="1.1rem" width="60%" />
          <ShimmerBlock height="0.85rem" width="40%" />
        </div>
        <div class="friend-skeleton-card__actions">
          <ShimmerBlock height="2.25rem" width="80px" radius="8px" />
          <ShimmerBlock height="2.25rem" width="80px" radius="8px" />
        </div>
      </div>
    </div>

    <div v-else-if="peoples.length === 0" class="friends-listing__empty">
      <p>Nenhum amigo cadastrado ainda.</p>
      <button type="button" class="friends-listing__empty-btn" @click="navigateToAdd">
        Adicionar Primeiro Amigo
      </button>
    </div>

    <div v-else class="friends-listing__grid">
      <div v-for="person in peoples" :key="person.id" class="friend-card">
        <div class="friend-card__avatar-wrapper">
          <div class="friend-card__avatar">
            <img v-if="person.avatar_url" :src="person.avatar_url" :alt="person.username" />
            <span v-else class="friend-card__avatar-letter">
              {{ person.username.charAt(0).toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="friend-card__info">
          <h3 class="friend-card__name">{{ person.username }}</h3>
          <p v-if="person.hostname" class="friend-card__hostname">
            Host: {{ person.hostname }}
          </p>
          <p v-else class="friend-card__hostname friend-card__hostname--empty">Sem nome de host</p>
        </div>

        <div class="friend-card__actions">
          <button
            type="button"
            class="friend-card__btn friend-card__btn--edit"
            @click="navigateToEdit(person.id)"
          >
            Editar
          </button>
          <button
            type="button"
            class="friend-card__btn friend-card__btn--delete"
            :disabled="deletingId === person.id"
            @click="handleDelete(person)"
          >
            {{ deletingId === person.id ? 'Deletando...' : 'Deletar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.friends-listing {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

.friends-listing__header {
  margin-bottom: 2rem;
}

.friends-listing__back {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  transition: opacity 0.2s;
  display: block;
}

.friends-listing__back:hover {
  opacity: 0.7;
}

.friends-listing__header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.friends-listing__title {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 400;
  margin: 0;
  color: var(--color-text);
  flex: 1;
}

.friends-listing__add {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.friends-listing__add:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.friends-listing__error {
  padding: 1rem;
  background: rgba(204, 51, 51, 0.15);
  border: 1px solid var(--color-pending);
  border-radius: 8px;
  color: var(--color-pending);
  margin-bottom: 1rem;
}

.friend-skeleton-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: var(--color-card-bg);
  border-radius: 12px;
  padding: 1.25rem;
  flex-wrap: wrap;
}

.friend-skeleton-card__info {
  flex: 1;
  min-width: 140px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.friend-skeleton-card__actions {
  display: flex;
  gap: 0.5rem;
}

.friends-listing__empty {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--muted);
}

.friends-listing__empty p {
  font-size: 1.125rem;
  margin-bottom: 1.5rem;
}

.friends-listing__empty-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 0.875rem 1.75rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.friends-listing__empty-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.friends-listing__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.friend-card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  transition: all 0.2s;
}

.friend-card:hover {
  border-color: var(--ring);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.friend-card__avatar-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.friend-card__avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary) 0%, #764ba2 100%);
  transition: border-color 0.2s;
}

.friend-card:hover .friend-card__avatar {
  border-color: var(--ring);
}

.friend-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-card__avatar-letter {
  font-size: 3rem;
  font-weight: bold;
  color: white;
}

.friend-card__info {
  text-align: center;
  width: 100%;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--line);
  margin-bottom: 0.5rem;
}

.friend-card__name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.5rem;
  word-break: break-word;
}

.friend-card__hostname {
  font-size: 0.875rem;
  color: var(--ink-soft);
  margin: 0;
}

.friend-card__hostname--empty {
  color: var(--muted);
  font-style: italic;
}

.friend-card__actions {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.friend-card__btn {
  flex: 1;
  padding: 0.625rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.friend-card__btn--edit {
  background: var(--color-edit);
  color: white;
}

.friend-card__btn--edit:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.friend-card__btn--delete {
  background: transparent;
  color: var(--color-pending);
  border: 1px solid var(--color-pending);
}

.friend-card__btn--delete:hover:not(:disabled) {
  background: rgba(204, 51, 51, 0.1);
}

.friend-card__btn--delete:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .friends-listing {
    padding: 1rem;
  }

  .friends-listing__title {
    font-size: 1.5rem;
  }

  .friends-listing__grid {
    grid-template-columns: 1fr;
  }

  .friend-card__avatar {
    width: 100px;
    height: 100px;
  }

  .friend-card__avatar-letter {
    font-size: 2.5rem;
  }
}
</style>
