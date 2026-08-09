import { createRouter, createWebHistory } from 'vue-router'
import TierListListingView from '@/views/TierListListingView.vue'
import TierListView from '@/views/TierListView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'listing',
      component: TierListListingView,
    },
    {
      path: '/tierlist/:id',
      name: 'tierlist',
      component: TierListView,
      props: true,
    },
  ],
})

export default router
