# Core · Value OS

Plataforma de gestión financiera. Este repo traduce el prototipo de alta
fidelidad (`docs/prototipo-v2.html`) en una aplicación real, siguiendo el
plan de arquitectura en `docs/arquitectura-plan.docx`.

## Estado: Fase 0 — Fundaciones ✅

Lo que ya existe y está verificado:

- **Backend** (`backend/`, FastAPI + SQLAlchemy + Alembic): responde, guarda
  en base de datos y el login funciona.
  - Modelo de datos: `Empresa`, `Usuario`, `Periodo`, `Saldo`, `Indicador`
    (ver sección 3 del plan de arquitectura).
  - Endpoints: `POST /empresas`, `POST /usuarios`, `POST /auth/login`,
    `GET /usuarios/me`, `GET /health`.
  - Validado end-to-end contra **Postgres real (Neon, proyecto "CORE")**:
    crear una empresa, crear un usuario con RUC y rol, iniciar sesión y
    obtener un token válido.
- **Frontend** (`frontend/`, Next.js + TypeScript + Tailwind): esqueleto que
  verifica la conexión al backend.

Lo que falta (Fase 1 en adelante, ver `docs/arquitectura-plan.docx`): migrar
el motor de cálculo del prototipo (EVA, WACC, capital de trabajo, etc.) al
backend, conectar fuentes reales (Concar, SUNAT, bancos, PLAME), y construir
el módulo de Contabilidad de punta a punta como primera "rebanada vertical".

## Cómo correrlo

### Backend

```bash
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Primera vez / tras cambios al modelo de datos:

```bash
cd backend
cp .env.example .env          # .env ya trae la conexión a Neon (no se sube a git)
./venv/Scripts/python.exe -m alembic upgrade head
```

`backend/.env` ya apunta al proyecto **Neon "CORE"** (Postgres real). Si prefieres
desarrollar sin depender de la red, descomenta la línea `DATABASE_URL=sqlite:///./core.db`
en ese archivo y corre `alembic upgrade head` de nuevo para crear el esquema local.

Por defecto usa SQLite local (`backend/core.db`, cero configuración). Para
Postgres gestionado (Neon/Supabase, según el plan), pon la connection string
en `backend/.env` como `DATABASE_URL=postgresql+psycopg://...` y corre
`alembic upgrade head` de nuevo.

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm run dev
```

Abre http://localhost:3000 — debe mostrar "Conectado" si el backend está
corriendo en el puerto 8000.

> Nota: en esta máquina el servidor de desarrollo de Next.js (Turbopack) se
> ha visto inestable por poca RAM libre del sistema (~500MB con otras apps
> abiertas). Si `npm run dev` se cae con "out of memory", cierra otras
> aplicaciones antes de levantarlo.

## Estructura

```
core-value-os/
├── backend/          FastAPI · SQLAlchemy · Alembic
│   ├── app/
│   │   ├── models.py       modelo de datos (empresas, usuarios, periodos...)
│   │   ├── schemas.py      contratos de la API (Pydantic)
│   │   ├── auth.py         hashing de passwords + JWT
│   │   ├── routers/        endpoints por recurso
│   │   └── main.py
│   └── alembic/versions/   migraciones del esquema
├── frontend/          Next.js · TypeScript · Tailwind
└── docs/
    ├── arquitectura-plan.docx   plan completo (stack, fases, testing, lanzamiento)
    └── prototipo-v2.html        prototipo de referencia (diseño + motor de cálculo)
```
