export type PerfilUsuario = 'responsavel' | 'professor' | 'gestao'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
}
