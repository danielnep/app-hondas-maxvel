#!/usr/bin/env bash
set -euo pipefail
trap 'status=$?; if [ "$status" -ne 0 ]; then echo "[diagnostico] Falha na verificação visual do Chromium, status=$status" >&2; if [ -f artifacts/desktop-dom.html ]; then grep -Eo "location-entry-gate|simulation-rolebar|maxvel-only-brand|Ative sua localização|boot|entry-screen" artifacts/desktop-dom.html | sort | uniq -c >&2 || true; echo "[diagnostico] Cabeçalho do DOM:" >&2; head -c 1000 artifacts/desktop-dom.html >&2; fi; if [ -f /tmp/maxvel-chrome.err ]; then tail -n 25 /tmp/maxvel-chrome.err >&2; fi; fi' ERR
BROWSER="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [ -z "$BROWSER" ]; then
  echo "Nenhum Chromium/Chrome disponível para validação visual" >&2
  exit 1
fi
mkdir -p artifacts
python3 -m http.server 8123 --directory . >/tmp/maxvel-local-server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 2
curl --fail --silent http://127.0.0.1:8123/ >/dev/null
"$BROWSER" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --virtual-time-budget=4500 --dump-dom http://127.0.0.1:8123/ > artifacts/desktop-dom.html 2>/tmp/maxvel-chrome.err
# Entrada operacional real: nenhuma troca de area sem usuario autenticado.
grep -q 'id="live-login-form"' artifacts/desktop-dom.html
grep -q 'maxvel-only-brand' artifacts/desktop-dom.html
grep -q 'name="identifier"' artifacts/desktop-dom.html
grep -q 'name="password"' artifacts/desktop-dom.html
! grep -q 'simulation-rolebar' artifacts/desktop-dom.html
"$BROWSER" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --window-size=1450,1040 --virtual-time-budget=4000 --screenshot=artifacts/desktop.png http://127.0.0.1:8123/ >/dev/null 2>>/tmp/maxvel-chrome.err
"$BROWSER" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --window-size=410,880 --force-device-scale-factor=1 --virtual-time-budget=4000 --screenshot=artifacts/mobile.png http://127.0.0.1:8123/ >/dev/null 2>>/tmp/maxvel-chrome.err
test -s artifacts/desktop.png
test -s artifacts/mobile.png
echo "Navegador renderizou login real do Ronda Pro; capturas desktop/mobile criadas."
