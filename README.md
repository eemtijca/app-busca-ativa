# BuscApp

Repositório inicial da aplicação de comunicação em tempo real entre escola e família, concebida para o combate à evasão escolar no Ensino Médio de Tempo Integral. Projeto em fase inicial de desenvolvimento.

## Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Status do Projeto](#status-do-projeto)
- [Arquitetura](#arquitetura)
- [Proposta de Valor](#proposta-de-valor)
- [Funcionalidades Previstas](#funcionalidades-previstas)
- [Tecnologias Definidas](#tecnologias-definidas)
- [Como Executar o Projeto](#como-executar-o-projeto)
- [Contribuição e Fluxo de Trabalho](#contribuição-e-fluxo-de-trabalho)
- [Equipe](#equipe)
- [Licença](#licença)

## Sobre o Projeto

O BuscApp é uma proposta de solução tecnológica desenhada para automatizar e acelerar o fluxo de informações sobre a frequência e o comportamento dos estudantes. O objetivo principal da plataforma, uma vez finalizada, será permitir que a escola realize intervenções pedagógicas e de acolhimento de forma ágil, evitando o abandono escolar e fortalecendo o elo de responsabilidade entre a instituição e a família.

## Status do Projeto

Infraestrutura de banco de dados, autenticação e proteção de rotas concluída. O projeto possui modelo de dados no PostgreSQL (gerenciado via Supabase) com cinco tabelas, políticas de segurança RLS por perfil, composable de autenticação, guardas de rota com RBAC, e barra de acessibilidade global (TTS, alto contraste e ajuste de fonte).

## Arquitetura

```
src/
├── componentes/            # Componentes compartilhados (futuro)
├── composables/            # Lógica de apresentação reutilizável
│   ├── useAcessibilidade.ts
│   └── useAutenticacao.ts
├── layouts/                # Layouts da aplicação
│   └── LayoutPrincipal.vue
├── paginas/                # Páginas/views da aplicação
│   ├── LoginView.vue
│   ├── ProfessorHomeView.vue
│   ├── GestaoHomeView.vue
│   └── ResponsavelHomeView.vue
├── rotas/                  # Configuração de roteamento
│   └── index.ts
├── servicos/               # Integrações externas
│   └── supabase.ts
├── tipos/                  # Interfaces e tipos do domínio
│   ├── database.ts
│   └── index.ts
├── App.vue
└── main.ts

supabase/
├── config.toml             # Configuração local do Supabase
└── migrations/
    └── 0001_schema_inicial.sql  # Schema do banco + RLS
```

### Funcionalidades implementadas

- **Text-to-Speech (TTS):** Leitura do conteúdo da tela utilizando a Web Speech API (`window.speechSynthesis`) com idioma pt-BR.
- **Alto Contraste:** Alternância do atributo `data-bs-theme` no elemento `<html>` para escurecer a interface (mecanismo nativo do Bootstrap 5.3+).
- **Ajuste de Fonte:** Aumento e diminuição do tamanho base da fonte no `<html>` (escala em rem), com limites entre 14px e 24px.
- **Modelo de Dados:** Cinco tabelas no PostgreSQL (`perfis`, `alunos`, `vinculos_responsaveis`, `frequencias`, `ocorrencias`) com gatilho automático de criação de perfil via `auth.users`.
- **Row Level Security (RLS):** Políticas de segurança por linha em todas as tabelas — cada perfil (professor, gestão, responsável) enxerga apenas os dados que lhe compete.
- **Autenticação:** Composable `useAutenticacao.ts` com funções de login, logout, verificação de sessão e carregamento de perfil via Supabase Auth.
- **Proteção de Rotas:** Guardas de navegação no Vue Router que redirecionam usuários não autenticados para o login e aplicam RBAC — cada perfil só acessa suas rotas permitidas, com redirecionamento automático pós-login.

## Proposta de Valor

- **O que será o sistema:** Um ecossistema de comunicação em tempo real, com acesso restrito e exclusivo para pais e gestão escolar, focado 100% no combate à evasão escolar.
- **O problema que buscará resolver:** Substituir o modelo lento de avisos em papel e reuniões tardias por notificações imediatas. Se o aluno não comparecer ou enfrentar um problema crítico, a intenção é que a família descubra no mesmo dia, permitindo agir antes que o estudante desanime ou reprove.
- **Autoridade e Segurança:** O aplicativo blindará as informações. Os estudantes nunca terão acesso às telas, garantindo que o controle total e a autonomia fiquem estritamente nas mãos dos adultos responsáveis.

## Funcionalidades Previstas

### Recursos para os Professores
- **Registro de Frequência por Exceção:** O professor não perderá tempo fazendo a chamada completa. O sistema assumirá que todos estão presentes; o docente gastará apenas poucos segundos para marcar quem faltou.
- **Controle de Ausência na Aula:** Permitirá registrar quando o estudante entrou na escola pela manhã, mas se ausentou de uma aula específica ao longo do dia.
- **Foco Restrito no Comportamento Extremo:** O aplicativo removerá o monitoramento de pequenas indisciplinas diárias para evitar perseguições. O professor só poderá registrar ocorrências de comportamento extremo que realmente ameacem a permanência do aluno na escola.

### Recursos para os Admins (Direção e Coordenação)
- **Painel Confidencial de Monitoramento:** Tela centralizada para monitorar a frequência geral da escola e identificar desvios imediatamente.
- **Ranking de Priorização de Risco:** Um painel interno e estritamente secreto que organizará os estudantes em uma lista, do caso mais crítico ao mais leve, com base no acúmulo de ausências, apontando quem precisa de um contato urgente da equipe de monitoramento.
- **Central de Ocorrências Graves e Suspensões:** Espaço para formalizar avisos prévios ou termos de suspensão, permitindo anexar o documento oficial digitalizado direto no sistema.
- **Bloqueio de Retorno (Presença do Responsável):** Mecanismo que sinalizará no sistema que, após uma ocorrência grave, o estudante só poderá retornar às aulas presenciais mediante o comparecimento físico do seu responsável na escola.
- **Validação de Justificativas:** Área para analisar, aceitar ou recusar os atestados e justificativas enviados digitalmente pelos pais.

### Recursos para os Pais e Responsáveis
- **Alerta de Ausência da Escola:** Notificação imediata logo no início do turno caso o estudante não cruze o portão de entrada da instituição.
- **Alerta de Ausência na Aula:** Aviso ou resumo diário informando se o jovem estava na escola, mas deixou de assistir a algum período específico de aula.
- **Termômetro de Atenção Visual:** Um indicador simples por cores (verde, amarelo e vermelho) que mostrará ao pai o acúmulo de riscos do filho de forma clara, sem termos complicados.
- **Sistema de Anexo para Justificativas:** Opção para o responsável tirar foto de um atestado médico ou comprovante e enviar diretamente para a secretaria pelo celular.
- **Aviso de Presença Obrigatória:** Alerta claro na tela do pai informando sobre a suspensão ou ocorrência grave e notificando a necessidade de sua ida presencial à escola para liberar o retorno do estudante.
- **Canal de Diálogo com Horário Protegido:** Um chat direto com a coordenação que se desativará automaticamente fora do horário escolar, protegendo o descanso dos educadores e mantendo a conversa oficial e profissional.
- **Acessibilidade e Simplicidade:** Telas limpas, com letras grandes, botões objetivos e comandos fáceis, desenhados sob medida para responsáveis que possuem pouca familiaridade com celulares ou dados limitados de internet.

## Tecnologias Definidas

Este projeto está sendo arquitetado com foco em agilidade, escalabilidade e manutenibilidade, e utilizará o seguinte stack tecnológico:

- **Vue.js 3:** Framework JavaScript reativo e progressivo para a construção da interface do usuário baseada em componentes.
- **TypeScript:** Tipagem estática para reduzir erros de compilação e facilitar a manutenção do código.
- **Bootstrap 5:** Framework CSS para criação rápida de interfaces limpas e totalmente responsivas.
- **Vue Router:** Gerenciador de rotas para navegação entre os painéis (Professor, Admin e Responsável) no modelo Single Page Application (SPA).
- **Supabase:** Plataforma Backend-as-a-Service (BaaS) responsável pelo banco de dados PostgreSQL, autenticação segura e comunicação em tempo real.
- **GitHub Codespaces & Live Share:** Ambientes de desenvolvimento colaborativo na nuvem que serão utilizados pelos estudantes.

## Como Executar o Projeto

### Pré-requisitos
Certifique-se de ter o [Node.js](https://nodejs.org/) instalado em seu ambiente local.

### Passos para Instalação

1. Clone este repositório:
```bash
git clone https://github.com/eemtijca/buscapp.git
```

2. Acesse a pasta raiz do projeto:

```bash
cd buscapp
```

3. Instale todas as dependências:

```bash
npm install
```

4. Configure as variáveis de ambiente. Crie um arquivo `.env` na raiz do projeto e adicione as chaves do seu projeto no Supabase:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publicavel_do_supabase
```

5. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

6. Acesse a aplicação através do link gerado no terminal (geralmente `http://localhost:5173`).

## Contribuição e Fluxo de Trabalho

As regras de proteção já estão ativas a partir deste primeiro commit. A branch `main` deste repositório é protegida e não aceita envios (pushes) diretos. Todo o desenvolvimento feito pela equipe deverá seguir rigorosamente o fluxo de Pull Requests:

1. Crie uma branch específica para a sua tarefa a partir da `main` (exemplo: `git checkout -b feature/nome-da-feature`).
2. Realize as alterações e faça os commits detalhando o que foi feito.
3. Envie a branch para o repositório remoto (`git push origin feature/nome-da-feature`).
4. Abra um Pull Request e aguarde a revisão (Code Review) obrigatória da engenharia de software do repositório. O merge só ocorrerá após a aprovação explícita.

## Equipe

Projeto em concepção e desenvolvimento colaborativo por estudantes e educadores da unidade escolar.

**Desenvolvimento:**

- Kaique da Silva Linhares
- Jonathas Oliveira Sousa
- Francisco Hercules Alves Freire

**Mentoria e Orientação:**

- Josué Cavalcante (Orientador)
- Emanuel Lázaro (Coorientador / Engenheiro de Software)

## Licença

Este projeto será desenvolvido sob licença MIT para fomentar a tecnologia educacional pública. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.
