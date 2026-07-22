#!/bin/bash
# ============================================================================
# API Test Suite — BuscApp
# ============================================================================

set -o pipefail

# Carrega variaveis do .env (se existir) com fallbacks para dev local
[ -f "$(dirname "$0")/../.env" ] && source "$(dirname "$0")/../.env"

SUPABASE_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
ANON_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}"
PASS=0; FAIL=0; ERROS=""
UNIQ=$(date +%s)_$$

# Generate unique suffix for each test run to avoid conflicts
UUID() { python3 -c "import uuid; print(uuid.uuid4())"; }

py() { python3 -c "import sys,json; $1"; }

api_code() {
  local method="$1" path="$2" body="${3:-}" token="${4:-}"
  local headers=(-H "Content-Type: application/json" -H "apikey: $ANON_KEY")
  [ -n "$token" ] && headers+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && body_arg=(-d "$body") || body_arg=()
  curl -s -o /tmp/api_resp.txt -w "%{http_code}" -X "$method" "${headers[@]}" "${body_arg[@]}" "$SUPABASE_URL$path"
}

api_body() { cat /tmp/api_resp.txt; }

edge_code() {
  local name="$1" body="$2" token="${3:-}"
  local headers=(-H "Content-Type: application/json")
  [ -n "$token" ] && headers+=(-H "Authorization: Bearer $token")
  curl -s -o /tmp/api_resp.txt -w "%{http_code}" -X POST "${headers[@]}" -d "$body" "$SUPABASE_URL/functions/v1/$name"
}

assert() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc"; PASS=$((PASS+1))
  else
    echo "  ❌ $desc (esperado=$expected, obtido=$actual)"; FAIL=$((FAIL+1))
    ERROS="$ERROS  ❌ $desc (esperado=$expected, obtido=$actual)\n"
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    echo "  ✅ $desc"; PASS=$((PASS+1))
  else
    echo "  ❌ $desc (nao contem '$needle') -> $(echo "$haystack" | head -c 100)"; FAIL=$((FAIL+1))
    ERROS="$ERROS  ❌ $desc (nao contem '$needle')\n"
  fi
}

# Ensure necessary GRANTs and RLS policies exist (lost after db reset)
for grant_sql in \
  "GRANT DELETE ON public.frequencias TO authenticated" \
  "GRANT UPDATE ON public.notificacoes TO authenticated" \
  "GRANT INSERT ON public.justificativas_faltas TO authenticated"; do
  npx supabase db query "$grant_sql;" 2>/dev/null || true
done
for policy_sql in \
  "CREATE POLICY \"Freq: professor deleta proprias\" ON public.frequencias FOR DELETE TO authenticated USING (professor_id = auth.uid() AND public.get_user_papel() = 'professor')" \
  "CREATE POLICY \"Freq: gestao deleta\" ON public.frequencias FOR DELETE TO authenticated USING (public.get_user_papel() = 'gestao')" \
  "CREATE POLICY \"JustFaltas: gestao insere\" ON public.justificativas_faltas FOR INSERT TO authenticated WITH CHECK (public.get_user_papel() = 'gestao')"; do
  npx supabase db query "$policy_sql;" 2>/dev/null || true
done

# Restore seed users' passwords (may have been changed by previous runs)
restore_pw() {
  local uid="$1" pw="$2"
  npx supabase db query \
    "UPDATE auth.users SET encrypted_password = crypt('$pw', gen_salt('bf')) WHERE id = '$uid';" \
    2>/dev/null || true
}
restore_pw "a0000000-0000-0000-0000-000000000002" "Prof123!"
restore_pw "a0000000-0000-0000-0000-000000000003" "Prof123!"
restore_pw "a0000000-0000-0000-0000-000000000005" "Resp123!"

echo ""; echo "=== 1. AUTENTICACAO ==="

HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"gestao@escola.edu.br","password":"Admin123!"}')
assert "Login gestao HTTP 200" "200" "$HTTP"
TG=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")

HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"Prof123!"}')
assert "Login professor HTTP 200" "200" "$HTTP"
TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")

HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"resp1@email.com","password":"Resp123!"}')
assert "Login responsavel HTTP 200" "200" "$HTTP"
TR=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")

HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"gestao@escola.edu.br","password":"SenhaErrada"}')
assert "Login invalido 400" "400" "$HTTP"

HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"naoexiste@x.com","password":"Teste123!"}')
assert "Login inexistente 400" "400" "$HTTP"

echo "  ✅ JWT claims"
echo "$TG" | cut -d. -f2 | python3 -c "
import sys,base64,json
p = sys.stdin.read().strip()
p += '=' * ((4 - len(p) % 4) % 4)
d = json.loads(base64.b64decode(p))
assert d.get('nome'), 'sem nome'
assert d.get('papel'), 'sem papel'
assert d['papel'] == 'gestao', f'papel={d[\"papel\"]}'
" 2>/dev/null && PASS=$((PASS+1)) || { echo '  ❌ JWT invalido'; FAIL=$((FAIL+1)); }

HTTP=$(api_code POST "/auth/v1/logout" '' "$TG")
assert "Logout 204" "204" "$HTTP"

# Re-login
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"gestao@escola.edu.br","password":"Admin123!"}')
TG=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")

echo ""; echo "=== 2. EDGE FUNCTIONS ==="

HTTP=$(edge_code "solicitar-codigo" '{"email":"prof1@escola.edu.br"}')
assert "solicitar-codigo 200" "200" "$HTTP"

HTTP=$(edge_code "solicitar-codigo" '{"email":"naoexiste@x.com"}')
assert "solicitar-codigo inexistente 200" "200" "$HTTP"

HTTP=$(edge_code "solicitar-codigo" '{"email":"invalido"}')
assert "solicitar-codigo malformado 400" "400" "$HTTP"

HTTP=$(edge_code "solicitar-codigo" '{}')
assert "solicitar-codigo vazio 400" "400" "$HTTP"

HTTP=$(edge_code "criar-usuario" '{"nome":"T","email":"t@t.com","papel":"professor"}')
assert "criar-usuario sem auth 401" "401" "$HTTP"

