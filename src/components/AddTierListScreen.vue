<script lang="ts">
export default {
  name: 'AddTierListScreen',
}
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listPeoples } from '@/lib/cadastro'
import { createTierlist, getTierlistForEdit, updateTierlist } from '@/lib/tierlistCrud'
import type { Person } from '@/types/tierlist'
import AvatarCircle from './AvatarCircle.vue'
import ShimmerBlock from './ShimmerBlock.vue'

const router = useRouter()
const route = useRoute()

const tierlistId = ref<number | null>(null)
const name = ref('')
const hostId = ref('')
const selectedFriendIds = ref<string[]>([])
const peoples = ref<Person[]>([])
const hostModalOpen = ref(false)

const loading = ref(false)
const loadingData = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const isEditMode = computed(() => tierlistId.value !== null)
const pageTitle = computed(() => (isEditMode.value ? 'Editar Tier List' : 'Criar Tier List'))
const pageSubtitle = computed(() =>
  isEditMode.value
    ? 'Altere o nome, o host e os amigos tierlistados'
    : 'Defina o nome, o host e quem será ranqueado',
)
const submitButtonText = computed(() =>
  isEditMode.value ? 'Salvar Alterações' : 'Criar Tier List',
)

const selectedHost = computed(
  () => peoples.value.find((person) => person.id === hostId.value) ?? null,
)

const friendOptions = computed(() =>
  peoples.value.filter((person) => person.id !== hostId.value),
)

const isValid = computed(() => {
  return (
    name.value.trim() !== '' &&
    hostId.value !== '' &&
    selectedFriendIds.value.length > 0
  )
})

watch(hostId, (nextHostId, previousHostId) => {
  if (!nextHostId || nextHostId === previousHostId) return
  selectedFriendIds.value = selectedFriendIds.value.filter((id) => id !== nextHostId)
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && hostModalOpen.value) {
    closeHostModal()
  }
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  loadingData.value = true
  error.value = null

  try {
    peoples.value = await listPeoples()

    const idParam = route.params.id as string | undefined
    if (idParam) {
      const parsedId = Number(idParam)
      if (!parsedId || Number.isNaN(parsedId)) {
        throw new Error('ID da tier list inválido')
      }

      tierlistId.value = parsedId
      const data = await getTierlistForEdit(parsedId)
      name.value = data.tierlist.name
      hostId.value = data.tierlist.created_by ?? data.host?.id ?? ''
      selectedFriendIds.value = data.rankingFriendIds.filter((id) => id !== hostId.value)
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar dados da tier list'
  } finally {
    loadingData.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})

function hostLabel(person: Person) {
  return person.hostname?.trim() || person.username
}

function avatarUrl(person: Person) {
  return person.avatar_url || undefined
}

function isFriendSelected(personId: string) {
  return selectedFriendIds.value.includes(personId)
}

function toggleFriend(personId: string) {
  if (personId === hostId.value) return

  if (isFriendSelected(personId)) {
    selectedFriendIds.value = selectedFriendIds.value.filter((id) => id !== personId)
    return
  }

  selectedFriendIds.value = [...selectedFriendIds.value, personId]
}

function openHostModal() {
  hostModalOpen.value = true
}

function closeHostModal() {
  hostModalOpen.value = false
}

function selectHost(personId: string) {
  hostId.value = personId
  closeHostModal()
}

async function handleSubmit() {
  if (!isValid.value) return

  loading.value = true
  error.value = null
  success.value = false

  try {
    const friendIds = selectedFriendIds.value.filter((id) => id !== hostId.value)

    if (isEditMode.value && tierlistId.value != null) {
      await updateTierlist({
        tierlistId: tierlistId.value,
        name: name.value,
        hostId: hostId.value,
        friendIds,
      })
    } else {
      await createTierlist({
        name: name.value,
        hostId: hostId.value,
        friendIds,
      })
    }

    success.value = true
    setTimeout(() => {
      router.push({ name: 'listing' })
    }, 1200)
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : `Erro ao ${isEditMode.value ? 'atualizar' : 'criar'} tier list`
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: 'listing' })
}
</script>

