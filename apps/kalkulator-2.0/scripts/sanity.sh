#!/usr/bin/env bash
set -u

ROOT="apps/kalkulator-2.0"
ERR=0

need_dirs=(
  "$ROOT/public"
  "$ROOT/data"
  "$ROOT/data/presets"
  "$ROOT/engine"
  "$ROOT/ui"
  "$ROOT/demo"
)
need_files=(
  "$ROOT/public/index.html"
  "$ROOT/public/styles.css"
  "$ROOT/data/pricing.master.json"
  "$ROOT/data/garages.json"
  "$ROOT/data/modifiers.json"
  "$ROOT/engine/state.js"
  "$ROOT/engine/pricing-core.js"
  "$ROOT/engine/pricing-loaders.js"
  "$ROOT/engine/index.js"
  "$ROOT/ui/router.js"
  "$ROOT/ui/step-quote.js"
  "$ROOT/demo/demo.html"
)

ok(){ printf "✅ %s\n" "$1"; }
bad(){ printf "❌ %s\n" "$1"; ERR=$((ERR+1)); }

echo "== Sprawdzam katalogi =="
for d in "${need_dirs[@]}"; do
  [[ -d "$d" ]] && ok "Dir: $d" || bad "Brak dir: $d"
done

echo -e "\n== Sprawdzam pliki =="
for f in "${need_files[@]}"; do
  [[ -f "$f" ]] && ok "File: $f" || bad "Brak pliku: $f"
done

# Walidacja JSON (jq -> node -> python)
validate_json(){
  local file="$1"
  if command -v jq >/dev/null 2>&1; then
    jq -e . "$file" >/dev/null 2>&1 && ok "JSON OK: $file" || bad "JSON błędny: $file"
  elif command -v node >/dev/null 2>&1; then
    node -e "JSON.parse(require('fs').readFileSync('$file','utf8'))" >/dev/null 2>&1 \
      && ok "JSON OK: $file" || bad "JSON błędny: $file"
  elif command -v python >/dev/null 2>&1; then
    python -m json.tool < "$file" >/dev/null 2>&1 \
      && ok "JSON OK: $file" || bad "JSON błędny: $file"
  else
    echo "⚠️  Brak jq/node/python — pomijam walidację JSON."
    return 0
  fi
}

echo -e "\n== Waliduję JSON-y (o ile dostępne narzędzia) =="
for j in "$ROOT/data/"*.json; do
  [[ -f "$j" ]] && validate_json "$j"
done

echo -e "\n== Kontrola ścieżek w demo.html =="
DEMO="$ROOT/demo/demo.html"
if [[ -f "$DEMO" ]]; then
  need_refs=( "../engine/state.js" "../engine/pricing-core.js" "../engine/pricing-loaders.js" "../engine/index.js" "../ui/router.js" "../ui/step-quote.js" )
  for r in "${need_refs[@]}"; do
    grep -q "$r" "$DEMO" && ok "demo.html ma: $r" || bad "Brak referencji w demo.html: $r"
  done
else
  bad "Brak pliku demo.html do sprawdzenia referencji"
fi

echo -e "\n== PODSUMOWANIE =="
if [[ $ERR -eq 0 ]]; then
  echo "��� Sanity check: OK"
  exit 0
else
  echo "‼️  Sanity check: wykryto $ERR problem(y). Napraw i uruchom ponownie."
  exit 1
fi