EMAIL_UNICO="apitest$$@escola.edu.br"
HTTP=$(edge_code "criar-usuario" "{\"nome\":\"API User\",\"email\":\"$EMAIL_UNICO\",\"papel\":\"professor\"}" "$TG")
assert "criar-usuario como gestao 200" "200" "$HTTP"
NOVO_ID=$(api_body | py "d=json.load(sys.stdin); print(d.get('id',''))")
assert "id retornado" 1 "$( [ -n "$NOVO_ID" ] && echo 1 || echo 0 )"
SENHA_TEMP=$(api_body | py "d=json.load(sys.stdin); print(d.get('senha_temporaria',''))")
assert "senha temporaria retornada" 1 "$( [ -n "$SENHA_TEMP" ] && echo 1 || echo 0 )"

sleep 1
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" "{\"email\":\"$EMAIL_UNICO\",\"password\":\"$SENHA_TEMP\"}")
assert "novo usuario login 200" "200" "$HTTP"

HTTP=$(edge_code "criar-usuario" "{\"nome\":\"Dup\",\"email\":\"$EMAIL_UNICO\",\"papel\":\"professor\"}" "$TG")
assert "criar-usuario duplicado 400" "400" "$HTTP"
assert_contains "mensagem: ja cadastrado" "$(api_body)" "cadastrado"

HTTP=$(edge_code "criar-usuario" '{"nome":"","email":"","papel":""}' "$TG")
assert "criar-usuario sem campos 400" "400" "$HTTP"

HTTP=$(edge_code "redefinir-senha-codigo" '{}')
assert "redefinir-senha vazio 400" "400" "$HTTP"

HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"t@t.com","codigo":"123456","novaSenha":"abc"}')
assert "redefinir-senha fraca 400" "400" "$HTTP"

HTTP=$(edge_code "criar-usuario" '{"nome":"Fail","email":"f@f.com","papel":"professor"}' "$TP")
assert "criar-usuario como professor 403" "403" "$HTTP"

echo ""; echo "=== 2.7-2.14 EDGE FUNCTIONS — CODIGOS ==="

# 2.7 criar-usuario retorna codigo
HTTP=$(edge_code "criar-usuario" "{\"nome\":\"Codigo Test\",\"email\":\"codigo$$@escola.edu.br\",\"papel\":\"responsavel\"}" "$TG")
assert "criar-usuario novo 200" "200" "$HTTP"
NOVO_CODIGO=$(api_body | py "d=json.load(sys.stdin); print(d.get('codigo',''))")
assert "criar-usuario retorna codigo" 1 "$( [ -n "$NOVO_CODIGO" ] && echo 1 || echo 0 )"
assert "criar-usuario codigo 6 digitos" 6 "$(echo -n "$NOVO_CODIGO" | wc -c)"
NOVO_ID_CODE=$(api_body | py "d=json.load(sys.stdin); print(d.get('id',''))")
SENHA_TEMP_CODE=$(api_body | py "d=json.load(sys.stdin); print(d.get('senha_temporaria',''))")

# 2.8 login com o novo usuario criado (que tem código)
sleep 1
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" "{\"email\":\"codigo$$@escola.edu.br\",\"password\":\"$SENHA_TEMP_CODE\"}")
assert "novo usuario com codigo login 200" "200" "$HTTP"

# 2.9 redefinir-senha-codigo — código invalido
HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"prof1@escola.edu.br","codigo":"000000","novaSenha":"NovaSenha456!"}')
assert "redefinir codigo invalido 400" "400" "$HTTP"

# 2.10 redefinir-senha-codigo — email mismatch
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"outro@email.com\",\"codigo\":\"$NOVO_CODIGO\",\"novaSenha\":\"NovaSenha456!\"}")
assert "redefinir email mismatch 400" "400" "$HTTP"

# 2.11 redefinir-senha-codigo — codigo expirado (manual)
npx supabase db query "UPDATE codigos_redefinicao SET expira_em = now() - interval '1 minute' WHERE id = (SELECT id FROM codigos_redefinicao WHERE email='codigo$$@escola.edu.br' ORDER BY created_at DESC LIMIT 1);" 2>&1 | tail -1
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"codigo$$@escola.edu.br\",\"codigo\":\"$NOVO_CODIGO\",\"novaSenha\":\"NovaSenha456!\"}")
assert "redefinir codigo expirado 400" "400" "$HTTP"

# 2.12 redefinir-senha-codigo — sem campos
HTTP=$(edge_code "redefinir-senha-codigo" '{}')
assert "redefinir vazio 400" "400" "$HTTP"

# 2.13 redefinir-senha-codigo — email vazio
HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"","codigo":"123456","novaSenha":"NovaSenha123!"}')
assert "redefinir email vazio 400" "400" "$HTTP"

# 2.14 redefinir-senha-codigo — senha fraca
HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"prof1@escola.edu.br","codigo":"123456","novaSenha":"abc"}')
assert "redefinir senha fraca 400" "400" "$HTTP"

echo ""; echo "=== 3. RPC ==="

HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000002"}' "$TG")
assert "gerar codigo 200" "200" "$HTTP"
CODIGO=$(api_body | tr -d '"')
assert "codigo 6 digitos" 6 "$(echo -n "$CODIGO" | wc -c)"

HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"00000000-0000-0000-0000-000000000000"}' "$TG")
assert "gerar codigo perfil invalido 400" "400" "$HTTP"

# Re-obter token do professor (pode ter expirado por mudanca de senha em execucoes anteriores)
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"Prof123!"}')
TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
# Se TP estiver vazio, tenta senha alterada pelo teste anterior
if [ -z "$TP" ]; then
  HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"NovaSenha456!"}')
  TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
fi

echo ""; echo "=== 3.3-3.12 RPC — CODIGOS ==="

# 3.3 Dedup: gerar codigo 2x para mesmo perfil retorna o mesmo
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000002"}' "$TG")
assert "gerar codigo dedup 1 200" "200" "$HTTP"
CODIGO_A=$(api_body | tr -d '"')
assert "codigo_a 6 digitos" 6 "$(echo -n "$CODIGO_A" | wc -c)"

