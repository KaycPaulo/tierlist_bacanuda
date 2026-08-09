<script lang="ts">
import { defineComponent, ref } from 'vue'
import CadastroScreen from './components/CadastroScreen.vue'
import SiteReactions from './components/SiteReactions.vue'
import TierList from './components/TierList.vue'
import { useTierlistStore } from './stores/tierlist'

export default defineComponent({
  name: 'App',
  components: {
    TierList,
    SiteReactions,
    CadastroScreen,
  },
  setup() {
    const view = ref<'board' | 'cadastro'>('board')
    const store = useTierlistStore()

    function goBoard() {
      view.value = 'board'
      void store.fetchBoard()
    }

    return { view, goBoard }
  },
})
</script>

<template>
  <main :class="{ 'main--board': view === 'board' }">
    <nav v-if="view === 'board'" class="app-nav">
      <button type="button" class="app-nav__link" @click="view = 'cadastro'">
        Cadastro / ocultar pessoas
      </button>
    </nav>

    <TierList v-if="view === 'board'" />
    <CadastroScreen v-else @back="goBoard" />
    <SiteReactions v-if="view === 'board'" />
  </main>
</template>

<style scoped>
.main--board {
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-nav {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: 0.65rem 1.15rem 0;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.app-nav__link {
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink-soft);
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
}

.app-nav__link:hover {
  border-color: var(--ring);
  color: var(--ink);
}
</style>
