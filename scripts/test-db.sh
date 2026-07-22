#!/bin/bash
# ============================================================================
# Database Test Suite — BuscApp
# Executa os testes SQL via Docker (contorno para limitacao do CLI)
# ============================================================================

set -o pipefail

echo "=== Database Test Suite ==="
echo ""

CONTAINER=$(docker ps --filter "name=supabase_db" --format "{{.Names}}" 2>/dev/null | head -1)
if [ -z "$CONTAINER" ]; then
  echo "ERRO: Container do Supabase nao encontrado. Execute 'npx supabase start' primeiro."
  exit 1
fi

echo "Container: $CONTAINER"
echo ""

# Executa os testes dentro de uma transacao que sempre faz ROLLBACK
# Filtra apenas as linhas com NOTICE e ERROR para saida limpa
docker exec -i "$CONTAINER" psql -U postgres -f - 2>&1 < supabase/tests/0001_validacao_completa.sql | \
  grep -E "(NOTICE:|ERROR:)" | \
  sed 's/psql:<stdin>:[0-9]*: //'

echo ""
echo "=== Testes concluidos ==="
echo "(Todos os dados de teste foram descartados pelo ROLLBACK)"
