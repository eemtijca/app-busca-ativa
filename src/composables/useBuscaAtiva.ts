import { ref, type Ref } from 'vue';
import { supabaseClient } from '@/servicos/supabase';
import type {
  Aluno,
  Frequencia,
  Ocorrencia,
  Perfil,
  VinculoResponsavel,
  JustificativaFalta,
} from '@/tipos/database';
import type {
  AlunoFrequencia,
  AlunoRisco,
  AlertaResponsavel,
  EstatisticaPainel,
  JustificativaPendente,
  MensagemChat,
  NivelRisco,
  OcorrenciaGrave,
  TermometroAtencao,
  HorarioProtegido,
} from '@/tipos/componentes';

/**
 * Calcula o nível de risco com base em ausências e ocorrências.
 * Regras de negócio (alinhadas ao README):
 *   - alto (crítico): >= 5 ausências OU >= 1 ocorrência grave/suspensão
 *   - medio (atenção): 3-4 ausências
 *   - baixo (estável): 0-2 ausências
 */
function calcularNivelRisco(totalAusencias: number, totalOcorrencias: number): NivelRisco {
  if (totalAusencias >= 5 || totalOcorrencias >= 1) return 'alto';
  if (totalAusencias >= 3) return 'medio';
  return 'baixo';
}

