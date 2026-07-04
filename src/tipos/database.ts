export type PapelUsuario = 'professor' | 'gestao' | 'responsavel'

export type PerfilUsuario = PapelUsuario

export type StatusFrequencia = 'presente' | 'ausente'

export type TipoOcorrencia = 'grave' | 'suspensao'

export type StatusJustificativa = 'pendente' | 'aceita' | 'recusada'

export interface Perfil {
  id: string
  nome: string
  papel: PapelUsuario
  email: string | null
  telefone: string | null
  created_at: string
}

export interface Aluno {
  id: string
  nome: string
  matricula: string
  turma: string | null
  serie: string | null
  created_at: string
}

export interface VinculoResponsavel {
  id: string
  responsavel_id: string
  aluno_id: string
  created_at: string
}

export interface Frequencia {
  id: string
  aluno_id: string
  professor_id: string
  data_aula: string
  periodo: string
  status: StatusFrequencia
  justificativa: string | null
  anexo_url: string | null
  created_at: string
}

export interface Ocorrencia {
  id: string
  aluno_id: string
  professor_id: string
  descricao: string
  tipo: TipoOcorrencia
  status_justificativa: StatusJustificativa
  anexo_url: string | null
  exige_presenca_responsavel: boolean
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      perfis: {
        Row: Perfil
        Insert: Omit<Perfil, 'created_at'>
        Update: Partial<Omit<Perfil, 'id'>>
      }
      alunos: {
        Row: Aluno
        Insert: Omit<Aluno, 'id' | 'created_at'>
        Update: Partial<Omit<Aluno, 'id'>>
      }
      vinculos_responsaveis: {
        Row: VinculoResponsavel
        Insert: Omit<VinculoResponsavel, 'id' | 'created_at'>
        Update: Partial<Omit<VinculoResponsavel, 'id'>>
      }
      frequencias: {
        Row: Frequencia
        Insert: Omit<Frequencia, 'id' | 'created_at'>
        Update: Partial<Omit<Frequencia, 'id'>>
      }
      ocorrencias: {
        Row: Ocorrencia
        Insert: Omit<Ocorrencia, 'id' | 'created_at'>
        Update: Partial<Omit<Ocorrencia, 'id'>>
      }
    }
  }
}