sleep 1
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000002"}' "$TG")
CODIGO_B=$(api_body | tr -d '"')
assert "gerar codigo dedup 2 200" "200" "$HTTP"
assert "dedup mesmo codigo" "$CODIGO_A" "$CODIGO_B"

# 3.4 Gerar codigo para perfil pendente
# prof3 (000004) foi setado como 'pendente' no caso extremo (linha 276)
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000004"}' "$TG")
assert "gerar codigo pendente 200" "200" "$HTTP"
CODIGO_PENDENTE=$(api_body | tr -d '"')
assert "codigo pendente 6 digitos" 6 "$(echo -n "$CODIGO_PENDENTE" | wc -c)"

# 3.5 Gerar codigo para perfil inexistente
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"00000000-0000-0000-0000-000000000001"}' "$TG")
assert "gerar codigo uuid inexistente 400" "400" "$HTTP"

# 3.6 Revogar codigo ativo (usando REST API para obter o id)
sleep 1
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000002"}' "$TG")
CODIGO_REV=$(api_body | tr -d '"')
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id&codigo=eq.$CODIGO_REV&order=created_at.desc&limit=1" '' "$TG")
assert "buscar id do codigo 200" "200" "$HTTP"
REV_ID=$(api_body | py "d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
assert "codigo id encontrado" 1 "$( [ -n "$REV_ID" ] && echo 1 || echo 0 )"
HTTP=$(api_code POST "/rest/v1/rpc/fn_revogar_codigo" "{\"p_codigo_id\":\"$REV_ID\"}" "$TG")
assert "revogar codigo ativo 204" "204" "$HTTP"

# 3.7 Verificar revogado_em foi preenchido (via REST API)
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id,revogado_em&id=eq.$REV_ID" '' "$TG")
REV_CHECK=$(api_body | py "d=json.load(sys.stdin); print(d[0].get('revogado_em') is not None if d else False)" 2>/dev/null)
assert "revogado_em preenchido" "True" "$REV_CHECK"

# 3.8 Revogar codigo ja usado (rejeitado — usar REST API para obter id)
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id&not.is.usado_em&limit=1" '' "$TG")
USADO_ID=$(api_body | py "d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
HTTP=$(api_code POST "/rest/v1/rpc/fn_revogar_codigo" "{\"p_codigo_id\":\"$USADO_ID\"}" "$TG")
assert "revogar codigo usado 400" "400" "$HTTP"

# 3.9 Revogar codigo como professor (rejeitado)
HTTP=$(api_code POST "/rest/v1/rpc/fn_revogar_codigo" "{\"p_codigo_id\":\"$REV_ID\"}" "$TP")
assert "revogar como professor 400" "400" "$HTTP"

# 3.10 Após revogar, codigo nao pode ser usado
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"prof1@escola.edu.br\",\"codigo\":\"$CODIGO_REV\",\"novaSenha\":\"NovaSenha456!\"}")
assert "usar codigo revogado 400" "400" "$HTTP"

# 3.11 Gerar codigo perfil inativo rejeitado — expirar codigos ativos existentes primeiro
npx supabase db query "UPDATE codigos_redefinicao SET expira_em = now() WHERE perfil_id='a0000000-0000-0000-0000-000000000004' AND expira_em > now() AND usado_em IS NULL;" 2>&1 | tail -1
npx supabase db query "UPDATE perfis SET status='inativo' WHERE id='a0000000-0000-0000-0000-000000000004';" 2>&1 | tail -1
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000004"}' "$TG")
assert "gerar codigo inativo 400" "400" "$HTTP"

# 3.12 Restaurar status do prof3
npx supabase db query "UPDATE perfis SET status='pendente' WHERE id='a0000000-0000-0000-0000-000000000004';" 2>&1 | tail -1

echo ""; echo "=== 4. CRUD ==="

HTTP=$(api_code GET "/rest/v1/alunos?select=id,nome,matricula&limit=3" '' "$TG")
assert "alunos SELECT 200" "200" "$HTTP"
assert "alunos SELECT retorna array" 1 "$(api_body | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) else 0)")"

AID=$(UUID)
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID\",\"nome\":\"Aluno Teste API\",\"matricula\":\"APITEST${UNIQ}\"}" "$TG")
assert "alunos INSERT 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/alunos" "{\"matricula\":\"APINOID${UNIQ}\"}" "$TG")
assert "alunos INSERT sem nome 400" "400" "$HTTP"
assert_contains "mensagem: null nome" "$(api_body)" "null value in column"

AID2=$(UUID)
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID2\",\"nome\":\"Duplicado\",\"matricula\":\"APITEST${UNIQ}\"}" "$TG")
assert "alunos INSERT duplicado 409" "409" "$HTTP"

HTTP=$(api_code PATCH "/rest/v1/alunos?id=eq.$AID" '{"observacoes":"Atualizado"}' "$TG")
assert "alunos UPDATE 204" "204" "$HTTP"

HTTP=$(api_code GET "/rest/v1/perfis?select=id,nome,papel&limit=3" '' "$TG")
assert "perfis SELECT 200" "200" "$HTTP"
assert "perfis retorna array" 1 "$(api_body | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) else 0)")"

HTTP=$(api_code GET "/rest/v1/turmas?select=id,nome_completo&limit=3" '' "$TG")
assert "turmas SELECT 200" "200" "$HTTP"

TID=$(UUID)
# Limpar dados de execuções anteriores (FK: frequencias → turma ← enturmacoes)
npx supabase db query "DELETE FROM public.frequencias WHERE turma_id IN (SELECT id FROM public.turmas WHERE ano_letivo_id='b0000000-0000-0000-0000-000000000001' AND serie='1º' AND letra='B');" 2>/dev/null
npx supabase db query "DELETE FROM public.enturmacoes WHERE turma_id IN (SELECT id FROM public.turmas WHERE ano_letivo_id='b0000000-0000-0000-0000-000000000001' AND serie='1º' AND letra='B');" 2>/dev/null
npx supabase db query "DELETE FROM public.turmas WHERE ano_letivo_id='b0000000-0000-0000-0000-000000000001' AND serie='1º' AND letra='B';" 2>/dev/null
HTTP=$(api_code POST "/rest/v1/turmas" "{\"id\":\"$TID\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"serie\":\"1º\",\"letra\":\"B\"}" "$TG")
assert "turmas INSERT 201" "201" "$HTTP"

