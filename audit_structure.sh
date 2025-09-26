#!/usr/bin/env bash
set -euo pipefail

# ========= USTAWIENIA =========
# Katalogi, które chcemy obejrzeć szczegółowo
TARGETS=(
  "."                                # cały projekt (root)
  "./js"
  "./scss/modalAI"
  "./apps/kalkulator-2.0"
  "./apps/kalkulator-2.0/engine"
  "./apps/kalkulator-2.0/ui"
  "./apps/kalkulator-2.0/public"
  "./apps/kalkulator-2.0/data"
)
# Wykluczenia z drzewa
IGNORE_RE="node_modules|dist|build|.git|.cache|.next|.DS_Store|\.map$"

# Plik raportu
REPORT="structure-report.txt"

# ========= FUNKCJE =========
has_cmd(){ command -v "$1" >/dev/null 2>&1; }

print_header(){
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

print_tree(){
  local DIR="$1"
  if [[ ! -d "$DIR" ]]; then
    echo "⚠️  brak katalogu: $DIR"
    return
  fi

  if has_cmd tree; then
    # -a (ukryte), -I (ignorowane), -L 5 (głębokość)
    tree -a -I "$IGNORE_RE" -L 5 "$DIR"
  else
    # fallback bez 'tree' (Git Bash/WSL itp.)
    # find + filtr + ładne wcięcia awk
    find "$DIR" -printf "%p\n" \
      | grep -Ev "$IGNORE_RE" \
      | awk -F/ '
        {
          indent=""; for(i=1;i<NF;i++){ indent=indent "  " }
          print indent $NF
        }'
  fi
}

check_files(){
  echo "• Wymagane pliki (modal + kalkulator):"
  declare -a FILES=(
    "./js/configurator-modal.js"
    "./js/configurator-modal-anim.js"
    "./js/configurator-quote-hook.js"
    "./scss/modalAI/_configurator-modal.scss"
    "./scss/modalAI/_configurator-anim.scss"
    "./scss/modalAI/_configurator-quote.scss"
    "./apps/kalkulator-2.0/engine/index.js"
    "./apps/kalkulator-2.0/ui/step-quote.js"
    "./apps/kalkulator-2.0/ui/router.js"
  )
  for f in "${FILES[@]}"; do
    if [[ -f "$f" ]]; then
      printf "  ✅ %s\n" "$f"
    else
      printf "  ❌ %s\n" "$f"
    fi
  done
  echo
}

last_modified_summary(){
  echo "• Ostatnio modyfikowane (TOP 15):"
  # kompatybilne z Git Bash: ls -ltR + filtr
  ls -ltR 2>/dev/null \
    | grep -Ev "$IGNORE_RE" \
    | grep -E "^-|^d" \
    | head -n 50
  echo
}

# ========= WYKONANIE =========
{
  print_header "RAPORT STRUKTURY — $(pwd) — $(date '+%Y-%m-%d %H:%M:%S')"
  echo

  check_files
  last_modified_summary

  for d in "${TARGETS[@]}"; do
    print_header "TREE: $d"
    print_tree "$d"
    echo
  done
} | tee "$REPORT"

echo "✅ Zapisano raport: $REPORT"
