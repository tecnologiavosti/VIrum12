#!/bin/bash
# Deploy do motor de IA no projeto oficial (requer supabase login local)
set -e
PROJECT_REF="mhvmjgyibehthmglnxge"
for f in process-diagnosis; do
  supabase functions deploy "$f" --project-ref "$PROJECT_REF" --no-verify-jwt
done
