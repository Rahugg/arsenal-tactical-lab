#!/bin/zsh
set -e
cd -- "${0:A:h}"
if [[ -x .venv/bin/python ]]; then
  lab_python=.venv/bin/python
elif command -v python3 >/dev/null 2>&1; then
  lab_python=$(command -v python3)
else
  print 'Не найден Python 3. Установите Python 3 и повторите make demo.'
  read '?Нажмите Enter, чтобы закрыть окно…'
  exit 1
fi
"$lab_python" -u - <<'PY'
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os
import sys
import webbrowser

try:
    port = int(os.environ.get('PORT', '8765'))
    if not 1 <= port <= 65535:
        raise ValueError
except ValueError:
    sys.exit('PORT должен быть целым числом от 1 до 65535.')

try:
    server = ThreadingHTTPServer(
        ('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory='app'))
except OSError as error:
    sys.exit(f'Не удалось запустить сервер на порту {port}: {error}\n'
             'Попробуйте другой порт: make demo PORT=8766')

url = f'http://127.0.0.1:{server.server_port}'
print(f'Arsenal Lab: {url}\nОставьте терминал открытым. Остановка: Ctrl+C.')
if os.environ.get('OPEN_BROWSER', '1') != '0':
    try:
        if not webbrowser.open(url):
            print(f'Откройте адрес вручную: {url}')
    except webbrowser.Error:
        print(f'Откройте адрес вручную: {url}')
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\nСервер остановлен.')
finally:
    server.server_close()
PY
