<script lang="ts">
import { defineComponent } from 'vue'
import TierList from './components/TierList.vue'

export default defineComponent({
  name: 'App',
  components: {
    TierList,
  },
})
</script>

<template>
  <main>
    <TierList />
  </main>
</template>
