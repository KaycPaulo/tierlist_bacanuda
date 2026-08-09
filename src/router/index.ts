import { createRouter, createWebHistory } from 'vue-router'
import TierListListingView from '@/views/TierListListingView.vue'
import TierListView from '@/views/TierListView.vue'
import FriendsListingView from '@/views/FriendsListingView.vue'
import AddFriendScreen from '@/components/AddFriendScreen.vue'

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
    {
      path: '/friends',
      name: 'friends-list',
      component: FriendsListingView,
    },
    {
      path: '/friends/add',
      name: 'add-friend',
      component: AddFriendScreen,
    },
    {
      path: '/friends/edit/:id',
      name: 'edit-friend',
      component: AddFriendScreen,
    },
  ],
})

export default router
