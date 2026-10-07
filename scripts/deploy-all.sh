#!/bin/bash
export SUPABASE_ACCESS_TOKEN="$SB_MANAGEMENT_TOKEN"
PROJECT_REF="mhvmjgyibehthmglnxge"

echo "Iniciando deploy das Edge Functions para o projeto $PROJECT_REF..."

# Lista de todas as funções no diretório supabase/functions
FUNCTIONS=$(ls -d supabase/functions/*/ | xargs -n 1 basename)

for func in $FUNCTIONS; do
  if [ "$func" == "_shared" ]; then continue; fi
  echo "Deploying $func..."
  nix run nixpkgs#supabase-cli -- functions deploy "$func" --project-ref "$PROJECT_REF" --no-verify-jwt
done
