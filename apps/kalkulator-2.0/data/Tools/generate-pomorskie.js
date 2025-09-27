#!/usr/bin/env node
/**
 * tools/generate-pomorskie.js
 * Użycie:
 *   node tools/generate-pomorskie.js <ścieżka_do_źródła.csv|json> public/js/configurator/data/pomorskie.min.js
 *
 * Wejście (CSV/JSON): kolumny/pola:
 *   - wojewodztwo (np. "pomorskie" / "Pomorskie")
 *   - miejscowosc (np. "Gdańsk")
 *   - typ         (np. "miasto" | "wieś" | ... )
 *
 * Wyjście:
 *   window.PL_CITIES = [{ city:"Gdańsk", region:"Pomorskie" }, ...];
 */

const fs = require('fs');
const path = require('path');

const SRC = process.argv[2];
const OUT = process.argv[3] || path.resolve('public/js/configurator/data/pomorskie.min.js');

if (!SRC) {
  console.error('Podaj ścieżkę do źródła CSV/JSON, np.: node tools/generate-pomorskie.js data/miejscowosci.csv public/js/configurator/data/pomorskie.min.js');
  process.exit(1);
}

const POM = 'Pomorskie';
const ALLOWED = new Set(['miasto', 'wieś', 'wies']); // czasem w źródłach "wies" bez polskich znaków

const norm = s => (s||'')
  .toString()
  .trim()
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function parseCSV(text) {
  // bardzo prosty parser CSV (wystarczy dla normalnych plików bez cudzysłowów wielowierszowych)
  const [headerLine, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const headers = headerLine.split(',').map(h => h.trim());
  const idx = {
    woj: headers.findIndex(h => norm(h) === 'wojewodztwo'),
    m:   headers.findIndex(h => norm(h) === 'miejscowosc'),
    t:   headers.findIndex(h => norm(h) === 'typ'),
  };
  if (idx.woj < 0 || idx.m < 0 || idx.t < 0) {
    throw new Error('CSV: brak wymaganych kolumn: wojewodztwo,miejscowosc,typ');
  }
  return lines.map(line => {
    const cols = line.split(',').map(c => c.trim());
    return {
      wojewodztwo: cols[idx.woj],
      miejscowosc: cols[idx.m],
      typ: cols[idx.t],
    };
  });
}

function loadSource(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) throw new Error('JSON: oczekiwano tablicy obiektów');
    return arr;
  } else if (file.endsWith('.csv')) {
    return parseCSV(raw);
  } else {
    throw new Error('Obsługiwane rozszerzenia: .json lub .csv');
  }
}

function main() {
  const rows = loadSource(SRC);

  // filtr: tylko woj. pomorskie + typ [miasto|wieś]
  const filtered = rows.filter(r => {
    const woj = norm(r.wojewodztwo);
    const typ = norm(r.typ);
    return (woj === 'pomorskie') && ALLOWED.has(typ);
  });

  // mapowanie do { city, region }
  const mapped = filtered.map(r => ({
    city: String(r.miejscowosc || '').trim(),
    region: POM,
  })).filter(r => r.city.length > 0);

  // deduplikacja po (city, region)
  const seen = new Set();
  const out = [];
  for (const it of mapped) {
    const key = `${norm(it.city)}|${norm(it.region)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }

  // sort alfabetyczny
  out.sort((a, b) => a.city.localeCompare(b.city, 'pl', { sensitivity: 'base' }));

  // serializacja do przeglądarki
  const payload = `window.PL_CITIES = ${JSON.stringify(out)};`;
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, payload, 'utf8');

  console.log(`OK: zapisano ${out.length} rekordów do ${OUT}`);
}

main();
