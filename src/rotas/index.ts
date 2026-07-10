import { createRouter, createWebHistory } from 'vue-router';
import { supabaseClient, decodificarToken } from '@/servicos/supabase';
import LayoutPrincipal from '@/layouts/LayoutPrincipal.vue';
import LoginView from '@/paginas/LoginView.vue';
import ProfessorHomeView from '@/paginas/ProfessorHomeView.vue';
import ProfessorFrequenciaView from '@/paginas/ProfessorFrequenciaView.vue';
import ProfessorAusenciaView from '@/paginas/ProfessorAusenciaView.vue';
import ProfessorOcorrenciaView from '@/paginas/ProfessorOcorrenciaView.vue';
import GestaoHomeView from '@/paginas/GestaoHomeView.vue';
import GestaoRankingView from '@/paginas/GestaoRankingView.vue';
import GestaoOcorrenciasView from '@/paginas/GestaoOcorrenciasView.vue';
import GestaoJustificativasView from '@/paginas/GestaoJustificativasView.vue';
import ResponsavelHomeView from '@/paginas/ResponsavelHomeView.vue';
import ResponsavelAlertasView from '@/paginas/ResponsavelAlertasView.vue';
import ResponsavelTermometroView from '@/paginas/ResponsavelTermometroView.vue';
import ResponsavelJustificativaView from '@/paginas/ResponsavelJustificativaView.vue';
import ResponsavelChatView from '@/paginas/ResponsavelChatView.vue';

declare module 'vue-router' {
  interface RouteMeta {
    requerAutenticacao?: boolean;
    papeisPermitidos?: string[];
  }
}

const homePorPapel: Record<string, string> = {
  professor: '/professor',
  gestao: '/gestao',
  responsavel: '/responsavel',
};

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      meta: { requerAutenticacao: false },
      component: LoginView,
    },
    {
      path: '/professor',
      component: LayoutPrincipal,
      children: [
        {
          path: '',
          name: 'professor',
          meta: { requerAutenticacao: true, papeisPermitidos: ['professor'] },
          component: ProfessorHomeView,
        },
        {
          path: 'frequencia',
          name: 'professor-frequencia',
          meta: { requerAutenticacao: true, papeisPermitidos: ['professor'] },
          component: ProfessorFrequenciaView,
        },
        {
          path: 'ausencia',
          name: 'professor-ausencia',
          meta: { requerAutenticacao: true, papeisPermitidos: ['professor'] },
          component: ProfessorAusenciaView,
        },
        {
          path: 'ocorrencia',
          name: 'professor-ocorrencia',
          meta: { requerAutenticacao: true, papeisPermitidos: ['professor'] },
          component: ProfessorOcorrenciaView,
        },
      ],
    },
    {
      path: '/gestao',
      component: LayoutPrincipal,
      children: [
        {
          path: '',
          name: 'gestao',
          meta: { requerAutenticacao: true, papeisPermitidos: ['gestao'] },
          component: GestaoHomeView,
        },
        {
          path: 'ranking',
          name: 'gestao-ranking',
          meta: { requerAutenticacao: true, papeisPermitidos: ['gestao'] },
          component: GestaoRankingView,
        },
        {
          path: 'ocorrencias',
          name: 'gestao-ocorrencias',
          meta: { requerAutenticacao: true, papeisPermitidos: ['gestao'] },
          component: GestaoOcorrenciasView,
        },
        {
          path: 'justificativas',
          name: 'gestao-justificativas',
          meta: { requerAutenticacao: true, papeisPermitidos: ['gestao'] },
          component: GestaoJustificativasView,
        },
      ],
    },
    {
      path: '/responsavel',
      component: LayoutPrincipal,
      children: [
        {
          path: '',
          name: 'responsavel',
          meta: { requerAutenticacao: true, papeisPermitidos: ['responsavel'] },
          component: ResponsavelHomeView,
        },
        {
          path: 'alertas',
          name: 'responsavel-alertas',
          meta: { requerAutenticacao: true, papeisPermitidos: ['responsavel'] },
          component: ResponsavelAlertasView,
        },
        {
          path: 'termometro',
          name: 'responsavel-termometro',
          meta: { requerAutenticacao: true, papeisPermitidos: ['responsavel'] },
          component: ResponsavelTermometroView,
        },
        {
          path: 'justificativa',
          name: 'responsavel-justificativa',
          meta: { requerAutenticacao: true, papeisPermitidos: ['responsavel'] },
          component: ResponsavelJustificativaView,
        },
        {
          path: 'chat',
          name: 'responsavel-chat',
          meta: { requerAutenticacao: true, papeisPermitidos: ['responsavel'] },
          component: ResponsavelChatView,
        },
      ],
    },
  ],
});

router.beforeEach(async (to, _from) => {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  let perfilPapel: string | null = null;

  if (session) {
    // Lê o papel DIRETAMENTE do JWT via jwt-decode
    // sem consultar o banco de dados (Custom Access Token Hook)
    const claims = decodificarToken(session.access_token);
    perfilPapel = (claims?.papel as string) ?? null;
  }

  if (session && to.path === '/') {
    const destino = perfilPapel ? homePorPapel[perfilPapel] : '/';
    if (destino !== to.path) {
      return destino;
    }
    return;
  }

  if (to.meta?.requerAutenticacao) {
    if (!session) {
      return { name: 'login' };
    }

    const papeisPermitidos = to.meta.papeisPermitidos;

    if (papeisPermitidos && perfilPapel && !papeisPermitidos.includes(perfilPapel)) {
      const destino = homePorPapel[perfilPapel] ?? '/';
      if (destino !== to.path) {
        return destino;
      }
    }
  }
});

export default router;