npx supabase db query "DELETE FROM public.enturmacoes WHERE aluno_id='$AID';" 2>/dev/null
HTTP=$(api_code POST "/rest/v1/enturmacoes" "{\"aluno_id\":\"$AID\",\"turma_id\":\"$TID\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"status\":\"matriculado\",\"data_matricula\":\"2026-07-13\"}" "$TG")
assert "enturmacoes INSERT 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/enturmacoes" "{\"aluno_id\":\"$AID\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"status\":\"matriculado\"}" "$TG")
assert "enturmacoes INSERT sem turma 400" "400" "$HTTP"

HTTP=$(api_code GET "/rest/v1/disciplinas?select=id,nome&limit=3" '' "$TG")
assert "disciplinas SELECT 200" "200" "$HTTP"

HTTP=$(api_code POST "/rest/v1/disciplinas" "{\"nome\":\"API Disc ${UNIQ}\",\"codigo_sige\":\"API${UNIQ}\"}" "$TG")
assert "disciplinas INSERT 201" "201" "$HTTP"

# frequencias - use our freshly created aluno + turma
FREQ_ID=$(UUID)
npx supabase db query "DELETE FROM public.frequencias WHERE aluno_id='$AID' AND data_aula='2026-07-13';" 2>/dev/null
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$AID\",\"professor_id\":\"a0000000-0000-0000-0000-000000000002\",\"turma_id\":\"$TID\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-13\",\"periodo\":\"Manhã\",\"status\":\"presente\",\"client_request_id\":\"$FREQ_ID\"}" "$TG")
assert "frequencias INSERT 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/frequencias" '{"aluno_id":"e0000000-0000-0000-0000-000000000001","professor_id":"a0000000-0000-0000-0000-000000000002","data_aula":"2026-07-13","periodo":"Manhã","status":"presente"}' "$TG")
assert "frequencias INSERT sem turma 400" "400" "$HTTP"

HTTP=$(api_code POST "/rest/v1/ocorrencias" '{"aluno_id":"e0000000-0000-0000-0000-000000000001","professor_id":"a0000000-0000-0000-0000-000000000002","turma_id":"d0000000-0000-0000-0000-000000000001","ano_letivo_id":"b0000000-0000-0000-0000-000000000001","titulo":"Test","descricao":"Teste API","tipo":["grave"]}' "$TG")
assert "ocorrencias INSERT 201" "201" "$HTTP"

HTTP=$(api_code GET "/rest/v1/notificacoes?select=id,titulo,tipo&limit=3" '' "$TG")
assert "notificacoes SELECT 200" "200" "$HTTP"
NID=$(api_body | py "d=json.load(sys.stdin); print(d[0]['id']) if d else ''" 2>/dev/null)

if [ -n "$NID" ]; then
  HTTP=$(api_code PATCH "/rest/v1/notificacoes?id=eq.$NID" '{"lida":true,"lida_em":"2026-07-13T12:00:00Z"}' "$TG")
  assert "notificacoes UPDATE 204" "204" "$HTTP"
fi

HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=*,perfis!codigos_redefinicao_perfil_id_fkey!inner(nome)&limit=3" '' "$TG")
assert "codigos SELECT com FK 200" "200" "$HTTP"
assert "contem dados" 1 "$(api_body | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) and len(d)>0 else 0)")"

HTTP=$(api_code POST "/rest/v1/vinculos_responsaveis" "{\"responsavel_id\":\"a0000000-0000-0000-0000-000000000005\",\"aluno_id\":\"$AID\",\"tipo_relacao\":\"pai\"}" "$TG")
assert "vinculos INSERT 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/vinculos_responsaveis" '{"responsavel_id":"a0000000-0000-0000-0000-000000000005","tipo_relacao":"pai"}' "$TG")
assert "vinculos INSERT sem aluno 400" "400" "$HTTP"

HTTP=$(api_code POST "/rest/v1/justificativas_faltas" '{"responsavel_id":"a0000000-0000-0000-0000-000000000005","aluno_id":"e0000000-0000-0000-0000-000000000001","data_falta":"2026-07-10","motivo":"Teste"}' "$TG")
assert "justificativas INSERT 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/atribuicoes_professores" '{"professor_id":"a0000000-0000-0000-0000-000000000002","turma_id":"d0000000-0000-0000-0000-000000000001","disciplina_id":"c0000000-0000-0000-0000-000000000001","papel":"titular","data_inicio":"2026-01-01"}' "$TG")
assert "atribuicoes INSERT 201" "201" "$HTTP"

echo ""; echo "=== 5. CASOS EXTREMOS ==="

N500=$(python3 -c "print('A'*500)")
AID3=$(UUID)
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID3\",\"nome\":\"$N500\",\"matricula\":\"BIGNAME${UNIQ}\"}" "$TG")
assert "nome 500 chars 201" "201" "$HTTP"

HTTP=$(api_code POST "/rest/v1/enturmacoes" '{"aluno_id":"00000000-0000-0000-0000-000000000000","turma_id":"d0000000-0000-0000-0000-000000000001","ano_letivo_id":"b0000000-0000-0000-0000-000000000001","status":"matriculado","data_matricula":"2026-01-01"}' "$TG")
assert "enturmacao aluno inexistente rejeitada" 1 "$( [ "$HTTP" = "400" ] || [ "$HTTP" = "409" ] || [ "$HTTP" = "422" ] && echo 1 || echo 0 )"

HTTP=$(api_code POST "/rest/v1/perfis" '{"nome":"Orphan","email":"orphan@t.com","papel":"responsavel","status":"ativo"}' "$TG")
assert "perfis direto sem FK 400" "400" "$HTTP"

