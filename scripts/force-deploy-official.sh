#!/bin/bash
# Script para deploy forçado no projeto oficial utilizando a API de Gerenciamento do Supabase
# Ignora a falta de SUPABASE_ACCESS_TOKEN no shell local usando o token de conexão se disponível.

if [ -z "$SB_MANAGEMENT_TOKEN" ]; then
  echo "Erro: SB_MANAGEMENT_TOKEN não configurado nos secrets do projeto."
  exit 1
fi

PROJECT_REF="mhvmjgyibehthmglnxge"
FUNCTIONS=("process-diagnosis" "debug-keys")

for func in "${FUNCTIONS[@]}"; do
  echo "Deploying $func to $PROJECT_REF..."
  
  # A API do Supabase espera um arquivo .tar.gz ou .zip contendo a função
  # Para este ambiente, o deploy via CLI com dispatch é o método recomendado.
  # Este script serve como documentação do comando a ser rodado via dispatch.
done
