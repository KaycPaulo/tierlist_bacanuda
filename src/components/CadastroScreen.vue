<script lang="ts">
export default {
  name: 'CadastroScreen',
}
</script>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import {
  createLinkedPair,
  linkPersonToCharacter,
  listCharacters,
  listPeoples,
  listPersonCharacterLinks,
  slugify,
} from '../lib/cadastro'
import type { Character, Person } from '../types/tierlist'

const emit = defineEmits<{
  back: []
}>()

const username = ref('')
const personAvatar = ref('')
const characterName = ref('')
const characterSlug = ref('')
const characterImage = ref('')
const slugTouched = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const previewOk = ref(false)
const previewFailed = ref(false)
const peoples = ref<Person[]>([])
const characters = ref<Character[]>([])
const linkByPerson = ref<Record<string, number | null>>({})
const linkSaving = ref<string | null>(null)
const linkError = ref<string | null>(null)

watch(characterName, (value) => {
  if (!slugTouched.value) characterSlug.value = slugify(value)
})

watch(characterImage, () => {
  previewOk.value = false
  previewFailed.value = false
})

async function refresh() {
  try {
    const [peopleRows, characterRows, links] = await Promise.all([
      listPeoples(),
      listCharacters(),
      listPersonCharacterLinks(),
    ])
    peoples.value = peopleRows
    characters.value = characterRows
    const map: Record<string, number | null> = {}
    for (const person of peopleRows) {
      map[person.id] = links.find((link) => link.user_id === person.id)?.character_id ?? null
    }
    linkByPerson.value = map
  } catch (err) {
    linkError.value = err instanceof Error ? err.message : 'Falha ao carregar vínculos.'
  }
}

onMounted(() => {
  void refresh()
})

function looksLikePageUrl(url: string) {
  const value = url.trim().toLowerCase()
  if (!value) return false
  return (
    value.includes('pin.it/') ||
    value.includes('pinterest.com/pin/') ||
    value.includes('localhost') ||
    value.endsWith('/')
  )
}

async function submitPair() {
  loading.value = true
  error.value = null
  success.value = null
  try {
    if (characterImage.value && looksLikePageUrl(characterImage.value)) {
      throw new Error(
        'Use a URL direta da imagem (.jpg/.png/.webp), não um link de página (Pinterest etc).',
      )
    }
    if (personAvatar.value && looksLikePageUrl(personAvatar.value)) {
      throw new Error('Use uma URL direta para o avatar da pessoa.')
    }

    const result = await createLinkedPair({
      username: username.value,
      personAvatarUrl: personAvatar.value,
      characterName: characterName.value,
      characterSlug: characterSlug.value,
      characterImageUrl: characterImage.value,
    })

    success.value = `${result.person.username} ↔ ${result.character.name}`
    username.value = ''
    personAvatar.value = ''
    characterName.value = ''
    characterSlug.value = ''
    characterImage.value = ''
    slugTouched.value = false
    await refresh()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao cadastrar.'
  } finally {
    loading.value = false
  }
}

async function onAssignCharacter(personId: string, event: Event) {
  const select = event.target as HTMLSelectElement
  const characterId = Number(select.value)
  if (!Number.isFinite(characterId) || characterId <= 0) return

  linkSaving.value = personId
  linkError.value = null
  try {
    await linkPersonToCharacter(personId, characterId)
    linkByPerson.value = { ...linkByPerson.value, [personId]: characterId }
  } catch (err) {
    linkError.value = err instanceof Error ? err.message : 'Falha ao vincular.'
    select.value = String(linkByPerson.value[personId] ?? '')
  } finally {
    linkSaving.value = null
  }
}
</script>