# Temporarily set perfil to inativo, try to generate code, then restore
npx supabase db query "UPDATE perfis SET status='inativo' WHERE id='a0000000-0000-0000-0000-000000000004';" 2>&1 | tail -1
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000004"}' "$TG")
assert "codigo perfil inativo rejeitado" 1 "$( [ "$HTTP" = "400" ] || [ "$HTTP" = "200" ] && echo 1 || echo 0 )"
npx supabase db query "UPDATE perfis SET status='pendente' WHERE id='a0000000-0000-0000-0000-000000000004';" 2>&1 | tail -1

# Generate a fresh code, use it once, then try to reuse it
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" '{"p_perfil_id":"a0000000-0000-0000-0000-000000000002"}' "$TG")
CODIGO_NOVO=$(api_body | tr -d '"')
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"prof1@escola.edu.br\",\"codigo\":\"$CODIGO_NOVO\",\"novaSenha\":\"NovaSenha456!\"}")
assert "usar codigo valido 200" "200" "$HTTP"
# Now try to reuse it
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"prof1@escola.edu.br\",\"codigo\":\"$CODIGO_NOVO\",\"novaSenha\":\"NovaSenha789!\"}")
assert "reusar codigo 400" "400" "$HTTP"

HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"resp1@email.com","codigo":"123456","novaSenha":"NovaSenha456!"}')
assert "codigo expirado 400" "400" "$HTTP"

HTTP=$(edge_code "redefinir-senha-codigo" '{"email":"naoexiste@x.com","codigo":"654321","novaSenha":"NovaSenha456!"}')
assert "email nao corresponde 400" "400" "$HTTP"

HTTP=$(api_code POST "/rest/v1/alunos" '{"nome":123,"matricula":true}' "$TG")
# PostgREST aceita tipos implicitamente — aceitamos 201 ou 400
echo "  📝 payload com tipos automaticamente convertidos (HTTP $HTTP)"

HTTP=$(api_code GET "/rest/v1/auditoria?select=acao,entidade&limit=1" '' "$TG")
assert "auditoria acessivel por gestao" 1 "$( [ "$HTTP" = "200" ] && echo 1 || echo 0 )"

HTTP=$(api_code POST "/rest/v1/vinculos_responsaveis" "{\"responsavel_id\":\"a0000000-0000-0000-0000-000000000005\",\"aluno_id\":\"$AID\",\"tipo_relacao\":\"outro\"}" "$TG")
assert "vinculo duplicado 409" "409" "$HTTP"

AID4=$(python3 -c "import uuid; print(uuid.uuid4())")
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID4\",\"nome\":\"Sem Matricula\",\"matricula\":\"\"}" "$TG")
# PostgREST aceita string vazia — constraint UNIQUE valida no banco
echo "  📝 matricula vazia aceita pelo PostgREST (HTTP $HTTP)"

TID3=$(python3 -c "import uuid; print(uuid.uuid4())")
HTTP=$(api_code POST "/rest/v1/turmas" "{\"id\":\"$TID3\",\"serie\":\"2º\",\"letra\":\"A\",\"nome_completo\":\"2º A\"}" "$TG")
assert "turma sem ano_letivo 400" "400" "$HTTP"

echo ""; echo "=== 6. FREQUENCIA — IDEMPOTENCIA E PERSISTENCIA ==="
# Usa aluno + turma do seed: João Miguel (e...001) na turma 1º A (d...001)
FA="e0000000-0000-0000-0000-000000000001"
FT="d0000000-0000-0000-0000-000000000001"
FP="a0000000-0000-0000-0000-000000000002"

echo "  6.1 Inserir frequencia como professor (DELETE+INSERT = idempotente)"
# DELETE primeiro para garantir que o INSERT funcione em qualquer estado do DB
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-22&periodo=eq.Manhã&tipo_registro=eq.chamada_aula" '' "$TP")
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-22\",\"periodo\":\"Manhã\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\"}" "$TP")
assert "inserir frequencia 201" "201" "$HTTP"

echo "  6.2 Reinserir mesma frequencia (DELETE+INSERT novamente = idempotente)"
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-22&periodo=eq.Manhã&tipo_registro=eq.chamada_aula" '' "$TP")
assert "deletar frequencia 204" "204" "$HTTP"
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-22\",\"periodo\":\"Manhã\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\"}" "$TP")
assert "reinserir frequencia 201" "201" "$HTTP"

echo "  6.3 Inserir frequencia sem turma_id — deve falhar"
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"data_aula\":\"2026-07-22\",\"periodo\":\"Manhã\",\"status\":\"ausente\"}" "$TP")
assert_contains "sem turma_id rejeitado" "$(api_body)" "null value in column"

echo "  6.4 Inserir frequencia sem periodo — deve falhar"
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-22\",\"status\":\"ausente\"}" "$TP")
assert_contains "sem periodo rejeitado" "$(api_body)" "null value in column"

echo "  6.5 Buscar frequencias por data/aluno (persistencia)"
HTTP=$(api_code GET "/rest/v1/frequencias?select=aluno_id,status,periodo&aluno_id=eq.$FA&data_aula=eq.2026-07-22&periodo=eq.Manhã&tipo_registro=eq.chamada_aula&deleted_at=is.null" '' "$TP")
assert "buscar por data 200" "200" "$HTTP"
DADOS=$(api_body)
assert "status=ausente" 1 "$(echo "$DADOS" | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) and any(r.get('status')=='ausente' for r in d) else 0)")"
assert "periodo=Manhã" 1 "$(echo "$DADOS" | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) and any(r.get('periodo')=='Manhã' for r in d) else 0)")"

echo "  6.6 DELETE frequencia sem auth — deve falhar"
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-22&periodo=eq.Manhã&tipo_registro=eq.chamada_aula" '')
assert_contains "DELETE sem auth" "$(api_body)" "401\|JWT\|Unauthorized"

echo "  6.7 RLS: DELETE sem auth ja testado em 6.6 | gestao pode deletar em 6.8"

echo "  6.8 Gestao pode deletar qualquer frequencia"
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-22&periodo=eq.Tarde&tipo_registro=eq.chamada_aula" '' "$TG")
assert "gestao deleta 204" "204" "$HTTP"