<template>
  <section class="add-tierlist">
    <header class="add-tierlist__header">
      <button type="button" class="add-tierlist__back" @click="goBack">← Voltar</button>
      <div>
        <h1 class="add-tierlist__title">{{ pageTitle }}</h1>
        <p class="add-tierlist__subtitle">{{ pageSubtitle }}</p>
      </div>
    </header>

    <div v-if="loadingData" class="add-tierlist__loading" aria-busy="true" aria-label="Carregando dados">
      <div class="add-tierlist__skeleton-field">
        <ShimmerBlock height="0.85rem" width="40%" />
        <ShimmerBlock height="2.75rem" radius="10px" />
      </div>
      <div class="add-tierlist__skeleton-field">
        <ShimmerBlock height="0.85rem" width="20%" />
        <ShimmerBlock height="4.5rem" radius="12px" />
      </div>
      <div class="add-tierlist__skeleton-field">
        <ShimmerBlock height="0.85rem" width="35%" />
        <div class="add-tierlist__skeleton-grid">
          <ShimmerBlock v-for="n in 6" :key="n" height="4.5rem" radius="12px" />
        </div>
      </div>
      <ShimmerBlock height="2.75rem" width="180px" radius="10px" />
    </div>

    <form v-else class="add-tierlist__form" @submit.prevent="handleSubmit">
      <div class="add-tierlist__fields">
        <label class="add-tierlist__field">
          <span class="add-tierlist__label">Nome da Tier List *</span>
          <input
            v-model="name"
            type="text"
            required
            placeholder="Ex: Ranking de verão"
            class="add-tierlist__input"
          />
        </label>

        <div class="add-tierlist__field">
          <span class="add-tierlist__label">Host *</span>
          <button type="button" class="add-tierlist__host-trigger" @click="openHostModal">
            <template v-if="selectedHost">
              <AvatarCircle
                :image-url="avatarUrl(selectedHost)"
                :character-name="selectedHost.username"
                :username="selectedHost.username"
                size="sm"
                :show-tooltip="false"
              />
              <span class="add-tierlist__host-trigger-text">
                <strong>{{ hostLabel(selectedHost) }}</strong>
                <small>{{ selectedHost.username }}</small>
              </span>
            </template>
            <span v-else class="add-tierlist__host-trigger-placeholder">Selecionar host</span>
          </button>
          <small class="add-tierlist__hint">
            O host é quem tierlista os outros — ele não entra na lista de amigos ranqueados.
          </small>
        </div>
      </div>

      <div class="add-tierlist__friends">
        <div class="add-tierlist__friends-header">
          <h2 class="add-tierlist__friends-title">Amigos tierlistados *</h2>
          <span class="add-tierlist__friends-count">
            {{ selectedFriendIds.length }} selecionado{{ selectedFriendIds.length === 1 ? '' : 's' }}
          </span>
        </div>

        <p v-if="!hostId" class="add-tierlist__hint">
          Selecione o host primeiro para escolher os amigos.
        </p>

        <p v-else-if="friendOptions.length === 0" class="add-tierlist__hint">
          Não há outros amigos cadastrados além do host.
        </p>

        <div v-else class="add-tierlist__people-grid">
          <button
            v-for="person in friendOptions"
            :key="person.id"
            type="button"
            class="person-card"
            :class="{ 'person-card--selected': isFriendSelected(person.id) }"
            :aria-pressed="isFriendSelected(person.id)"
            @click="toggleFriend(person.id)"
          >
            <span
              v-if="isFriendSelected(person.id)"
              class="person-card__check"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path
                  d="M6.173 12.414a1 1 0 0 1-1.414 0L1.793 9.448a1 1 0 1 1 1.414-1.414L5.466 10.293l7.327-7.327a1 1 0 0 1 1.414 1.414l-8.034 8.034z"
                />
              </svg>
            </span>
            <AvatarCircle
              :image-url="avatarUrl(person)"
              :character-name="person.username"
              :username="person.username"
              size="sm"
              :show-tooltip="false"
            />
            <span class="person-card__name">{{ person.username }}</span>
          </button>
        </div>
      </div>

      <div v-if="error" class="add-tierlist__error">{{ error }}</div>
      <div v-if="success" class="add-tierlist__success">
        Tier list {{ isEditMode ? 'atualizada' : 'criada' }} com sucesso! Redirecionando...
      </div>

      <button
        type="submit"
        class="add-tierlist__submit"
        :disabled="!isValid || loading || success || loadingData"
      >
        {{ loading ? 'Salvando...' : success ? 'Sucesso!' : submitButtonText }}
      </button>
    </form>

    <Teleport to="body">
      <div
        v-if="hostModalOpen"
        class="host-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="host-modal-title"
      >
        <button type="button" class="host-modal__backdrop" aria-label="Fechar" @click="closeHostModal" />
        <div class="host-modal__panel">
          <header class="host-modal__header">
            <h2 id="host-modal-title" class="host-modal__title">Selecionar Host</h2>
            <button type="button" class="host-modal__close" @click="closeHostModal">✕</button>
          </header>

          <div v-if="peoples.length === 0" class="host-modal__empty">
            Nenhum amigo cadastrado ainda.
          </div>

          <div v-else class="add-tierlist__people-grid host-modal__grid">
            <button
              v-for="person in peoples"
              :key="person.id"
              type="button"
              class="person-card person-card--host"
              @click="selectHost(person.id)"
            >
              <AvatarCircle
                :image-url="avatarUrl(person)"
                :character-name="person.username"
                :username="person.username"
                size="sm"
                :show-tooltip="false"
              />
              <span class="person-card__hostname">{{ hostLabel(person) }}</span>
              <span class="person-card__username">{{ person.username }}</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.add-tierlist {
  max-width: 880px;
  margin: 0 auto;
  padding: 2rem;
}

