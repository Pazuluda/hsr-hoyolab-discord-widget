#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data

run_fetch() {
  local curl_file="$1"
  local expected_kind="$2"
  local output_file="$3"
  local updated_file="$4"
  local tmp_file

  tmp_file="$(mktemp)"

  if [ ! -f "$curl_file" ]; then
    echo "SKIP: $curl_file absent"
    return 0
  fi

  bash "$curl_file" > "$tmp_file"

  node - "$tmp_file" "$expected_kind" "$output_file" "$updated_file" <<'NODE'
const fs = require("fs");

const [inputFile, expectedKind, outputFile, updatedFile] = process.argv.slice(2);
const rawText = fs.readFileSync(inputFile, "utf8");
const json = JSON.parse(rawText);

if (json.retcode !== 0 || !json.data) {
  console.error(JSON.stringify(json, null, 2));
  process.exit(1);
}

const isNote = json.data.current_stamina !== undefined;
const isIndex = json.data.stats !== undefined;

if (expectedKind === "note" && !isNote) {
  throw new Error("La reponse ne ressemble pas a /hkrpg/api/note");
}

if (expectedKind === "index" && !isIndex) {
  throw new Error("La reponse ne ressemble pas a /hkrpg/api/index");
}

fs.writeFileSync(outputFile, JSON.stringify(json, null, 2));
fs.writeFileSync(updatedFile, new Date().toISOString());

console.log(`OK: ${expectedKind} sauvegarde`);
NODE

  rm -f "$tmp_file"
}

# Method without Windows agent:
# 1) Copy the HoYoLAB /hkrpg/api/note request as cURL into hoyo-note-curl.sh
# 2) Copy the HoYoLAB /hkrpg/api/index request as cURL into hoyo-index-curl.sh
run_fetch "./hoyo-note-curl.sh" "note" "data/hoyo-raw.json" "data/updated-at.txt"
run_fetch "./hoyo-index-curl.sh" "index" "data/hoyo-index.json" "data/index-updated-at.txt"
