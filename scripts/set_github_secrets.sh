#!/usr/bin/env bash
# Configura los secrets del repositorio con GitHub CLI.
# Requisitos: gh instalado y autenticado (`gh auth login`).
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${SUPABASE_PROJECT_REF:?Falta SUPABASE_PROJECT_REF}"
: "${SUPABASE_URL:?Falta SUPABASE_URL}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Falta SUPABASE_SERVICE_ROLE_KEY}"

ACCESS_TOKEN_FILE="${HOME}/.supabase/access-token"
if [ ! -f "$ACCESS_TOKEN_FILE" ]; then
  echo "No existe $ACCESS_TOKEN_FILE. Ejecuta: npx supabase login" >&2
  exit 1
fi

gh secret set SUPABASE_ACCESS_TOKEN --body "$(cat "$ACCESS_TOKEN_FILE")"
gh secret set SUPABASE_PROJECT_REF --body "$SUPABASE_PROJECT_REF"
gh secret set SUPABASE_URL --body "$SUPABASE_URL"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"

echo "Secrets configurados. El workflow se ejecutará en el próximo push a main."