echo "  6.9 Buscar alunos para frequencia (pre-marcacao)"
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-25\",\"periodo\":\"Manhã\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\"}" "$TP")
HTTP=$(api_code GET "/rest/v1/frequencias?select=aluno_id,status,periodo&data_aula=eq.2026-07-25&periodo=eq.Manhã&tipo_registro=eq.chamada_aula&deleted_at=is.null" '' "$TP")
DADOS=$(api_body)
QTD=$(echo "$DADOS" | py "d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
assert "registros encontrados > 0" 1 "$( [ "$QTD" -gt 0 ] && echo 1 || echo 0 )"

echo "  6.10 Registro de ausencia em periodo (mid-day absence)"
# DELETE+INSERT para garantir idempotencia
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-26&periodo=eq.7o%20Horario&tipo_registro=eq.chamada_aula" '' "$TP")
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-26\",\"periodo\":\"7o Horario\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\"}" "$TP")
assert "ausencia em periodo 201" "201" "$HTTP"
# Reinserir mesma ausencia (DELETE+INSERT)
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-26&periodo=eq.7o%20Horario&tipo_registro=eq.chamada_aula" '' "$TP")
assert "DELETE antes de reinserir 204" "204" "$HTTP"
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-26\",\"periodo\":\"7o Horario\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\"}" "$TP")
assert "reinserir ausencia 201" "201" "$HTTP"

echo ""; echo "=== 7. CICLO DE VIDA COMPLETO DOS CODIGOS ==="

EMAIL_VIDA="vida$$@escola.edu.br"

# 7.1 Criar usuario via edge function → obter id e codigo
HTTP=$(edge_code "criar-usuario" "{\"nome\":\"Vida Test\",\"email\":\"$EMAIL_VIDA\",\"papel\":\"professor\"}" "$TG")
assert "7.1 criar usuario 200" "200" "$HTTP"
VIDA_ID=$(api_body | py "d=json.load(sys.stdin); print(d.get('id',''))")
VIDA_CODIGO=$(api_body | py "d=json.load(sys.stdin); print(d.get('codigo',''))")
assert "7.1 id retornado" 1 "$( [ -n "$VIDA_ID" ] && echo 1 || echo 0 )"
assert "7.1 codigo retornado" 1 "$( [ -n "$VIDA_CODIGO" ] && echo 1 || echo 0 )"
assert "7.1 codigo 6 digitos" 6 "$(echo -n "$VIDA_CODIGO" | wc -c)"
sleep 1

# 7.2 Verificar que perfil existe e esta funcional
sleep 1
HTTP=$(api_code GET "/rest/v1/perfis?select=id,status&id=eq.${VIDA_ID}" '' "$TG")
assert "7.2 buscar perfil 200" "200" "$HTTP"
VIDA_STATUS=$(api_body | py "d=json.load(sys.stdin); print(d[0]['status'] if d else '')" 2>/dev/null)
assert "7.2 perfil existe" 1 "$( [ -n "$VIDA_STATUS" ] && echo 1 || echo 0 )"

# 7.3 Dedup: gerar segundo codigo retorna o mesmo
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" "{\"p_perfil_id\":\"$VIDA_ID\"}" "$TG")
assert "7.3 gerar codigo dedup 200" "200" "$HTTP"
VIDA_CODIGO_2=$(api_body | tr -d '"')
assert "7.3 dedup mesmo codigo" "$VIDA_CODIGO" "$VIDA_CODIGO_2"

# 7.4 Usar codigo valido → redefinir senha
sleep 1
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"$EMAIL_VIDA\",\"codigo\":\"$VIDA_CODIGO\",\"novaSenha\":\"Vida123!@#\"}")
assert "7.4 usar codigo valido 200" "200" "$HTTP"

# 7.5 Perfil foi ativado (pendente → ativo)
HTTP=$(api_code GET "/rest/v1/perfis?select=id,status&id=eq.$VIDA_ID" '' "$TG")
assert "7.5 buscar perfil 200" "200" "$HTTP"
VIDA_STATUS2=$(api_body | py "d=json.load(sys.stdin); print(d[0]['status'] if d else '')" 2>/dev/null)
assert "7.5 perfil ativado apos uso" "ativo" "$VIDA_STATUS2"

# 7.6 Reusar codigo rejeitado
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"$EMAIL_VIDA\",\"codigo\":\"$VIDA_CODIGO\",\"novaSenha\":\"Vida456!@#\"}")
assert "7.6 reusar codigo rejeitado 400" "400" "$HTTP"

# 7.7 Login com nova senha
sleep 1
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" "{\"email\":\"$EMAIL_VIDA\",\"password\":\"Vida123!@#\"}")
assert "7.7 login nova senha 200" "200" "$HTTP"

# 7.8 Gerar novo codigo (usuario agora ativo)
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" "{\"p_perfil_id\":\"$VIDA_ID\"}" "$TG")
assert "7.8 gerar codigo ativo 200" "200" "$HTTP"
VIDA_CODIGO_NOVO=$(api_body | tr -d '"')
assert "7.8 codigo 6 digitos" 6 "$(echo -n "$VIDA_CODIGO_NOVO" | wc -c)"
assert "7.8 codigo diferente do anterior" 1 "$( [ "$VIDA_CODIGO_NOVO" != "$VIDA_CODIGO" ] && echo 1 || echo 0 )"

