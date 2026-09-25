"""Carga inicial: python -m app.seed [ruta.json]

Importa el objeto DATA del portal (por defecto app/seed/portal_data.json) a
la base configurada en DATABASE_URL. Reemplaza el contenido de los clientes
que vengan en el archivo; no toca usuarios, decisiones ni intereses.
"""

import json
import sys
from pathlib import Path

from app.database import SessionLocal
from app.portal_data import importar

DEFAULT = Path(__file__).parent / "seed" / "portal_data.json"


def main() -> None:
    ruta = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    data = json.loads(ruta.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        print(json.dumps(importar(db, data), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
