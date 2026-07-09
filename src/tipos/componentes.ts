/**
 * tipos/componentes.ts
 *
 * Tipos compartilhados entre os componentes presentacionais (dumb) e as
 * páginas inteligentes (smart) da Aplicação de Busca Ativa Escolar.
 *
 * Convenção PT-BR: todos os nomes são em português do Brasil.
 */

// =========================================================
// Navegação e Layout
// =========================================================

export interface LinkNav {
  rotulo: string;
  url: string;
  ativo?: boolean;
  icone?: string;
}

export interface ItemBreadcrumb {
  rotulo: string;
  url?: string;
  icone?: string;
  ativo?: boolean;
}

export interface ItemSidebar {
  id: string;
  rotulo: string;
  icone: string;
  url?: string;
  ativo?: boolean;
  filhos?: ItemSidebar[];
  data?: string;
  descricao?: string;
  badge?: number | string;
}

export interface DropdownItem {
  rotulo: string;
  url?: string;
  dividir?: boolean;
  icone?: string;
}

// =========================================================
// Hero, Recursos e Conteúdo Genérico
// =========================================================

export interface AcaoHero {
  rotulo: string;
  variante: 'primary' | 'outline-secondary' | 'outline-info' | 'outline-light' | 'secondary';
  destaque?: boolean;
  url?: string;
}

export interface Recurso {
  icone: string;
  titulo: string;
  descricao: string;
  url?: string;
  rotuloAcao?: string;
  avatarSrc?: string;
  metadados?: { icone: string; rotulo: string }[];
}

export interface Plano {
  nome: string;
  preco: string;
  periodicidade: string;
  recursos: string[];
  destacado?: boolean;
  rotuloBotao: string;
}

export interface ItemLista {
  id: string | number;
  rotulo: string;
  descricao?: string;
  avatarSrc?: string;
  data?: string;
  horario?: string;
  desabilitado?: boolean;
  checked?: boolean;
}

export interface SecaoRodape {
  titulo?: string;
  links: LinkNav[];
}

export interface Postagem {
  titulo: string;
  resumo: string;
  data: string;
  autor: string;
  categoria?: string;
  imagemUrl?: string;
}

export type CorBadge =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'light'
  | 'dark';

export type VarianteBadge =
  | 'solida'
  | 'sutil'
  | 'borda'
  | 'avatar'
  | 'removivel'
  | 'avatar-removivel';

// =========================================================
// Domínio: Alunos, Frequência, Ocorrências e Risco
// =========================================================

/**
 * Nível de risco calculado a partir do acúmulo de ausências
 * e ocorrências graves. Usado pelo Termômetro de Atenção.
 */
export type NivelRisco = 'baixo' | 'medio' | 'alto';

/**
 * Período de aula (manhã, tarde, noite) ou nome específico
 * do horário (ex.: "1º Horário", "Almoço").
 */
export interface PeriodoAula {
  id: string;
  rotulo: string;
  horario?: string;
}

/**
 * Aluno com estado de frequência para a tela de Registro
 * por Exceção do professor.
 */
export interface AlunoFrequencia {
  id: string;
  nome: string;
  matricula: string;
  turma: string | null;
  /**
   * true = ausente (marcado pelo professor).
   * false = presente (padrão assumido pelo sistema).
   */
  ausente: boolean;
  /**
   * Lista de períodos em que o aluno esteve na escola mas
   * se ausentou de uma aula específica.
   */
  periodosAusentes?: string[];
}

/**
 * Aluno com contagem de ausências e ocorrências para o
 * Ranking de Priorização de Risco da gestão.
 */
export interface AlunoRisco {
  id: string;
  nome: string;
  matricula: string;
  turma: string | null;
  serie: string | null;
  totalAusencias: number;
  totalOcorrencias: number;
  nivel: NivelRisco;
  ultimaAusencia?: string;
  exigePresencaResponsavel?: boolean;
}

/**
 * Ocorrência grave ou suspensão exibida na Central de
 * Ocorrências Graves da gestão.
 */
export interface OcorrenciaGrave {
  id: string;
  alunoNome: string;
  alunoMatricula: string;
  turma: string | null;
  descricao: string;
  tipo: 'grave' | 'suspensao';
  data: string;
  professorNome?: string;
  anexoUrl?: string | null;
  anexoNome?: string;
  exigePresencaResponsavel: boolean;
  bloqueado: boolean;
}

/**
 * Justificativa enviada pelo responsável e pendente de
 * validação pela gestão.
 */
export interface JustificativaPendente {
  id: string;
  alunoNome: string;
  responsavelNome: string;
  dataAusencia: string;
  motivo: string;
  anexoUrl?: string | null;
  anexoNome?: string;
  status: 'pendente' | 'aceita' | 'recusada';
}

/**
 * Item de estatística do Painel Confidencial de Busca Ativa.
 */
export interface EstatisticaPainel {
  id: string;
  rotulo: string;
  valor: string | number;
  icone: string;
  variante: CorBadge;
  rodape?: string;
}

// =========================================================
// Domínio: Responsável (Pais)
// =========================================================

/**
 * Alerta exibido no painel do responsável.
 */
export interface AlertaResponsavel {
  id: string;
  tipo: 'ausencia_escola' | 'ausencia_aula' | 'suspensao' | 'comunicado';
  titulo: string;
  descricao: string;
  data: string;
  periodo?: string;
  urgente: boolean;
}

/**
 * Termômetro de Atenção Visual exibido para o responsável.
 */
export interface TermometroAtencao {
  nivel: NivelRisco;
  alunoNome: string;
  alunoTurma: string | null;
  totalAusencias: number;
  totalOcorrencias: number;
  mensagem: string;
}

/**
 * Mensagem do canal de diálogo com horário protegido.
 */
export interface MensagemChat {
  id: string;
  autor: 'responsavel' | 'gestao';
  nomeAutor: string;
  texto: string;
  horario: string;
  data: string;
}

/**
 * Configuração do horário protegido do canal de diálogo.
 */
export interface HorarioProtegido {
  inicio: string; // formato "HH:MM"
  fim: string; // formato "HH:MM"
  diasSemana: number[]; // 0 (Dom) a 6 (Sáb)
  mensagemForaHorario: string;
}