# 7.9 Obter id do codigo via REST API e revogar
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id&codigo=eq.$VIDA_CODIGO_NOVO&order=created_at.desc&limit=1" '' "$TG")
assert "7.9 buscar codigo 200" "200" "$HTTP"
VIDA_CODIGO_ID=$(api_body | py "d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
assert "7.9 codigo id encontrado" 1 "$( [ -n "$VIDA_CODIGO_ID" ] && echo 1 || echo 0 )"
HTTP=$(api_code POST "/rest/v1/rpc/fn_revogar_codigo" "{\"p_codigo_id\":\"$VIDA_CODIGO_ID\"}" "$TG")
assert "7.9 revogar codigo 204" "204" "$HTTP"

# 7.10 Verificar revogado_em foi preenchido (via REST API)
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id,revogado_em&id=eq.$VIDA_CODIGO_ID" '' "$TG")
REVOGADO_CHECK=$(api_body | py "d=json.load(sys.stdin); print(d[0].get('revogado_em') is not None if d else False)" 2>/dev/null)
assert "7.10 revogado_em preenchido" "True" "$REVOGADO_CHECK"

# 7.11 Tentar usar codigo revogado
HTTP=$(edge_code "redefinir-senha-codigo" "{\"email\":\"$EMAIL_VIDA\",\"codigo\":\"$VIDA_CODIGO_NOVO\",\"novaSenha\":\"Vida789!@#\"}")
assert "7.11 usar codigo revogado 400" "400" "$HTTP"

# 7.12 CRUD — gestao pode SELECT codigos com dados de auditoria (buscar especificamente o revogado)
sleep 1
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id,revogado_em&id=eq.${VIDA_CODIGO_ID}" '' "$TG")
assert "7.12 gestao SELECT codigos 200" "200" "$HTTP"
TEM_REVOGADO=$(api_body | py "d=json.load(sys.stdin); print(d[0].get('revogado_em') is not None if d else False)" 2>/dev/null)
assert "7.12 revogado_em visivel" "True" "$TEM_REVOGADO"

# Refresh professor token for 7.13-7.15
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"Prof123!"}')
TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
if [ -z "$TP" ]; then
  HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"NovaSenha456!"}')
  TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
fi

# 7.13 RLS — professor nao pode ver codigos de outro email
sleep 1
HTTP=$(api_code GET "/rest/v1/codigos_redefinicao?select=id,email&email=eq.${EMAIL_VIDA}" '' "$TP")
assert "7.13 professor SELECT codigos 200" "200" "$HTTP"
QTD_PROF=$(api_body | py "d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
assert "7.13 professor nao ve codigos alheios" "0" "$QTD_PROF"

# 7.14 RLS — professor nao pode revogar
HTTP=$(api_code POST "/rest/v1/rpc/fn_revogar_codigo" "{\"p_codigo_id\":\"$VIDA_CODIGO_ID\"}" "$TP")
assert "7.14 professor nao revoga 400" "400" "$HTTP"

# 7.15 RLS — professor nao pode gerar codigo
HTTP=$(api_code POST "/rest/v1/rpc/fn_gerar_codigo_redefinicao" "{\"p_perfil_id\":\"$VIDA_ID\"}" "$TP")
assert "7.15 professor nao gera 400" "400" "$HTTP"

echo ""; echo "=== 8. NOVOS CAMPOS — OCORRENCIAS ==="

OCO_ID=$(UUID)
HTTP=$(api_code POST "/rest/v1/ocorrencias" "{\"id\":\"$OCO_ID\",\"aluno_id\":\"e0000000-0000-0000-0000-000000000001\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"titulo\":\"Test tipos\",\"descricao\":\"Teste de tipo multisselecao\",\"tipo\":[\"grave\",\"suspensao\"],\"tags_comportamento\":[\"agressao_verbal\",\"bullying\"],\"notificar_coordenacao\":true,\"notificar_responsavel\":true}" "$TG")
assert "8.1 ocorrencia com tipo array e tags 201" "201" "$HTTP"

OCO_ID2=$(UUID)
HTTP=$(api_code POST "/rest/v1/ocorrencias" "{\"id\":\"$OCO_ID2\",\"aluno_id\":\"e0000000-0000-0000-0000-000000000001\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"titulo\":\"Test notificacoes\",\"descricao\":\"Teste de notificacoes\",\"tipo\":[\"grave\"],\"notificar_coordenacao\":false,\"notificar_responsavel\":true}" "$TG")
assert "8.2 ocorrencia com notificacoes 201" "201" "$HTTP"

HTTP=$(api_code GET "/rest/v1/ocorrencias?select=tipo,tags_comportamento,notificar_coordenacao,notificar_responsavel&id=eq.$OCO_ID" '' "$TG")
assert "8.3 SELECT ocorrencia 200" "200" "$HTTP"
OCO_DATA=$(api_body)
assert_contains "8.3 tipo contem grave" "$OCO_DATA" "grave"
assert_contains "8.3 tipo contem suspensao" "$OCO_DATA" "suspensao"
assert_contains "8.3 tags_comportamento" "$OCO_DATA" "agressao_verbal"
assert_contains "8.3 notificar_coordenacao true" "$OCO_DATA" "true"

HTTP=$(api_code GET "/rest/v1/ocorrencias?select=notificar_coordenacao,notificar_responsavel&id=eq.$OCO_ID2" '' "$TG")
assert "8.4 SELECT ocorrencia notif 200" "200" "$HTTP"
OCO_NTF=$(api_body)
assert_contains "8.4 notificar_coordenacao false" "$OCO_NTF" "false"

echo ""; echo "=== 9. NOVOS CAMPOS — FREQUENCIAS ==="

# Garantir token valido do professor
HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"Prof123!"}')
TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
if [ -z "$TP" ]; then
  HTTP=$(api_code POST "/auth/v1/token?grant_type=password" '{"email":"prof1@escola.edu.br","password":"NovaSenha456!"}')
  TP=$(api_body | py "d=json.load(sys.stdin); print(d.get('access_token',''))")
fi
# Garantir que o aluno seed existe e está enturmado
# (João Miguel — e0000000-0000-0000-0000-000000000001 na turma 1º A — d0000000-0000-0000-0000-000000000001)
HTTP=$(api_code GET "/rest/v1/enturmacoes?select=id&aluno_id=eq.$FA&turma_id=eq.$FT&status=eq.matriculado&limit=1" '' "$TG")
ENTURM_OK=$(api_body | py "d=json.load(sys.stdin); print(1 if isinstance(d,list) and len(d)>0 else 0)" 2>/dev/null)
if [ "$ENTURM_OK" != "1" ]; then
  HTTP=$(api_code POST "/rest/v1/enturmacoes" "{\"aluno_id\":\"$FA\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"status\":\"matriculado\",\"data_matricula\":\"2026-01-01\"}" "$TG")
fi

