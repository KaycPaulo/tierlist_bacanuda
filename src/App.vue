<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteReactions from './components/SiteReactions.vue'

const route = useRoute()
const showReactions = computed(() => route.name === 'tierlist')
</script>

<template>
  <RouterView />
  <SiteReactions v-if="showReactions" />
</template>
