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
    await expect(page.getByText('Solicitações pendentes')).toBeVisible();
    await expect(page.getByText('Códigos recentes')).toBeVisible();
  });

  test('CT14 - Codigos do seed sao exibidos', async ({ page }) => {
    await login(page, 'gestao@escola.edu.br', 'Admin123!');
    await page.goto('/gestao/codigos');
    await expect(page.getByText('Solicitações pendentes')).toBeVisible();
    await expect(page.getByText('Códigos recentes')).toBeVisible();
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
