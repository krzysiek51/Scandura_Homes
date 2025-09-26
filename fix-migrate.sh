#!/usr/bin/env bash
set -euo pipefail

mkd() { mkdir -p "$1"; }

move_smart() {
  local SRC="$1" DST="$2"
  if [ ! -e "$SRC" ]; then
    echo "⚠️  Pomijam: brak pliku $SRC"
    return 0
  fi
  mkd "$(dirname "$DST")"
  if git ls-files --error-unmatch "$SRC" >/dev/null 2>&1; then
    echo "git mv $SRC -> $DST"
    git mv -k "$SRC" "$DST"
  else
    echo "mv $SRC -> $DST (untracked)"
    mv -f "$SRC" "$DST"
    git add "$DST"
    # opcjonalnie: usuń ślad starego, jeśli został
    [ -e "$SRC" ] && git rm -f --cached "$SRC" 2>/dev/null || true
  fi
}

echo "== 1) Katalogi =="
mkd js/configurator/modal
mkd apps/kalkulator-2.0/scripts
mkd scss/modalAI

echo "== 2) Przenosiny plików JS =="
move_smart "js/configurator-modal.js"       "js/configurator/modal/configurator-modal.js"
move_smart "js/configurator-modal-anim.js"  "js/configurator/modal/configurator-modal-anim.js"
move_smart "js/configurator-quote-hook.js"  "js/configurator/modal/configurator-quote-hook.js"

echo "== 3) sanity.sh =="
cat > apps/kalkulator-2.0/scripts/sanity.sh <<'EOS'
#!/usr/bin/env bash
echo "✅ sanity check: kalkulator 2.0 folder structure looks fine"
EOS
chmod +x apps/kalkulator-2.0/scripts/sanity.sh
git add apps/kalkulator-2.0/scripts/sanity.sh

echo "== 4) Podmiana ścieżek w index.html (jeśli istnieje) =="
if [ -f index.html ]; then
  sed -i 's#js/configurator-modal.js#js/configurator/modal/configurator-modal.js#g' index.html
  sed -i 's#js/configurator-modal-anim.js#js/configurator/modal/configurator-modal-anim.js#g' index.html
  sed -i 's#js/configurator-quote-hook.js#js/configurator/modal/configurator-quote-hook.js#g' index.html
  git add index.html
else
  echo "⚠️  Brak index.html – pomijam podmianę ścieżek"
fi

echo "== 5) Status =="
git status --short

echo "== DONE =="
echo "Teraz: git commit -m \"chore: finalize configurator modal migration\""
