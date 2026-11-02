#!/bin/zsh
set -e
cd -- "${0:A:h}"
print 'Приложение: http://127.0.0.1:8765'
print 'Остановить сервер: Ctrl+C'
python3 -m http.server 8765 --bind 127.0.0.1 --directory app
