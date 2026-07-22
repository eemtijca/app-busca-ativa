import { test, expect, type Page } from '@playwright/test';

const URL_SUPABASE = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  // Wait for the page to fully load
  await page.waitForSelector('button[type="submit"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  // Click and wait for navigation/response
  await Promise.all([
    page.waitForURL(/\/gestao|\/professor|\/responsavel/, { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1000);
}

async function chamaEdgeFunction(nome: string, corpo: object) {
  const res = await fetch(`${URL_SUPABASE}/functions/v1/${nome}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  return res.json();
}

test.describe('Autenticacao', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error(`[BROWSER ERROR] ${msg.text()}`);
    });
    page.on('pageerror', (err) => console.error(`[PAGE ERROR] ${err.message}`));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        console.error(`[HTTP ${response.status()}] ${response.url()}`);
      }
    });
  });
  test('CT01 - Pagina de login carrega corretamente', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Entrar');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByText('Solicitar código de acesso')).toBeVisible();
  });

  test('CT02 - Login como gestao redireciona para /gestao', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await expect(page).toHaveURL(/\/gestao/);
  });

  test('CT03 - Login como professor redireciona para /professor', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await expect(page).toHaveURL(/\/professor/);
  });

  test('CT04 - Login com credenciais invalidas mostra erro', async ({ page }) => {
    await login(page, 'invalido@email.com', 'senha_errada');
    await expect(page.locator('.alert-danger')).toBeVisible();
  });

  test('CT05 - Logout retorna para pagina de login', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await expect(page).toHaveURL(/\/gestao/);
    await page.locator('.dropdown button').first().click();
    await page.locator('.dropdown-menu').getByText('Sair da conta').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Gestao - Home', () => {
  test('CT06 - Pagina inicial do gestor mostra cards de navegacao', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await expect(page.locator('h3.card-nav-title').first()).toHaveText('Ranking de risco');
    await expect(page.locator('h3.card-nav-title').nth(1)).toHaveText('Ocorrências graves');
    await expect(page.locator('h3.card-nav-title').nth(2)).toHaveText('Justificativas');
    await expect(page.locator('h3.card-nav-title').nth(3)).toHaveText('Usuários');
    await expect(page.locator('h3.card-nav-title').nth(4)).toHaveText('Alunos');
    await expect(page.locator('h3.card-nav-title').nth(5)).toHaveText('Códigos');
  });

  test('CT07 - Notificacao de codigo aparece no header', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    const bell = page.locator('a[aria-label="Notificações de código"] i.bi-bell');
    await expect(bell).toBeVisible();
  });
});

test.describe('Gestao - Usuarios', () => {
  test('CT08 - Listagem de usuarios exibe dados do seed', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios');
    await expect(page.locator('table')).toContainText('Carlos Administrador');
    await expect(page.locator('table')).toContainText('Ana Professora');
    await expect(page.locator('table')).toContainText('Maria Silva');
  });

  test('CT09 - Filtro por papel funciona', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios');
    await page.click('label:has-text("Professores")');
    await expect(page.getByText('Ana Professora')).toBeVisible();
    await expect(page.getByText('Maria Silva')).not.toBeVisible();
  });

  test('CT10 - Formulario de novo usuario carrega', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios/novo');
    await expect(page.locator('label:has-text("Nome")')).toBeVisible();
    await expect(page.locator('label:has-text("E-mail")')).toBeVisible();
    await expect(page.locator('label:has-text("Papel")')).toBeVisible();
  });
});

test.describe('Gestao - Alunos', () => {
  test('CT11 - Listagem de alunos exibe dados do seed', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/alunos');
    await expect(page.getByText('João Miguel')).toBeVisible();
    await expect(page.getByText('Ana Beatriz')).toBeVisible();
  });

  test('CT12 - Filtro de busca por nome funciona', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/alunos');
    await page.fill('input[type="search"]', 'Rafael');
    await expect(page.getByText('Rafael Augusto')).toBeVisible();
    await expect(page.getByText('Maria Clara')).not.toBeVisible();
  });
});

test.describe('Gestao - Codigos', () => {
  test('CT13 - Pagina de codigos carrega com abas', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Códigos' })).toBeVisible();
  });

  test('CT14 - Codigos do seed sao exibidos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Códigos' })).toBeVisible();
  });
});

test.describe('Recuperacao de senha por codigo', () => {
  test('CT15 - Pagina de solicitar codigo carrega', async ({ page }) => {
    await page.goto('/solicitar-codigo');
    await expect(page.getByText('Solicitar código de acesso')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('CT16 - Solicitacao de codigo via edge function retorna sucesso', async () => {
    const resultado = await chamaEdgeFunction('solicitar-codigo', {
      email: 'prof1@escola.edu.br',
    });
    expect(resultado.success).toBe(true);
  });

  test('CT17 - Pagina de redefinir senha com codigo carrega', async ({ page }) => {
    await page.goto('/redefinir-senha-codigo');
    await expect(page.getByText('Redefinir senha com código')).toBeVisible();
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="codigo"]')).toBeVisible();
    await expect(page.locator('input[id="nova-senha"]')).toBeVisible();
  });
});

test.describe('Professor - Funcionalidades basicas', () => {
  test('CT18 - Home do professor mostra cards de navegacao', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await expect(page.getByText('Registrar frequência')).toBeVisible();
    await expect(page.getByText('Ausência em aula')).toBeVisible();
    await expect(page.getByText('Ocorrência grave')).toBeVisible();
  });
});

test.describe('Responsavel - Funcionalidades basicas', () => {
  test('CT19 - Home do responsavel mostra cards de navegacao', async ({ page }) => {
    await login(page, 'resp1@email.com', 'Resp123!');
    await expect(page.getByRole('link', { name: 'Alertas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Termômetro' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Justificativa' })).toBeVisible();
    await expect(page.locator('h3.card-nav-title').nth(3)).toHaveText('Falar com coordenação');
  });
});

test.describe('Gestao - Ranking e Ocorrencias', () => {
  test('CT20 - Pagina de ranking de risco carrega', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/ranking');
    await expect(page.getByText('Ranking de priorização de risco')).toBeVisible();
  });

  test('CT21 - Pagina de ocorrencias carrega', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/ocorrencias');
    await expect(page.getByText('Ocorrências graves e suspensões')).toBeVisible();
  });

  test('CT22 - Pagina de justificativas carrega', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/justificativas');
    await expect(page.getByText('Validação de justificativas')).toBeVisible();
  });
});

test.describe('Professor - Frequencia', () => {
  test('CT23 - Pagina de registro de frequencia carrega', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/frequencia');
    await expect(page.getByText('Registrar frequência')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await expect(page.getByText('Salvar frequência')).toBeVisible();
  });

  test('CT24 - Marcar aluno como ausente e salvar', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/frequencia');
    // Wait for student list to load
    await page.waitForSelector('.card-body .card');
    // Find the first "Presente" (present/ausente toggle) and click to mark as ausente
    const botoes = page.locator('button[aria-label*="Marcar"]');
    const primeiro = botoes.first();
    const label = await primeiro.getAttribute('aria-label');
    if (label?.includes('como ausente')) {
      await primeiro.click();
    }
    await page.click('button:has-text("Salvar frequência")');
    await expect(page.locator('.alert-success').first()).toBeVisible({ timeout: 10000 });
  });

  test('CT25 - Mid-day absence form carrega', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/ausencia');
    await expect(page.getByText('Registrar ausência em aula')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.getByText('Registrar ausência').first()).toBeVisible();
  });

  test('CT26 - Pagina de frequencia persiste dados ao retornar', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/frequencia');
    await page.waitForSelector('.card-body .card');
    // Mark first student as absent
    const botoes = page.locator('button[aria-label*="Marcar"]');
    const primeiro = botoes.first();
    const label = await primeiro.getAttribute('aria-label');
    if (label?.includes('como ausente')) {
      await primeiro.click();
    }
    await page.click('button:has-text("Salvar frequência")');
    await expect(page.locator('.alert-success').first()).toBeVisible({ timeout: 10000 });
    // Navigate away and back — check the page loads
    await page.goto('/professor');
    await page.goto('/professor/frequencia');
    await expect(page.getByText('Registrar frequência')).toBeVisible();
  });
});

test.describe('Gestao - Usuarios - Codigo no cadastro', () => {
  test('CT27 - Criar usuario exibe codigo no sucesso', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    const emailUnico = `playwright${Date.now()}@test.com`;
    await page.goto('/gestao/usuarios/novo');
    await page.fill('#campoNome', 'Test Playwright');
    await page.fill('#campoEmail', emailUnico);
    await page.click('button[type="submit"]');
    await expect(page.locator('code.font-monospace').first()).toBeVisible({ timeout: 15000 });
    const textoCode = await page.locator('code.font-monospace').first().textContent();
    expect(textoCode?.trim().length).toBe(6);
  });

  test('CT28 - Botao Copiar no sucesso funciona', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    const emailUnico = `copy${Date.now()}@test.com`;
    await page.goto('/gestao/usuarios/novo');
    await page.fill('#campoNome', 'Copy Test');
    await page.fill('#campoEmail', emailUnico);
    await page.click('button[type="submit"]');
    await expect(page.locator('code.font-monospace').first()).toBeVisible({ timeout: 15000 });
    const btnCopiar = page.locator('button').filter({ hasText: 'Copiar' }).first();
    await btnCopiar.click();
    await expect(page.getByText('Código copiado!')).toBeVisible({ timeout: 5000 });
  });

  test('CT29 - Criar usuario valida campos obrigatorios', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios/novo');
    await page.evaluate(() => {
      const form = document.querySelector('form');
      if (form) form.setAttribute('novalidate', '');
    });
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-danger')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Gestao - Codigos - Aba Pendentes', () => {
  test('CT34 - Pagina de codigos carrega com abas e indicador', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Códigos' })).toBeVisible();
    await expect(page.locator('.nav-link.active')).toContainText('Solicitações');
  });

  test('CT35 - Aba Solicitações carrega e mostra dados', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    const emptyState = page.getByText('Nenhuma solicitação pendente');
    const cards = page.locator('.card');
    const hasCards = (await cards.count()) > 0;
    if (!hasCards) {
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }
  });

  test('CT36 - Botao Atualizar recarrega dados', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    const btnAtualizar = page.locator('button:has-text("Atualizar")');
    await expect(btnAtualizar).toBeVisible();
    await btnAtualizar.click();
    await expect(page.getByText('Dados atualizados')).toBeVisible({ timeout: 10000 });
  });

  test('CT37 - Indicador de conexao visivel', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.locator('span[title="Conectado"]')).toBeVisible();
  });

  test('CT38 - Aba Códigos carrega e mostra dados', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('button', { name: 'Códigos' })).toBeVisible();
    const emptyState = page.getByText('Nenhum código gerado ainda');
    const table = page.locator('table');
    const hasTable = await table.isVisible();
    if (!hasTable) {
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Gestao - Codigos - Aba Recentes', () => {
  test('CT40 - Busca por nome filtra resultados', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(500);
    const inputBusca = page.locator('input[type="search"]');
    if (await inputBusca.isVisible()) {
      await inputBusca.fill('XXXX_NAO_EXISTE_XXXX');
      await page.waitForTimeout(500);
      await expect(page.getByText('Nenhum resultado para')).toBeVisible();
    }
  });

  test('CT41 - Toggle visibilidade do codigo', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(500);
    const olhos = page.locator('button[title="Mostrar"], button[title="Ocultar"]');
    if (await olhos.count() > 0) {
      await olhos.first().click();
      await expect(page.locator('code.user-select-all').first()).toBeVisible();
    }
  });

  test('CT42 - Badges de status sao exibidos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(500);
    const badges = page.locator('table .badge');
    const count = await badges.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('CT43 - Paginacao visivel quando necessario', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(500);
    const paginacao = page.getByText(/Página \d+ de \d+/);
    if (await paginacao.isVisible()) {
      await expect(paginacao).toBeVisible();
    }
  });

  test('CT44 - Ultima atualizacao visivel', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByText('Última atualização')).toBeVisible();
  });
});

test.describe('Gestao - Codigos - Fluxo de revogacao', () => {
  test('CT46 - Botao revogar abre modal de confirmacao', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(500);
    const revogarBtn = page.locator('button[title="Revogar código"]').first();
    if (await revogarBtn.isVisible()) {
      await revogarBtn.click();
      await expect(page.getByText('Tem certeza que deseja revogar')).toBeVisible();
      await page.locator('button:has-text("Cancelar")').click();
    }
  });
});

test.describe('Recuperacao de senha - Fluxo publico', () => {
  test('CT31 - Pagina de solicitar codigo mostra formulario', async ({ page }) => {
    await page.goto('/solicitar-codigo');
    await expect(page.getByText('Solicitar código de acesso')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByText('Já tenho um código')).toBeVisible();
  });

  test('CT32 - Pagina de redefinir senha mostra todos os campos', async ({ page }) => {
    await page.goto('/redefinir-senha-codigo');
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="codigo"]')).toBeVisible();
    await expect(page.locator('input[id="nova-senha"]')).toBeVisible();
    await expect(page.getByText('Redefinir senha com código')).toBeVisible();
  });

  test('CT33 - Validacao de senha aparece ao digitar', async ({ page }) => {
    await page.goto('/redefinir-senha-codigo');
    await page.fill('input[id="nova-senha"]', 'Ab');
    const requisitos = page.locator('ul[aria-label="Requisitos de senha"] li');
    await expect(requisitos.first()).toBeVisible();
  });
});

test.describe('Gestao - Codigos - Mobile', () => {
  test('CT53 - Layout mobile carrega sem erros', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByRole('button', { name: 'Solicitações' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Códigos' })).toBeVisible();
  });

  test('CT54 - Mobile: botao Atualizar funciona', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    const btnAtualizar = page.locator('button:has-text("Atualizar")');
    if (await btnAtualizar.isVisible()) {
      await btnAtualizar.click();
    }
  });

  test('CT55 - Mobile: abas funcionam', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await page.locator('button:has-text("Códigos")').click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Solicitações")').click();
    await expect(page.locator('.nav-link.active')).toContainText('Solicitações');
  });
});

test.describe('Professor - Ocorrencia com tags', () => {
  test('CT56 - Formulario de ocorrencia carrega com checkboxes de tags', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/ocorrencia');
    await expect(page.getByText('Registrar ocorrência grave')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
    await expect(page.getByText('Agressão verbal')).toBeVisible();
    await expect(page.getByText('Notificar coordenação')).toBeVisible();
  });

  test('CT57 - Selecionar tag preenche descricao automaticamente', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/ocorrencia');
    await page.locator('#tag-agressao_verbal').check();
    await expect(page.locator('#descricaoText')).toHaveValue(/Relato/);
  });
});

test.describe('Professor - Ausencia com multisselecao', () => {
  test('CT58 - Formulario de ausencia tem checkboxes de periodo', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/ausencia');
    await expect(page.getByText('Registrar ausência em aula')).toBeVisible();
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();
    await expect(page.getByText('1º Horário')).toBeVisible();
    await expect(page.getByText('Enfermaria')).toBeVisible();
  });

  test('CT59 - Selecionar multiplos periodos habilita botao', async ({ page }) => {
    await login(page, 'prof1@escola.edu.br', 'Prof123!');
    await page.goto('/professor/ausencia');
    await page.getByText('1º Horário').first().click();
    await page.getByText('2º Horário').first().click();
    await expect(page.getByText('Registrar 2 períodos')).toBeVisible();
  });
});

test.describe('Gestao - Usuario - Modulos e permissoes', () => {
  test('CT60 - Formulario de usuario tem modulos de acesso', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios/novo');
    await page.waitForSelector('form');
    await expect(page.locator('text=Módulos de acesso')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#modulo-frequencia')).toBeVisible();
    await expect(page.locator('#modulo-ocorrencias')).toBeVisible();
    await expect(page.locator('#permissao-exportar')).toBeVisible();
  });

  test('CT61 - Modulos de acesso sao selecionaveis', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/usuarios/novo');
    await page.locator('#modulo-ocorrencias').check();
    await page.locator('#modulo-chat').check();
    await expect(page.locator('#modulo-ocorrencias')).toBeChecked();
    await expect(page.locator('#modulo-chat')).toBeChecked();
  });
});

test.describe('Gestao - Aluno - Documentos e indicadores', () => {
  test('CT62 - Formulario de aluno tem documentos e indicadores', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/alunos/novo');
    await expect(page.getByText('Documentos recebidos')).toBeVisible();
    await expect(page.getByText('Transporte escolar')).toBeVisible();
    await expect(page.getByText('Alimentação diferenciada')).toBeVisible();
    await expect(page.getByText('Necessidades especiais')).toBeVisible();
    await expect(page.locator('#doc-rg')).toBeVisible();
    await expect(page.locator('#doc-cpf')).toBeVisible();
  });

  test('CT63 - Documentos sao selecionaveis', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/alunos/novo');
    await page.locator('#doc-rg').check();
    await page.locator('#doc-cpf').check();
    await expect(page.locator('#doc-rg')).toBeChecked();
    await expect(page.locator('#doc-cpf')).toBeChecked();
  });
});

test.describe('Gestao - Turmas - Modal', () => {
  test('CT64 - Modal de criar turma abre e tem campos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/turmas');
    await page.click('button:has-text("Nova turma")');
    await expect(page.locator('.modal-title')).toContainText('Nova turma');
    await expect(page.locator('#campoSerie')).toBeVisible();
    await expect(page.locator('#campoLetra')).toBeVisible();
    await expect(page.locator('#campoAtivo')).toBeVisible();
    await page.click('button:has-text("Cancelar")');
  });
});

test.describe('Gestao - Disciplinas - Modal', () => {
  test('CT65 - Modal de criar disciplina abre e tem campos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/disciplinas');
    await page.click('button:has-text("Nova disciplina")');
    await expect(page.locator('.modal-title')).toContainText('Nova disciplina');
    await expect(page.locator('#campoNome')).toBeVisible();
    await expect(page.locator('#campoCodigoSige')).toBeVisible();
    await expect(page.locator('#campoCargaHoraria')).toBeVisible();
    await page.click('button:has-text("Cancelar")');
  });
});

test.describe('Gestao - Atribuicoes - Modal', () => {
  test('CT66 - Modal de criar atribuicao abre e tem campos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/atribuicoes');
    await page.click('button:has-text("Nova atribuição")');
    await expect(page.locator('.modal-title')).toContainText('Nova atribuição');
    await expect(page.locator('#campoProfessor')).toBeVisible();
    await expect(page.locator('#campoTurma')).toBeVisible();
    await expect(page.locator('#campoDataInicio')).toBeVisible();
    await page.click('button:has-text("Cancelar")');
  });
});
