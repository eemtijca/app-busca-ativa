import { createRouter, createWebHistory } from 'vue-router'
import LayoutPrincipal from '@/presentation/layouts/LayoutPrincipal.vue'
import LoginView from '@/presentation/views/LoginView.vue'
import ProfessorHomeView from '@/presentation/views/ProfessorHomeView.vue'
import GestaoHomeView from '@/presentation/views/GestaoHomeView.vue'
import ResponsavelHomeView from '@/presentation/views/ResponsavelHomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: LayoutPrincipal,
      children: [
        {
          path: '',
          name: 'login',
          component: LoginView,
        },
        {
          path: 'professor',
          name: 'professor',
          component: ProfessorHomeView,
        },
        {
          path: 'gestao',
          name: 'gestao',
          component: GestaoHomeView,
        },
        {
          path: 'responsavel',
          name: 'responsavel',
          component: ResponsavelHomeView,
        },
      ],
    },
  ],
})

export default router