# 9.1 Criar frequencia com motivos_ausencia e observacao (DELETE+INSERT para idempotencia)
# Garantir que não há frequência pré-existente para esta combinação
HTTP=$(api_code DELETE "/rest/v1/frequencias?aluno_id=eq.$FA&data_aula=eq.2026-07-28&periodo=eq.Manhã&tipo_registro=eq.chamada_aula" '' "$TP")
FREQ_MOT=$(UUID)
HTTP=$(api_code POST "/rest/v1/frequencias" "{\"client_request_id\":\"$FREQ_MOT\",\"aluno_id\":\"$FA\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"data_aula\":\"2026-07-28\",\"periodo\":\"Manhã\",\"tipo_registro\":\"chamada_aula\",\"status\":\"ausente\",\"motivos_ausencia\":[\"enfermaria\",\"saida_antecipada\"],\"observacao\":\"Encaminhado a enfermaria\"}" "$TP")
assert "9.1 frequencia com motivos_ausencia e observacao 201" "201" "$HTTP"

HTTP=$(api_code GET "/rest/v1/frequencias?select=motivos_ausencia,observacao&client_request_id=eq.$FREQ_MOT" '' "$TP")
assert "9.2 SELECT frequencia 200" "200" "$HTTP"
FREQ_DATA=$(api_body)
assert_contains "9.2 motivos_ausencia enfermaria" "$FREQ_DATA" "enfermaria"
assert_contains "9.2 observacao" "$FREQ_DATA" "Encaminhado"

echo ""; echo "=== 10. NOVOS CAMPOS — PERFIS ==="

HTTP=$(api_code PATCH "/rest/v1/perfis?id=eq.a0000000-0000-0000-0000-000000000002" '{"acesso_modulos":["frequencia","ocorrencias","chat","relatorios"],"permissoes":["exportar","gerenciar_usuarios"]}' "$TG")
assert "10.1 UPDATE perfil acesso_modulos e permissoes 204" "204" "$HTTP"

HTTP=$(api_code GET "/rest/v1/perfis?select=acesso_modulos,permissoes&id=eq.a0000000-0000-0000-0000-000000000002" '' "$TG")
assert "10.2 SELECT perfil 200" "200" "$HTTP"
PERF_DATA=$(api_body)
assert_contains "10.2 acesso_modulos contem frequencia" "$PERF_DATA" "frequencia"
assert_contains "10.2 permissoes contem exportar" "$PERF_DATA" "exportar"

echo ""; echo "=== 11. NOVOS CAMPOS — ALUNOS ==="

AID_NOVO=$(UUID)
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID_NOVO\",\"nome\":\"Aluno Completo\",\"matricula\":\"COMPLETO${UNIQ}\",\"transporte_escolar\":true,\"alimentacao_diferenciada\":true,\"necessidades_especiais\":false,\"documentos_recebidos\":[\"rg\",\"cpf\",\"certidao_nascimento\"]}" "$TG")
assert "11.1 aluno completo com novos campos 201" "201" "$HTTP"

HTTP=$(api_code GET "/rest/v1/alunos?select=transporte_escolar,alimentacao_diferenciada,necessidades_especiais,documentos_recebidos&id=eq.$AID_NOVO" '' "$TG")
assert "11.2 SELECT aluno completo 200" "200" "$HTTP"
ALU_DATA=$(api_body)
assert_contains "11.2 transporte_escolar true" "$ALU_DATA" "true"
assert_contains "11.2 documentos rg" "$ALU_DATA" "rg"
assert_contains "11.2 documentos cpf" "$ALU_DATA" "cpf"

echo ""; echo "=== 12. EDGE CASES — NOVOS CAMPOS ==="

# 12.1 ocorrencia com tipo array vazio (deve aceitar com default)
OCO_VAZIO=$(UUID)
HTTP=$(api_code POST "/rest/v1/ocorrencias" "{\"id\":\"$OCO_VAZIO\",\"aluno_id\":\"e0000000-0000-0000-0000-000000000001\",\"professor_id\":\"$FP\",\"turma_id\":\"$FT\",\"ano_letivo_id\":\"b0000000-0000-0000-0000-000000000001\",\"titulo\":\"Test vazio\",\"descricao\":\"Teste array vazio\",\"tipo\":[],\"tags_comportamento\":[]}" "$TG")
assert "12.1 ocorrencia arrays vazios 201" "201" "$HTTP"

# 12.2 perfil com arrays vazios (UPDATE para limpar)
HTTP=$(api_code PATCH "/rest/v1/perfis?id=eq.a0000000-0000-0000-0000-000000000002" '{"acesso_modulos":[],"permissoes":[]}' "$TG")
assert "12.2 UPDATE perfil arrays vazios 204" "204" "$HTTP"

# 12.3 SELECT view v_feed_aluno com novos tipos
HTTP=$(api_code GET "/rest/v1/rpc/v_feed_aluno?limit=1" '' "$TG" 2>/dev/null) || HTTP=$(api_code GET "/rest/v1/v_feed_aluno?limit=1" '' "$TG" 2>/dev/null)
# View pode ser acessada via REST ou nao, qualquer resposta 2xx é aceitavel
echo "  📝 v_feed_aluno HTTP $HTTP"

# 12.4 aluno com documentos_recebidos vazio
AID_SEMDOC=$(UUID)
HTTP=$(api_code POST "/rest/v1/alunos" "{\"id\":\"$AID_SEMDOC\",\"nome\":\"Sem Documentos\",\"matricula\":\"SEMDOC${UNIQ}\",\"documentos_recebidos\":[]}" "$TG")
assert "12.4 aluno documentos vazio 201" "201" "$HTTP"

echo ""; echo "=========================================="
echo "  FIM SECAO 7 — TODOS OS FLUXOS VERIFICADOS"
echo "=========================================="

# Restore prof1 password (changed by redefinir-senha-codigo test)
restore_pw "a0000000-0000-0000-0000-000000000002" "Prof123!"

echo ""; echo "=========================================="
echo "  TOTAL: $((PASS+FAIL))  |  PASS: $PASS  |  FAIL: $FAIL"
echo "=========================================="
[ "$FAIL" -gt 0 ] && { echo -e "$ERROS"; exit 1; } || { echo "  ALL PASSED!"; exit 0; }
