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

export interface ItemSidebar {
  id: string;
  rotulo: string;
  icone: string;
  url?: string;
  ativo?: boolean;
  filhos?: ItemSidebar[];
  data?: string;
  descricao?: string;
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

export interface DropdownItem {
  rotulo: string;
  url?: string;
  dividir?: boolean;
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
