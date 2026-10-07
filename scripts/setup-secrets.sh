#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# scripts/setup-secrets.sh
#
# Cadastra as secrets de aplicação/third-party no projeto Supabase de destino
# (mhvmjgyibehthmglnxge) via CLI. NÃO cadastra variáveis SUPABASE_*/SB_* —
# essas são injetadas automaticamente pela plataforma.
#
# Pré-requisitos:
#   1. Supabase CLI instalada (https://supabase.com/docs/guides/cli)
#   2. Ter rodado: supabase link --project-ref mhvmjgyibehthmglnxge
#   3. Exportar os valores no seu shell antes de rodar este script:
#
#      export APP_ENC_KEY="..."
#      export CEREBRAS_API_KEY="..."
#      export PEXELS_API_KEY="..."
#      export UNSPLASH_ACCESS_KEY="..."
#      export EXT_SUPABASE_URL="https://..."
#      export EXT_SUPABASE_ANON_KEY="..."
#      export LYKDAT_API_KEY="..."
#      export MERCADO_PAGO_ACCESS_TOKEN="..."
#      export STRIPE_SECRET_KEY="sk_live_..."
#      export STRIPE_WEBHOOK_SECRET="whsec_..."
#      # Opcionais:
#      # export UNSPLASH_SECRET_KEY="..."
#
# Uso:
#   chmod +x scripts/setup-secrets.sh
#   ./scripts/setup-secrets.sh
# ------------------------------------------------------------------------------
set -euo pipefail

REQUIRED=(
  APP_ENC_KEY
  CEREBRAS_API_KEY
  PEXELS_API_KEY
  UNSPLASH_ACCESS_KEY
  EXT_SUPABASE_URL
  EXT_SUPABASE_ANON_KEY
  LYKDAT_API_KEY
  MERCADO_PAGO_ACCESS_TOKEN
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
)

OPTIONAL=(
  UNSPLASH_SECRET_KEY
)

missing=()
for name in "${REQUIRED[@]}"; do
  if [ -z "${!name:-}" ]; then
    missing+=("$name")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Variáveis obrigatórias não exportadas no shell:" >&2
  printf '   - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "▶ Cadastrando secrets obrigatórias no Supabase..."
for name in "${REQUIRED[@]}"; do
  echo "  · $name"
  supabase secrets set "$name=${!name}" >/dev/null
done

for name in "${OPTIONAL[@]}"; do
  if [ -n "${!name:-}" ]; then
    echo "  · $name (opcional)"
    supabase secrets set "$name=${!name}" >/dev/null
  fi
done

echo "✅ Secrets cadastradas. Confira em:"
echo "   https://supabase.com/dashboard/project/mhvmjgyibehthmglnxge/settings/functions"
