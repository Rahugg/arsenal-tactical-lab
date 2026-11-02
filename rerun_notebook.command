#!/bin/zsh
set -e
cd -- "${0:A:h}"
if [[ ! -x .venv/bin/python ]]; then
  print 'Сначала установите окружение по README.md.'
  exit 1
fi
.venv/bin/python - <<'PY'
from pathlib import Path
import nbformat
from nbclient import NotebookClient
path = Path('Arsenal_Tactical_Lab.ipynb')
notebook = nbformat.read(path, as_version=4)
try:
    NotebookClient(notebook, timeout=1200, kernel_name='python3',
                   resources={'metadata': {'path': str(Path.cwd())}}).execute()
finally:
    nbformat.write(notebook, path)
print('Все ячейки выполнены. Результаты, графики и данные приложения обновлены.')
PY
