#!/usr/bin/env bash
# Quality gate de yolo-session.
# Uso: bash scripts/quality_gate.sh <alcance>
#   alcance: backend | frontend | e2e | security | review | all | <ruta/a/carpeta>
# Sale con 0 si todo pasa, 1 si algo falla. Imprime un resumen al final.

set -u
SCOPE="${1:-all}"
FAILED=()
PASSED=()

has_script() { node -e "process.exit(require('./package.json').scripts?.['$1'] ? 0 : 1)" 2>/dev/null; }

run() {
  local name="$1"; shift
  echo "▶ $name: $*"
  if "$@"; then PASSED+=("$name"); else FAILED+=("$name"); fi
}

lint()      { if has_script lint; then run lint npm run -s lint; else echo "⚠ sin script lint"; fi; }
typecheck() { if has_script typecheck; then run typecheck npm run -s typecheck; else run typecheck npx tsc --noEmit; fi; }
unit()      { run "unit:${*:-all}" npx vitest run --passWithNoTests "$@"; }
build()     { if has_script build; then run build npm run -s build; fi; }
e2e()       { if [ -d tests/e2e ] || ls playwright.config.* >/dev/null 2>&1; then run e2e npx playwright test; else echo "⚠ sin tests e2e"; fi; }

no_secrets_in_client() {
  # Claves de servidor no deben aparecer en código cliente ni en env públicas.
  local hits
  hits=$(grep -rnE "SERVICE_ROLE|SUPABASE_SECRET|sb_secret_" src/ 2>/dev/null \
         | grep -E "NEXT_PUBLIC_|use client" || true)
  local tracked_env
  tracked_env=$(git ls-files 2>/dev/null | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$' || true)
  if [ -n "$hits" ] || [ -n "$tracked_env" ]; then
    echo "$hits"; echo "$tracked_env"; return 1
  fi
}

no_new_any_or_logs() {
  local hits
  hits=$(grep -rnE ":\s*any\b|console\.log\(" src/ --include=*.ts --include=*.tsx 2>/dev/null \
         | grep -v "database.types.ts" || true)
  if [ -n "$hits" ]; then echo "$hits"; return 1; fi
}

case "$SCOPE" in
  backend)
    lint; typecheck; unit src/actions src/lib supabase/tests ;;
  frontend)
    lint; typecheck; unit src/components src/app; build ;;
  e2e)
    build; e2e ;;
  security)
    run npm-audit npm audit --audit-level=high
    run secrets no_secrets_in_client
    unit supabase/tests
    echo "ℹ Revisá también los advisors de seguridad de Supabase (MCP get_advisors)." ;;
  review)
    lint; typecheck; run any-y-logs no_new_any_or_logs ;;
  all)
    lint; typecheck; unit; build; e2e
    run npm-audit npm audit --audit-level=high
    run secrets no_secrets_in_client ;;
  *)
    if [ -e "$SCOPE" ]; then lint; typecheck; unit "$SCOPE"; else echo "Alcance desconocido: $SCOPE"; exit 2; fi ;;
esac

echo
echo "── Quality gate ($SCOPE) ──"
for p in "${PASSED[@]:-}"; do [ -n "$p" ] && echo "✔ $p"; done
for f in "${FAILED[@]:-}"; do [ -n "$f" ] && echo "✘ $f"; done
[ ${#FAILED[@]} -eq 0 ] && { echo "RESULTADO: PASA"; exit 0; } || { echo "RESULTADO: FALLA"; exit 1; }
