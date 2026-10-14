#!/usr/bin/env bash
set -euo pipefail
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
# A página inicial exibe o convite à demonstração; a cortina GPS aparece
# apenas depois do clique real de um visitante em "Explorar demonstração".
grep -q 'entry-screen' artifacts/desktop-dom.html
grep -q 'maxvel-only-brand' artifacts/desktop-dom.html
grep -q 'Explorar demonstração' artifacts/desktop-dom.html
! grep -q 'id="login-form"' artifacts/desktop-dom.html
"$BROWSER" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --window-size=1450,1040 --virtual-time-budget=4000 --screenshot=artifacts/desktop.png http://127.0.0.1:8123/ >/dev/null 2>>/tmp/maxvel-chrome.err
"$BROWSER" --headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-first-run --window-size=410,880 --force-device-scale-factor=1 --virtual-time-budget=4000 --screenshot=artifacts/mobile.png http://127.0.0.1:8123/ >/dev/null 2>>/tmp/maxvel-chrome.err
test -s artifacts/desktop.png
test -s artifacts/mobile.png
echo "Navegador renderizou a entrada direta do app com identidade exclusiva Maxvel; capturas criadas."
