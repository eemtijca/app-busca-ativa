#!/bin/bash
# Seed users via Auth Admin API after supabase start
# This replaces the auth.users direct SQL inserts which don't work with GoTrue
# ============================================================================
# Le as credenciais do .env (se existir) ou usa defaults locais
# ============================================================================

[ -f "$(dirname "$0")/../.env" ] && source "$(dirname "$0")/../.env"

API_URL="${VITE_SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

declare -a USERS=(
  '{"email":"gestao@escola.edu.br","password":"Admin123!","email_confirm":true,"user_metadata":{"nome":"Carlos Administrador","papel":"gestao"}}'
  '{"email":"prof1@escola.edu.br","password":"Prof123!","email_confirm":true,"user_metadata":{"nome":"Ana Professora","papel":"professor"}}'
  '{"email":"prof2@escola.edu.br","password":"Prof123!","email_confirm":true,"user_metadata":{"nome":"Bruno Professor","papel":"professor"}}'
  '{"email":"prof3@escola.edu.br","password":"Prof123!","email_confirm":true,"user_metadata":{"nome":"Carla Docente","papel":"professor"}}'
  '{"email":"resp1@email.com","password":"Resp123!","email_confirm":true,"user_metadata":{"nome":"Maria Silva","papel":"responsavel"}}'
  '{"email":"resp2@email.com","password":"Resp123!","email_confirm":true,"user_metadata":{"nome":"Joao Santos","papel":"responsavel"}}'
  '{"email":"resp3@email.com","password":"Resp123!","email_confirm":true,"user_metadata":{"nome":"Lucia Oliveira","papel":"responsavel"}}'
)

for user in "${USERS[@]}"; do
  email=$(echo "$user" | python3 -c "import sys,json; print(json.load(sys.stdin)['email'])")

  # Check if user already exists
  EXISTS=$(curl -s "$API_URL/auth/v1/admin/users?filter%5Bemail%5D=$email" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" 2>&1)

  if echo "$EXISTS" | python3 -c "import sys,json; d=json.load(sys.stdin); users=d.get('users',[]); exit(0 if any(u['email']=='$email' for u in users) else 1)" 2>/dev/null; then
    echo "User $email already exists, skipping"
    continue
  fi

  echo "Creating user $email..."
  RESPONSE=$(curl -s -X POST "$API_URL/auth/v1/admin/users" \
    -H "Content-Type: application/json" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -d "$user")

  USER_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
  echo "  User ID: $USER_ID"
done

echo "Done seeding users!"
