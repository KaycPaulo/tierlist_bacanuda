<script lang="ts">
export default {
  name: 'AddFriendScreen',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createPerson, getPerson, updatePerson } from '../lib/cadastro'
import { uploadAvatar } from '../lib/storage'
import ShimmerBlock from './ShimmerBlock.vue'

const router = useRouter()
const route = useRoute()

const personId = ref<string | null>(null)
const username = ref('')
const hostname = ref('')
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const existingAvatarUrl = ref<string | null>(null)
const loading = ref(false)
const loadingData = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)

const isEditMode = computed(() => personId.value !== null)
const pageTitle = computed(() => (isEditMode.value ? 'Editar Amigo' : 'Adicionar Amigo'))
const pageSubtitle = computed(() =>
  isEditMode.value ? 'Altere as informações do amigo' : 'Preencha as informações do amigo',
)
const submitButtonText = computed(() => (isEditMode.value ? 'Salvar Alterações' : 'Adicionar Amigo'))

const isValid = computed(() => {
  const hasUsername = username.value.trim() !== ''
  const hasImage = selectedFile.value !== null || existingAvatarUrl.value !== null
  return hasUsername && hasImage
})

onMounted(async () => {
  const id = route.params.id as string | undefined
  if (id) {
    personId.value = id
    loadingData.value = true
    try {
      const person = await getPerson(id)
      username.value = person.username
      hostname.value = person.hostname || ''
      if (person.avatar_url) {
        existingAvatarUrl.value = person.avatar_url
        previewUrl.value = person.avatar_url
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Erro ao carregar dados do amigo'
    } finally {
      loadingData.value = false
    }
  }
})

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = 'Por favor, selecione um arquivo de imagem'
    return
  }

  selectedFile.value = file
  error.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    previewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function removeImage() {
  selectedFile.value = null
  previewUrl.value = null
  existingAvatarUrl.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function handleSubmit() {
  if (!isValid.value) return

  loading.value = true
  error.value = null
  success.value = false

  try {
    let avatarUrl = existingAvatarUrl.value

    if (selectedFile.value) {
      avatarUrl = await uploadAvatar(selectedFile.value, username.value)
    }

    if (isEditMode.value && personId.value) {
      await updatePerson(personId.value, {
        username: username.value,
        hostname: hostname.value || undefined,
        avatarUrl: avatarUrl || undefined,
      })
    } else {
      await createPerson({
        username: username.value,
        hostname: hostname.value || undefined,
        avatarUrl: avatarUrl || undefined,
      })
    }

    success.value = true

    setTimeout(() => {
      router.push({ name: 'friends-list' })
    }, 1500)
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : `Erro ao ${isEditMode.value ? 'atualizar' : 'adicionar'} amigo`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="add-friend">
    <header class="add-friend__header">
      <button type="button" class="add-friend__back" @click="router.push({ name: 'friends-list' })">
        ← Voltar
      </button>
      <div>
        <h1 class="add-friend__title">{{ pageTitle }}</h1>
        <p class="add-friend__subtitle">{{ pageSubtitle }}</p>
      </div>
    </header>

    <div v-if="loadingData" class="add-friend__loading" aria-busy="true" aria-label="Carregando dados">
      <div class="add-friend__skeleton-avatar">
        <ShimmerBlock width="160px" height="160px" radius="50%" />
      </div>
      <div class="add-friend__skeleton-fields">
        <ShimmerBlock height="0.85rem" width="30%" />
        <ShimmerBlock height="2.75rem" radius="10px" />
        <ShimmerBlock height="0.85rem" width="35%" />
        <ShimmerBlock height="2.75rem" radius="10px" />
        <ShimmerBlock height="2.75rem" width="160px" radius="10px" />
      </div>
    </div>

    <form v-if="!loadingData" class="add-friend__form" @submit.prevent="handleSubmit">
      <div class="add-friend__content">
        <div class="add-friend__image-section">
          <div class="add-friend__image-container">
            <div 
              class="add-friend__placeholder"
              :class="{ 'add-friend__placeholder--has-image': previewUrl }"
              @click="triggerFileInput"
            >
              <img 
                v-if="previewUrl" 
                :src="previewUrl" 
                alt="Preview do avatar"
                class="add-friend__preview-image"
              />
              <div v-else class="add-friend__placeholder-content">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  class="add-friend__placeholder-icon"
                >
                  <path 
                    stroke-linecap="round" 
                    stroke-linejoin="round" 
                    stroke-width="2" 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
                <span class="add-friend__placeholder-text">Adicionar foto</span>
              </div>
            </div>

            <button 
              v-if="previewUrl" 
              type="button" 
              class="add-friend__remove-image"
              @click="removeImage"
            >
              ✕
            </button>
          </div>

          <input 
            ref="fileInputRef"
            type="file" 
            accept="image/*"
            class="add-friend__file-input"
            @change="handleFileSelect"
          />

          <p class="add-friend__image-note">
            O arquivo será salvo como: <br />
            <code>avatar_{{ username.toLowerCase() || 'nome' }}.jpg</code>
          </p>
        </div>

        <div class="add-friend__avatar-preview">
          <h3 class="add-friend__preview-title">Preview na Tierlist</h3>
          <div class="add-friend__avatar-demo">
            <div 
              class="add-friend__avatar"
              :class="{ 'add-friend__avatar--empty': !previewUrl }"
            >
              <img 
                v-if="previewUrl" 
                :src="previewUrl" 
                :alt="username || 'Preview'"
              />
              <span v-else class="add-friend__avatar-letter">
                {{ username ? username.charAt(0).toUpperCase() : '?' }}
              </span>
            </div>
            <span class="add-friend__avatar-name">
              {{ username || 'Nome do amigo' }}
            </span>
          </div>
        </div>
      </div>

      <div class="add-friend__fields">
        <label class="add-friend__field">
          <span class="add-friend__label">Nome *</span>
          <input 
            v-model="username"
            type="text"
            required
            placeholder="Ex: João"
            class="add-friend__input"
          />
        </label>

        <label class="add-friend__field">
          <span class="add-friend__label">
            Nome quando é Host
            <small>(opcional)</small>
          </span>
          <input 
            v-model="hostname"
            type="text"
            placeholder="Ex: João Silva"
            class="add-friend__input"
          />
          <small class="add-friend__hint">
            Como esse amigo será chamado quando for o host da tierlist
          </small>
        </label>
      </div>

      <div v-if="error" class="add-friend__error">
        {{ error }}
      </div>

      <div v-if="success" class="add-friend__success">
        {{ isEditMode ? 'Amigo atualizado' : 'Amigo adicionado' }} com sucesso! Redirecionando...
      </div>

      <button 
        type="submit" 
        class="add-friend__submit"
        :disabled="!isValid || loading || success || loadingData"
      >
        {{ loading ? 'Salvando...' : success ? 'Sucesso!' : submitButtonText }}
      </button>
    </form>
  </section>
</template>

<style scoped>
.add-friend {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.add-friend__header {
  margin-bottom: 2rem;
}

.add-friend__loading {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: flex-start;
  background: var(--panel);
  border-radius: 12px;
  padding: 2rem;
}

.add-friend__skeleton-avatar {
  flex-shrink: 0;
}

.add-friend__skeleton-fields {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.add-friend__back {
  background: none;
  border: none;
  color: var(--color-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  transition: opacity 0.2s;
}

.add-friend__back:hover {
  opacity: 0.7;
}

.add-friend__title {
  font-family: var(--font-title);
  font-size: 2rem;
  font-weight: 400;
  margin: 0 0 0.5rem;
  color: var(--color-text);
}

.add-friend__subtitle {
  color: var(--ink-soft);
  margin: 0;
}

.add-friend__form {
  background: var(--panel);
  border-radius: 12px;
  padding: 2rem;
}

.add-friend__content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.add-friend__image-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.add-friend__image-container {
  position: relative;
}

.add-friend__placeholder {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 3px dashed var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--color-background);
  overflow: hidden;
}

.add-friend__placeholder:hover {
  border-color: var(--color-primary);
  transform: scale(1.02);
}

.add-friend__placeholder--has-image {
  border-style: solid;
  border-color: var(--color-primary);
}

.add-friend__placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted);
}

.add-friend__placeholder-icon {
  width: 48px;
  height: 48px;
}

.add-friend__placeholder-text {
  font-size: 0.875rem;
}

.add-friend__preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.add-friend__remove-image {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-pending);
  color: white;
  border: 2px solid var(--color-background);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: transform 0.2s;
}

.add-friend__remove-image:hover {
  transform: scale(1.1);
}

.add-friend__file-input {
  display: none;
}

.add-friend__image-note {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
  margin: 0;
}

.add-friend__image-note code {
  background: var(--color-background);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  display: inline-block;
  margin-top: 0.25rem;
  color: var(--ink-soft);
}

.add-friend__avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.add-friend__preview-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-text);
}