<template>
  <section class="cadastro">
    <header class="cadastro__header">
      <button type="button" class="cadastro__back" @click="emit('back')">← Tierlist</button>
      <div>
        <h1 class="cadastro__title">Cadastro</h1>
        <p class="cadastro__subtitle">
          Cadastre pessoa + personagem já vinculados (evita misturar fotos)
        </p>
      </div>
    </header>

    <form class="cadastro__card" @submit.prevent="submitPair">
      <h2>Pessoa + personagem</h2>
      <p class="cadastro__hint">Cria os dois e grava o vínculo no Supabase</p>

      <label class="cadastro__field">
        <span>Username da pessoa</span>
        <input v-model="username" type="text" required placeholder="ex: kayc" />
      </label>

      <label class="cadastro__field">
        <span>Avatar da pessoa (opcional)</span>
        <input v-model="personAvatar" type="url" placeholder="https://exemplo.com/foto.jpg" />
      </label>

      <label class="cadastro__field">
        <span>Nome do personagem</span>
        <input v-model="characterName" type="text" required placeholder="ex: Rimuru" />
      </label>

      <label class="cadastro__field">
        <span>Slug do personagem</span>
        <input
          v-model="characterSlug"
          type="text"
          required
          placeholder="rimuru"
          @input="slugTouched = true"
        />
      </label>

      <label class="cadastro__field">
        <span>Imagem do personagem</span>
        <input
          v-model="characterImage"
          type="url"
          required
          placeholder="https://exemplo.com/rimuru.png"
        />
        <small>URL direta da imagem (.jpg/.png/.webp)</small>
      </label>

      <div v-if="characterImage.trim()" class="cadastro__preview">
        <img
          :src="characterImage.trim()"
          alt="Preview"
          @load="previewOk = true; previewFailed = false"
          @error="previewOk = false; previewFailed = true"
        />
        <p v-if="previewFailed" class="cadastro__msg cadastro__msg--error">
          Essa URL não carregou como imagem.
        </p>
      </div>

      <button type="submit" class="cadastro__submit" :disabled="loading">
        {{ loading ? 'Salvando...' : 'Cadastrar e vincular' }}
      </button>

      <p v-if="error" class="cadastro__msg cadastro__msg--error">{{ error }}</p>
      <p v-if="success" class="cadastro__msg cadastro__msg--ok">Vinculado: {{ success }}</p>
    </form>

    <section class="cadastro__card cadastro__visibility">
      <h2>Vínculos</h2>
      <p class="cadastro__hint">Escolha o personagem de cada pessoa.</p>

      <p v-if="linkError" class="cadastro__msg cadastro__msg--error">{{ linkError }}</p>

      <ul v-if="peoples.length" class="cadastro__people">
        <li v-for="person in peoples" :key="person.id" class="cadastro__people-item">
          <div class="cadastro__people-info">
            <img
              v-if="person.avatar_url"
              class="cadastro__people-avatar"
              :src="person.avatar_url"
              :alt="person.username"
            />
            <span v-else class="cadastro__people-avatar cadastro__people-avatar--letter">
              {{ person.username.slice(0, 1).toUpperCase() }}
            </span>
            <div>
              <strong>{{ person.username }}</strong>
            </div>
          </div>

          <div class="cadastro__people-actions">
            <label class="cadastro__field cadastro__field--inline">
              <span>Personagem</span>
              <select
                :value="linkByPerson[person.id] ?? ''"
                :disabled="linkSaving === person.id"
                @change="onAssignCharacter(person.id, $event)"
              >
                <option disabled value="">Selecionar...</option>
                <option
                  v-for="character in characters"
                  :key="character.id"
                  :value="character.id"
                >
                  {{ character.name }}
                </option>
              </select>
            </label>
          </div>
        </li>
      </ul>

      <p v-else class="cadastro__hint">Nenhuma pessoa cadastrada ainda.</p>
    </section>

    <p class="cadastro__note">
      Se der erro de RLS ao vincular, rode
      <code>supabase/rls-cadastro.sql</code> no SQL Editor.
    </p>
  </section>
</template>

<style scoped src="./CadastroScreen.css"></style>
