#!/usr/bin/env bash
# Corre la CLI de Supabase. Si la sesión todavía no tiene el grupo docker activo
# (pasa hasta volver a iniciar sesión después de `usermod -aG docker`), usa sg.
set -euo pipefail
if docker info >/dev/null 2>&1; then
  exec supabase "$@"
fi
exec sg docker -c "PATH='$PATH' supabase $(printf '%q ' "$@")"
