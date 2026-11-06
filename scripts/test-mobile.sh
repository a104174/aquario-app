#!/usr/bin/env bash
# Testes de UX mobile (Playwright WebKit + Chromium) contra um build de produção
# com o Supabase simulado. Uso: npm run test:mobile [-- <args do playwright>]
#   CICLO=ciclo-3 npm run test:mobile     → capturas em reviews/AAAA-MM-DD/ciclo-3
set -euo pipefail
export NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=teste
export NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-/opt/pw-browsers}"
if [ "${SEM_BUILD:-0}" != "1" ]; then npx next build > /dev/null; fi
rm -rf "reviews/$(date +%F)/${CICLO:-ciclo-0}"
npx playwright test "$@"