.add-tierlist__header {
  margin-bottom: 2rem;
}

.add-tierlist__back {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  transition: opacity 0.2s;
}

.add-tierlist__back:hover {
  opacity: 0.7;
}

.add-tierlist__title {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 0.5rem;
  color: var(--color-text);
}

.add-tierlist__subtitle {
  color: var(--ink-soft);
  margin: 0;
}

.add-tierlist__loading {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--panel);
  border-radius: 12px;
  padding: 2rem;
}

.add-tierlist__skeleton-field {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.add-tierlist__skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.add-tierlist__form {
  background: var(--panel);
  border-radius: 12px;
  padding: 2rem;
}

.add-tierlist__fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border, var(--line));
}

.add-tierlist__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-tierlist__label {
  font-weight: 500;
  color: var(--color-text);
}

.add-tierlist__input {
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.2s;
}

.add-tierlist__input:focus {
  outline: none;
  border-color: var(--ring);
}

.add-tierlist__host-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 72px;
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s;
}

.add-tierlist__host-trigger:hover {
  border-color: var(--ring);
}

.add-tierlist__host-trigger-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.add-tierlist__host-trigger-text strong {
  font-size: 1rem;
  font-weight: 600;
}

.add-tierlist__host-trigger-text small {
  font-size: 0.8rem;
  color: var(--muted);
}

.add-tierlist__host-trigger-placeholder {
  color: var(--muted);
  font-size: 1rem;
}

.add-tierlist__hint {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
}

.add-tierlist__friends-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.add-tierlist__friends-title {
  margin: 0;
  font-size: 1.125rem;
  color: var(--color-text);
}

.add-tierlist__friends-count {
  color: var(--muted);
  font-size: 0.875rem;
}

.add-tierlist__people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 0.75rem;
}

.person-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 1rem 0.75rem 0.85rem;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s;
}

.person-card:hover {
  border-color: var(--ring);
}

.person-card--selected {
  border-color: var(--color-primary);
}

.person-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1fa812;
  color: white;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.person-card__name {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  word-break: break-word;
}

.person-card__hostname {
  font-size: 0.95rem;
  font-weight: 700;
  text-align: center;
  word-break: break-word;
  line-height: 1.2;
}

.person-card__username {
  font-size: 0.75rem;
  color: var(--muted);
  text-align: center;
  word-break: break-word;
  margin-top: -0.25rem;
}

.person-card--host {
  gap: 0.5rem;
}

.add-tierlist__error {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(204, 51, 51, 0.15);
  border: 1px solid var(--color-pending);
  border-radius: 8px;
  color: var(--color-pending);
}

.add-tierlist__success {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(46, 229, 18, 0.15);
  border: 1px solid var(--color-completed);
  border-radius: 8px;
  color: var(--color-completed);
  text-align: center;
  font-weight: 500;
}

.add-tierlist__submit {
  width: 100%;
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-tierlist__submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.add-tierlist__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.host-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.host-modal__backdrop {
  position: absolute;
  inset: 0;
  border: none;
  background: #000000;
  cursor: pointer;
}

.host-modal__panel {
  position: relative;
  z-index: 1;
  width: min(720px, 100%);
  max-height: min(80vh, 720px);
  overflow: auto;
  background: #282828;
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.25rem;
}

.host-modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.host-modal__title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-text);
}

.host-modal__close {
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.host-modal__empty {
  color: var(--muted);
  text-align: center;
  padding: 2rem 1rem;
}

.host-modal__grid {
  margin-bottom: 0.25rem;
}

@media (max-width: 768px) {
  .add-tierlist {
    padding: 1rem;
  }

  .add-tierlist__form {
    padding: 1.5rem;
  }
}
</style>
