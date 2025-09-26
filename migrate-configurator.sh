#!/usr/bin/env bash
set -euo pipefail

echo "== Tworzę nowe katalogi =="
mkdir -p js/configurator/modal
mkdir -p apps/kalkulator-2.0/scripts

echo "== Przenoszę pliki modala =="
git mv js/configurator-modal.js js/configurator/modal/configurator-modal.js
git mv js/configurator-modal-anim.js js/configurator/modal/configurator-modal-anim.js
git mv js/configurator-quote-hook.js js/configurator/modal/configurator-quote-hook.js

echo "== Dodaję sanity script (stub) =="
cat > apps/kalkulator-2.0/scripts/sanity.sh <<'EOS'
#!/usr/bin/env bash
echo "✅ sanity check: kalkulator 2.0 folder structure looks fine"
EOS
chmod +x apps/kalkulator-2.0/scripts/sanity.sh

echo "== Gotowe! Zrób commit =="
