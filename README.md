# CORE · Portal del cliente

Portal donde cada cliente de CORE ve su empresa (indicadores, fugas de valor, ruta del plan, aprobaciones,
documentos, Analytics y Servicios) y donde el equipo CORE carga y gestiona todo ese contenido.

El diseño y los datos de referencia salen de `docs/CORE_Portal_Cliente.html` (prototipo) — los datos base están
en `backend/app/seed/portal_data.json`.

## Cómo está armado

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 + React (sin Tailwind, CSS del portal) | `frontend/` → Vercel |
| API | FastAPI + SQLAlchemy + Alembic | `backend/` → Render |
| Base de datos | Postgres (Neon) — SQLite en local | `DATABASE_URL` |
| Login | Clerk (correo o Google) | `CLERK_*` |

### Roles
- **Cliente**: ve y opera solo el cliente (grupo) que le asignaron: aprobar/observar, registrar solicitudes,
  registrar envío de documentos, pedir servicios/clases.
- **Admin (equipo CORE)**: entra al **Panel de gestión** (`/admin`) y gestiona todo. Se definen con
  `ADMIN_EMAILS` (backend). Sin esa variable, el primer usuario de una base nueva es admin.

### Modelo de datos
`Cliente` (grupo) → `Empresa` (RUC, con su Analytics y Servicios en JSON) → `Fase`, `Actividad`, `Solicitud`,
`ChecklistItem`, `Fuga`. Por cliente: `KpiDef` + `KpiValor` (un valor por empresa), `Diagnostico` por área.
Globales: `Academia`, `Config`. Lo que hacen los clientes: `Decision` (aprobaciones) e `Interes` (pedidos comerciales).

## Panel de gestión (`/admin`)
- **Inicio = lista de clientes**: cada cliente con sus números (accesos, indicadores, fugas, pendientes) y acciones:
  *Gestionar datos*, *Ver como cliente*, *Crear acceso*, y el modo **Solo consulta / Interactivo**.
- **Ficha del cliente**: Empresas (RUC) · Diagnóstico · Fases · Actividades · Solicitudes · Checklist · Fugas ·
  Indicadores · **Accesos**. Cada una es una tabla con crear/editar/borrar. Los indicadores se editan por empresa
  (texto mostrado + número de la gráfica) y en cada empresa, **Analytics y Servicios** tiene formularios guiados para
  todas sus cifras (palancas, rentabilidad, blindaje, dinero por recuperar…). Al guardar, el portal se recalcula.
- **Accesos (usuario y clave)**: crea el login de un cliente (usuario = RUC sugerido) con una clave generada de 16
  caracteres que se muestra **una sola vez**; permite generar una nueva o eliminar el acceso. Se crea en Clerk por
  API (correo interno verificado `usuario@ACCESS_EMAIL_DOMAIN`, sin códigos). Para entrar con el *usuario* hay que
  activar *Username* como identificador de inicio de sesión en Clerk; si no, se entra con el correo interno.
- **Solo consulta (por defecto)**: el cliente ve todo pero no puede aprobar, solicitar, enviar documentos ni pedir
  servicios (el backend responde 403). El modo *Interactivo* se activa por cliente.
- **Usuarios**: asignar a cada persona su cliente y su rol.
- **Actividad de clientes**: aprobaciones/observaciones (se pueden reabrir) y pedidos comerciales.
- **Academia**: capacitaciones globales.
- **Importar / exportar**: cargar los datos base con un clic, importar un JSON completo o descargar respaldo.
- Desde cualquier cliente: **Ver como cliente**.

## Correr en local
```bash
# Backend
cd backend
cp .env.example .env               # DATABASE_URL=sqlite:///./core.db para local
./venv/Scripts/python.exe -m alembic upgrade head
./venv/Scripts/python.exe -m app.seed          # carga los datos base (opcional)
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8100

# Frontend
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL + claves de Clerk
npm run dev                        # http://localhost:3100
```
Puertos: frontend **3100**, API **8100** (evitan chocar con otros proyectos en 3000/8000). Si los cambia,
ajuste `-p` en `frontend/package.json`, `NEXT_PUBLIC_API_URL` y `ALLOWED_ORIGINS`.
Pruebas del backend: `./venv/Scripts/python.exe -m pytest` (importación ida y vuelta con los datos reales,
permisos por cliente, flujos del cliente y CRUD admin).

## Producción
- **Render** (`render.yaml`): al arrancar corre `alembic upgrade head`. Variables: `DATABASE_URL` (Neon),
  `CLERK_SECRET_KEY`, `CLERK_ISSUER`, `ADMIN_EMAILS`, `ALLOWED_ORIGINS` (URL del frontend).
- **Vercel** (o Netlify, ver `netlify.toml`): raíz `frontend`. Variables: `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`,
  `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`, `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/portal`,
  `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/portal`.
- La migración `d2fc57519205` **reemplaza** las tablas del prototipo financiero anterior (solo tenían datos de prueba).
  Tras desplegar, entre a `/admin/importar` y use **Cargar datos base**.

## Pendiente conocido
- **Archivos del checklist**: hoy se registra nombre y enlace (Drive/OneDrive). Subida directa requiere definir
  el almacenamiento (Drive del cliente, S3/R2…).
- **Analytics y Servicios por empresa** se editan como JSON en la pestaña Empresas; un formulario guiado es un
  paso siguiente.
- Notificar por correo cuando un cliente aprueba/observa o pide un servicio.