function formatarData(iso: string): string {
  if (!iso) return '';
  try {
    const data = new Date(iso);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatarDataHorario(iso: string): { data: string; horario: string } {
  if (!iso) return { data: '', horario: '' };
  try {
    const d = new Date(iso);
    return {
      data: d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      horario: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch {
    return { data: iso, horario: '' };
  }
}

export function useBuscaAtiva() {
  const carregando: Ref<boolean> = ref(false);
  const erro: Ref<string | null> = ref(null);

  /**
   * buscarAlunosParaFrequencia - Busca a lista de alunos para o
   * professor registrar frequência por exceção. Não filtra por
   * professor específico (a RLS do Supabase garante que o
   * professor só veja alunos das turmas que lecione).
   */
  async function buscarAlunosParaFrequencia(): Promise<AlunoFrequencia[]> {
    carregando.value = true;
    erro.value = null;
    try {
      const { data, error: err } = await supabaseClient
        .from('alunos')
        .select('*')
        .order('nome', { ascending: true });

      if (err) throw err;

      const alunos = (data ?? []) as unknown as Aluno[];
      return alunos.map((aluno) => ({
        id: aluno.id,
        nome: aluno.nome,
        matricula: aluno.matricula,
        turma: null,
        ausente: false,
        periodosAusentes: [],
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar alunos:', msg);
      erro.value = 'Não foi possível carregar a lista de alunos.';
      return [];
    } finally {
      carregando.value = false;
    }
  }

  async function registrarFrequenciaEmMassa(
    alunos: AlunoFrequencia[],
    professorId: string,
    dataAula: string,
    periodo: string,
  ): Promise<{ registradas: number; erro: string | null }> {
    carregando.value = true;
    erro.value = null;
    try {
      const ausentes = alunos.filter((a) => a.ausente);
      if (!ausentes.length) {
        return { registradas: 0, erro: null };
      }

      const insercoes = ausentes.map((aluno) => ({
        aluno_id: aluno.id,
        professor_id: professorId,
        data_aula: dataAula,
        periodo,
        status: 'ausente' as const,
      }));

      const { error: err } = await supabaseClient.from('frequencias').insert(insercoes);

      if (err) throw err;

      return { registradas: ausentes.length, erro: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao registrar frequência:', msg);
      const mensagem = 'Falha ao registrar frequência. Tente novamente.';
      erro.value = mensagem;
      return { registradas: 0, erro: mensagem };
    } finally {
      carregando.value = false;
    }
  }

  async function registrarAusenciaEmPeriodo(
    alunoId: string,
    professorId: string,
    dataAula: string,
    periodo: string,
  ): Promise<boolean> {
    carregando.value = true;
    erro.value = null;
    try {
      const { error: err } = await supabaseClient.from('frequencias').insert({
        aluno_id: alunoId,
        professor_id: professorId,
        data_aula: dataAula,
        periodo,
        status: 'ausente',
      });

      if (err) throw err;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao registrar ausência em período:', msg);
      erro.value = 'Falha ao registrar ausência em aula.';
      return false;
    } finally {
      carregando.value = false;
    }
  }

  async function registrarOcorrenciaGrave(
    alunoId: string,
    professorId: string,
    descricao: string,
    tipo: 'grave' | 'suspensao' = 'grave',
    exigePresencaResponsavel = false,
  ): Promise<boolean> {
    carregando.value = true;
    erro.value = null;
    try {
      const { data: enturmacao } = await supabaseClient
        .from('enturmacoes')
        .select('turma_id, ano_letivo_id')
        .eq('aluno_id', alunoId)
        .eq('status', 'matriculado')
        .single();
      if (!enturmacao) throw new Error('Aluno não está matriculado em nenhuma turma.');

      const { error: err } = await supabaseClient.from('ocorrencias').insert({
        aluno_id: alunoId,
        professor_id: professorId,
        turma_id: enturmacao.turma_id,
        ano_letivo_id: enturmacao.ano_letivo_id,
        titulo: descricao.slice(0, 100),
        descricao,
        tipo,
        exige_presenca_responsavel: exigePresencaResponsavel,
      });

      if (err) throw err;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao registrar ocorrência:', msg);
      erro.value = 'Falha ao registrar ocorrência grave.';
      return false;
    } finally {
      carregando.value = false;
    }
  }

  async function buscarRankingRisco(): Promise<AlunoRisco[]> {
    carregando.value = true;
    erro.value = null;
    try {
      const { data: alunosData, error: errAlunos } = await supabaseClient
        .from('alunos')
        .select('*')
        .order('nome', { ascending: true });

      if (errAlunos) throw errAlunos;
      const alunos = (alunosData ?? []) as unknown as Aluno[];

      const { data: frequenciasData, error: errFreq } = await supabaseClient
        .from('frequencias')
        .select('aluno_id, data_aula');

      if (errFreq) throw errFreq;
      const frequencias = (frequenciasData ?? []) as unknown as Pick<
        Frequencia,
        'aluno_id' | 'data_aula'
      >[];

      const { data: ocorrenciasData, error: errOco } = await supabaseClient
        .from('ocorrencias')
        .select('aluno_id, exige_presenca_responsavel');

      if (errOco) throw errOco;
      const ocorrencias = (ocorrenciasData ?? []) as unknown as Pick<
        Ocorrencia,
        'aluno_id' | 'exige_presenca_responsavel'
      >[];

      const ranking: AlunoRisco[] = alunos.map((aluno) => {
        const ausencias = frequencias.filter((f) => f.aluno_id === aluno.id);
        const ocos = ocorrencias.filter((o) => o.aluno_id === aluno.id);
        const totalAusencias = ausencias.length;
        const totalOcorrencias = ocos.length;
        const ultima = ausencias
          .map((f) => f.data_aula)
          .sort()
          .reverse()[0];
        return {
          id: aluno.id,
          nome: aluno.nome,
          matricula: aluno.matricula,
          turma: null,
          serie: null,
          totalAusencias,
          totalOcorrencias,
          nivel: calcularNivelRisco(totalAusencias, totalOcorrencias),
          ultimaAusencia: ultima ? formatarData(ultima) : undefined,
          exigePresencaResponsavel: ocos.some((o) => o.exige_presenca_responsavel),
        };
      });

      // Ordena: crítico primeiro, depois por total de ausências
      const ordemNivel: Record<NivelRisco, number> = { alto: 0, medio: 1, baixo: 2 };
      ranking.sort((a, b) => {
        const diffNivel = ordemNivel[a.nivel] - ordemNivel[b.nivel];
        if (diffNivel !== 0) return diffNivel;
        return b.totalAusencias - a.totalAusencias;
      });

      return ranking;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar ranking de risco:', msg);
      erro.value = 'Não foi possível carregar o ranking de risco.';
      return [];
    } finally {
      carregando.value = false;
    }
  }

  async function buscarOcorrenciasGraves(): Promise<OcorrenciaGrave[]> {
    carregando.value = true;
    erro.value = null;
    try {
      // Busca ocorrências com join implícito em alunos via duas queries
      const { data: ocoData, error: err } = await supabaseClient
        .from('ocorrencias')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      const ocorrencias = (ocoData ?? []) as unknown as Ocorrencia[];

      const alunoIds = [...new Set(ocorrencias.map((o) => o.aluno_id))];
      const { data: alunosData } = await supabaseClient
        .from('alunos')
        .select('*')
        .in('id', alunoIds);
      const alunos = (alunosData ?? []) as unknown as Aluno[];

      const profIds = [...new Set(ocorrencias.map((o) => o.professor_id))];
      const { data: profData } = await supabaseClient.from('perfis').select('*').in('id', profIds);
      const professores = (profData ?? []) as unknown as Perfil[];

      return ocorrencias.map((oc) => {
        const aluno = alunos.find((a) => a.id === oc.aluno_id);
        const prof = professores.find((p) => p.id === oc.professor_id);
        return {
          id: oc.id,
          alunoNome: aluno?.nome ?? 'Aluno não encontrado',
          alunoMatricula: aluno?.matricula ?? '—',
          turma: null,
          descricao: oc.descricao,
          tipo: oc.tipo,
          data: formatarData(oc.created_at),
          professorNome: prof?.nome,
          exigePresencaResponsavel: oc.exige_presenca_responsavel,
          bloqueado: oc.exige_presenca_responsavel,
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar ocorrências graves:', msg);
      erro.value = 'Não foi possível carregar as ocorrências graves.';
      return [];
    } finally {
      carregando.value = false;
    }
  }

  async function alternarBloqueioRetorno(
    ocorrenciaId: string,
    novoValor: boolean,
  ): Promise<boolean> {
    try {
      const { error: err } = await supabaseClient
        .from('ocorrencias')
        .update({ exige_presenca_responsavel: novoValor })
        .eq('id', ocorrenciaId);

      if (err) throw err;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao alternar bloqueio de retorno:', msg);
      erro.value = 'Falha ao atualizar bloqueio de retorno.';
      return false;
    }
  }

  async function buscarJustificativasPendentes(): Promise<JustificativaPendente[]> {
    carregando.value = true;
    erro.value = null;
    try {
      const { data: justData, error: err } = await supabaseClient
        .from('justificativas_faltas')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      const justificativas = (justData ?? []) as unknown as JustificativaFalta[];

      const alunoIds = [...new Set(justificativas.map((j) => j.aluno_id))];
      const { data: alunosData } = await supabaseClient
        .from('alunos')
        .select('*')
        .in('id', alunoIds);
      const alunos = (alunosData ?? []) as unknown as Aluno[];

      const respIds = [...new Set(justificativas.map((j) => j.responsavel_id))];
      const { data: respData } = await supabaseClient.from('perfis').select('*').in('id', respIds);
      const responsaveis = (respData ?? []) as unknown as Perfil[];

      return justificativas.map((j) => {
        const aluno = alunos.find((a) => a.id === j.aluno_id);
        const responsavel = responsaveis.find((r) => r.id === j.responsavel_id);
        return {
          id: j.id,
          alunoNome: aluno?.nome ?? 'Aluno não encontrado',
          responsavelNome: responsavel?.nome ?? 'Responsável não vinculado',
          dataAusencia: formatarData(j.data_falta),
          motivo: j.motivo,
          status: j.status as JustificativaPendente['status'],
        };
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar justificativas:', msg);
      erro.value = 'Não foi possível carregar as justificativas.';
      return [];
    } finally {
      carregando.value = false;
    }
  }

  async function validarJustificativa(
    justificativaId: string,
    acao: 'aceitar' | 'recusar',
  ): Promise<boolean> {
    try {
      const status = acao === 'aceitar' ? 'aceita' : 'recusada';
      const { error: err } = await supabaseClient
        .from('justificativas_faltas')
        .update({
          status,
          avaliado_em: new Date().toISOString(),
        })
        .eq('id', justificativaId);

      if (err) throw err;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao validar justificativa:', msg);
      erro.value = 'Falha ao validar justificativa.';
      return false;
    }
  }

  /**
   * Estatísticas do Painel Confidencial a partir de listas já carregadas.
   */
  function calcularEstatisticasPainel(
    ranking: AlunoRisco[],
    ocorrencias: OcorrenciaGrave[],
    justificativas: JustificativaPendente[],
  ): EstatisticaPainel[] {
    const totalAlunos = ranking.length;
    const alunosRiscoAlto = ranking.filter((r) => r.nivel === 'alto').length;
    const alunosRiscoMedio = ranking.filter((r) => r.nivel === 'medio').length;
    const ocorrenciasAtivas = ocorrencias.filter((o) => !o.exigePresencaResponsavel).length;
    const bloqueiosAtivos = ocorrencias.filter((o) => o.exigePresencaResponsavel).length;
    const justificativasPendentes = justificativas.filter((j) => j.status === 'pendente').length;

    return [
      {
        id: 'alunos',
        rotulo: 'Alunos monitorados',
        valor: totalAlunos,
        icone: 'people',
        variante: 'primary',
        rodape: 'Total cadastrado',
      },
      {
        id: 'risco-alto',
        rotulo: 'Risco crítico',
        valor: alunosRiscoAlto,
        icone: 'exclamation-octagon',
        variante: 'danger',
        rodape: 'Contato urgente',
      },
      {
        id: 'risco-medio',
        rotulo: 'Em atenção',
        valor: alunosRiscoMedio,
        icone: 'exclamation-triangle',
        variante: 'warning',
        rodape: 'Acompanhamento',
      },
      {
        id: 'ocorrencias',
        rotulo: 'Ocorrências graves',
        valor: ocorrencias.length,
        icone: 'shield-exclamation',
        variante: 'dark',
        rodape: `${ocorrenciasAtivas} ativas`,
      },
      {
        id: 'bloqueios',
        rotulo: 'Retornos bloqueados',
        valor: bloqueiosAtivos,
        icone: 'lock',
        variante: 'secondary',
        rodape: 'Exigem responsável',
      },
      {
        id: 'justificativas',
        rotulo: 'Justificativas',
        valor: justificativasPendentes,
        icone: 'clipboard-check',
        variante: 'info',
        rodape: 'Aguardando validação',
      },
    ];
  }

  async function buscarFilhosDoResponsavel(responsavelId: string): Promise<Aluno[]> {
    carregando.value = true;
    erro.value = null;
    try {
      const { data: vinculos, error: errVinc } = await supabaseClient
        .from('vinculos_responsaveis')
        .select('aluno_id')
        .eq('responsavel_id', responsavelId);

      if (errVinc) throw errVinc;

      const alunoIds = (vinculos ?? []).map((v) => (v as unknown as VinculoResponsavel).aluno_id);
      if (!alunoIds.length) return [];

      const { data: alunos, error: errAlunos } = await supabaseClient
        .from('alunos')
        .select('*')
        .in('id', alunoIds)
        .order('nome', { ascending: true });

      if (errAlunos) throw errAlunos;
      return (alunos ?? []) as unknown as Aluno[];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar filhos do responsável:', msg);
      erro.value = 'Não foi possível carregar seus filhos vinculados.';
      return [];
    } finally {
      carregando.value = false;
    }
  }

  async function buscarTermometroAluno(
    alunoId: string,
    alunoNome: string,
    alunoTurma: string | null,
  ): Promise<TermometroAtencao> {
    try {
      const { data: freqs, error: errF } = await supabaseClient
        .from('frequencias')
        .select('id, data_aula')
        .eq('aluno_id', alunoId)
        .eq('status', 'ausente');

      if (errF) throw errF;
      const totalAusencias = (freqs ?? []).length;

      const { data: ocos, error: errO } = await supabaseClient
        .from('ocorrencias')
        .select('id')
        .eq('aluno_id', alunoId);

      if (errO) throw errO;
      const totalOcorrencias = (ocos ?? []).length;

      const nivel = calcularNivelRisco(totalAusencias, totalOcorrencias);
      const mensagens: Record<NivelRisco, string> = {
        baixo: 'Continue acompanhando a vida escolar do seu filho.',
        medio: 'Algumas faltas foram registradas. Entre em contato com a escola.',
        alto: 'Acúmulo importante de ausências. Procure a coordenação imediatamente.',
      };

      return {
        nivel,
        alunoNome,
        alunoTurma,
        totalAusencias,
        totalOcorrencias,
        mensagem: mensagens[nivel],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar termômetro:', msg);
      return {
        nivel: 'baixo',
        alunoNome,
        alunoTurma,
        totalAusencias: 0,
        totalOcorrencias: 0,
        mensagem: 'Não foi possível carregar os dados de risco.',
      };
    }
  }

  async function buscarAlertasResponsavel(responsavelId: string): Promise<AlertaResponsavel[]> {
    try {
      const filhos = await buscarFilhosDoResponsavel(responsavelId);
      if (!filhos.length) return [];

      const alertas: AlertaResponsavel[] = [];

      for (const filho of filhos) {
        const { data: freqs } = await supabaseClient
          .from('frequencias')
          .select('*')
          .eq('aluno_id', filho.id)
          .eq('status', 'ausente')
          .order('data_aula', { ascending: false })
          .limit(5);

        const ausencias = (freqs ?? []) as unknown as Frequencia[];
        for (const aus of ausencias) {
          const { data: dataFormatada } = formatarDataHorario(aus.data_aula);
          alertas.push({
            id: `freq-${aus.id}`,
            tipo:
              aus.periodo === 'Dia completo' || !aus.periodo ? 'ausencia_escola' : 'ausencia_aula',
            titulo: `Falta registrada — ${filho.nome}`,
            descricao: 'Sem justificativa enviada.',
            data: dataFormatada,
            periodo: aus.periodo,
            urgente: false,
          });
        }

        const { data: ocos } = await supabaseClient
          .from('ocorrencias')
          .select('*')
          .eq('aluno_id', filho.id)
          .order('created_at', { ascending: false })
          .limit(5);

        const ocorrencias = (ocos ?? []) as unknown as Ocorrencia[];
        for (const oc of ocorrencias) {
          const { data: dataFormatada } = formatarDataHorario(oc.created_at);
          alertas.push({
            id: `oc-${oc.id}`,
            tipo: oc.tipo === 'suspensao' ? 'suspensao' : 'comunicado',
            titulo:
              oc.tipo === 'suspensao'
                ? `Suspensão — ${filho.nome}`
                : `Ocorrência grave — ${filho.nome}`,
            descricao: oc.descricao,
            data: dataFormatada,
            urgente: oc.exige_presenca_responsavel,
          });
        }
      }

      return alertas.sort((a, b) => (a.data < b.data ? 1 : -1));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao buscar alertas do responsável:', msg);
      erro.value = 'Não foi possível carregar seus alertas.';
      return [];
    }
  }

  async function enviarJustificativa(
    alunoId: string,
    _professorId: string,
    dataAusencia: string,
    motivo: string,
    _arquivo: File | null,
    responsavelId: string,
  ): Promise<boolean> {
    carregando.value = true;
    erro.value = null;
    try {
      const { error: err } = await supabaseClient.from('justificativas_faltas').insert({
        aluno_id: alunoId,
        responsavel_id: responsavelId,
        data_falta: dataAusencia,
        motivo,
      });

      if (err) throw err;
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[useBuscaAtiva] Erro ao enviar justificativa:', msg);
      erro.value = 'Falha ao enviar justificativa. Tente novamente.';
      return false;
    } finally {
      carregando.value = false;
    }
  }

  /**
   * buscarMensagensChat - Busca o histórico de mensagens do
   * canal de diálogo. Como a tabela atual não possui uma tabela
   * de mensagens, retorna [] em produção até que seja migrada.
   *
   * NOTA: Em uma versão futura, criar tabela `mensagens_chat`
   * com RLS para que cada responsável veja apenas suas mensagens.
   */
  async function buscarMensagensChat(_responsavelId: string): Promise<MensagemChat[]> {
    // Tabela ainda não existe no schema. Retorna lista vazia
    // para que o componente exiba o estado "sem mensagens".
    return [];
  }

  function horarioProtegidoAtivo(agora: Date = new Date()): boolean {
    const dia = agora.getDay();
    const hora = agora.getHours();
    const minuto = agora.getMinutes();
    const minutosTotais = hora * 60 + minuto;

    if (dia < 1 || dia > 5) return false;

    return minutosTotais >= 7 * 60 && minutosTotais <= 17 * 60;
  }

  function obterHorarioProtegido(): HorarioProtegido {
    return {
      inicio: '07:00',
      fim: '17:00',
      diasSemana: [1, 2, 3, 4, 5],
      mensagemForaHorario:
        'O canal de diálogo está fora do horário escolar (segunda a sexta, das 7h às 17h). ' +
        'Mensagens enviadas agora não serão recebidas pela coordenação. Em emergências, ligue para a escola.',
    };
  }

  return {
    carregando,
    erro,
    buscarAlunosParaFrequencia,
    registrarFrequenciaEmMassa,
    registrarAusenciaEmPeriodo,
    registrarOcorrenciaGrave,
    buscarRankingRisco,
    buscarOcorrenciasGraves,
    alternarBloqueioRetorno,
    buscarJustificativasPendentes,
    validarJustificativa,
    calcularEstatisticasPainel,
    buscarFilhosDoResponsavel,
    buscarTermometroAluno,
    buscarAlertasResponsavel,
    enviarJustificativa,
    buscarMensagensChat,
    horarioProtegidoAtivo,
    obterHorarioProtegido,
  };
}
