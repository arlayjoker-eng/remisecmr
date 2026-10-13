# Arquitectura: clon de Kami, fase 1 (editor de PDF)

Estado: borrador sobre un recon incompleto (ver recon.md). Se revisa al verificar Kami.

## Stack (una línea de porqué cada uno)
| capa | elección | por qué |
| --- | --- | --- |
| web | Next.js (App Router) + TypeScript | mismo stack que remisecmr, SSR y rutas API |
| PDF | PDF.js (pdfjs-dist) para renderizar | estándar abierto, funciona en el navegador |
| anotaciones | capa canvas/SVG propia sobre cada página | control total de herramientas y estilos |
| exportar | pdf-lib | incrusta las anotaciones en un PDF nuevo en el cliente |
| estilos | Tailwind con tokens de /replica-design | consistencia |
| base de datos | Postgres (Neon o Supabase) + Prisma | ya usas Prisma |
| archivos | Supabase Storage o Cloudflare R2 | PDFs de alumnos, con límite de tamaño |
| auth (fase 2) | Auth.js con Google | necesario para Classroom |
| hosting | Vercel | despliegue directo desde GitHub |

Sin microservicios. Una base de datos.

## Esquema (fase 1)
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'student' check (role in ('student','teacher','admin')),
  created_at timestamptz not null default now()
);
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null,
  storage_key text not null,
  page_count int not null check (page_count > 0),
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on documents (owner_id, updated_at desc);
create table annotations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  page int not null check (page >= 1),
  kind text not null check (kind in ('text','highlight','underline','ink','shape','image')),
  data jsonb not null,           -- coordenadas normalizadas 0..1 y estilo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on annotations (document_id, page);
```
Acceso: cada consulta comprueba que `owner_id` (o el autor) es el usuario de la sesión. Se prueba con un segundo usuario, que no debe ver nada.

## Rutas (fase 1)
| método ruta | qué hace | quién | flujo |
| --- | --- | --- | --- |
| POST /api/documents | sube PDF, valida tipo y tamaño (máx. 25 MB) | autenticado | F05 |
| GET /api/documents | lista los del usuario | autenticado | F05 |
| GET /api/documents/:id | metadatos y URL firmada | dueño | F05 |
| GET/PUT /api/documents/:id/annotations | carga y guarda anotaciones | dueño | F05 |
| DELETE /api/documents/:id | borra documento y archivo | dueño | F05 |

Exportar el PDF anotado se hace en el cliente con pdf-lib.

## Partes delicadas
- Coordenadas normalizadas (0..1) para que las anotaciones aguanten cualquier zoom.
- Guardado automático con debounce y control de versiones para no pisar cambios.
- PDFs grandes o protegidos con contraseña: límites y mensajes claros.
- Privacidad escolar: datos de menores. Cumplir COPPA/FERPA/RGPD según el país, sin analítica de terceros que rastree a alumnos.

## Orden de construcción
1. **Rebanada vertical:** subir un PDF, verlo, dibujar a mano alzada, recargar y que siga ahí.
2. Texto, subrayado y resaltado. Deshacer y rehacer.
3. Formas e imágenes, exportar PDF anotado.
4. Biblioteca de documentos, borrar y renombrar.
5. Auth y pruebas de aislamiento entre usuarios.

Siguiente: `/replica-design`.
