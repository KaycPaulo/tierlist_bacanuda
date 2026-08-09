<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useTierlistStore } from '@/stores/tierlist'
import TierList from '@/components/TierList.vue'

const route = useRoute()
const store = useTierlistStore()

const tierlistId = Number(route.params.id)

onMounted(() => {
  if (tierlistId && !isNaN(tierlistId)) {
    store.fetchBoard(tierlistId)
  } else {
    store.fetchBoard()
  }
})
</script>

<template>
  <main>
    <TierList />
  </main>
</template>