.add-friend__avatar-demo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--line);
}

.add-friend__avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--chip);
}

.add-friend__avatar--empty {
  background: linear-gradient(135deg, var(--color-primary) 0%, #764ba2 100%);
  color: white;
}

.add-friend__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.add-friend__avatar-letter {
  font-size: 2rem;
  font-weight: bold;
}

.add-friend__avatar-name {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 500;
}

.add-friend__fields {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.add-friend__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-friend__label {
  font-weight: 500;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-friend__label small {
  font-weight: normal;
  color: var(--muted);
  font-size: 0.875rem;
}

.add-friend__input {
  padding: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--color-background);
  color: var(--color-text);
  transition: border-color 0.2s;
}

.add-friend__input:focus {
  outline: none;
  border-color: var(--ring);
}

.add-friend__hint {
  color: var(--muted);
  font-size: 0.875rem;
  margin: 0;
}

.add-friend__error {
  padding: 1rem;
  background: rgba(204, 51, 51, 0.15);
  border: 1px solid var(--color-pending);
  border-radius: 8px;
  color: var(--color-pending);
  margin-bottom: 1rem;
}

.add-friend__success {
  padding: 1rem;
  background: rgba(46, 229, 18, 0.15);
  border: 1px solid var(--color-completed);
  border-radius: 8px;
  color: var(--color-completed);
  margin-bottom: 1rem;
  text-align: center;
  font-weight: 500;
}

.add-friend__submit {
  width: 100%;
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

.add-friend__submit:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.add-friend__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .add-friend {
    padding: 1rem;
  }

  .add-friend__content {
    grid-template-columns: 1fr;
  }

  .add-friend__placeholder {
    width: 150px;
    height: 150px;
  }

  .add-friend__form {
    padding: 1.5rem;
  }
}
</style>
