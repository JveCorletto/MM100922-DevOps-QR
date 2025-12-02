# Sistema de Encuestas con QR

Aplicación web para crear encuestas, publicarlas mediante enlace o código QR y gestionar los resultados, construida como caso de estudio para la materia **“Analizando las necesidades de hardware y software”**.

Stack principal: **Next.js 14 (App Router) + Supabase (Auth, Postgres, RLS) + Vercel + GitHub Actions**.

---

## 1. Funcionalidades actuales

### 1.1. Autenticación y gestión de usuarios

- **Registro de usuarios**
  - Formulario de alta con:
    - Correo electrónico
    - Contraseña y confirmación
    - Nombres y apellidos
    - Teléfono
    - Género
    - Fecha de nacimiento
  - Validaciones básicas en cliente (longitud mínima de contraseña, coincidencia de contraseñas, campos obligatorios).
  - Envío de **correo de verificación** con redirección a `/surveys` después de confirmar.

- **Inicio de sesión**
  - Login con **correo + contraseña**.
  - Login mediante **Magic Link** (enlace enviado al correo).
  - Verificación de sesión al cargar la página de login para redirigir si ya está autenticado.
  - Sesión gestionada con **Supabase SSR** (cookies seguras en el servidor).

- **Navegación autenticada**
  - Barra de navegación responsive:
    - Link a “Mis encuestas”.
    - Acceso a “Mi perfil”.
    - Botón **Cerrar sesión**.
  - Menú adaptable a móvil (mobile-first).

- **Perfil de usuario**
  - Visualización del correo asociado a la cuenta.
  - Edición de:
    - Nombre visible (`display_name`)
    - Teléfono
    - Género
    - Fecha de nacimiento
  - Botón para solicitar **cambio de contraseña por correo**.
  - Página dedicada para **actualizar contraseña** autenticado (`/auth/update-password`).

---

### 1.2. Gestión de encuestas

- **Listado de encuestas**
  - Vista `/surveys` protegida (requiere sesión).
  - Listado de encuestas del usuario autenticado, ordenadas por fecha de creación.
  - Estado de cada encuesta:
    - `Borrador` (`draft`)
    - `Publicado` (`published`)
  - Información mostrada:
    - Título
    - Descripción (opcional)
    - Fecha de creación
  - Acciones rápidas:
    - Editar encuesta
    - Ir al formulario público (cuando está publicada)
    - Copiar enlace público al portapapeles

- **Creación de encuestas**
  - Página `/surveys/new`:
    - Título (obligatorio)
    - Descripción (opcional)
  - Alta vía endpoint `POST /api/surveys`.
  - La encuesta se crea inicialmente en estado **`draft`**.

- **Edición de encuestas**
  - Página `/surveys/[id]/edit`:
    - Edición de:
      - Título
      - Descripción
    - Botón **Guardar** (actualiza vía `PUT /api/surveys/[id]`).
    - Botón **Publicar**:
      - Genera `slug` único.
      - Cambia estado a `published`.
      - Actualiza la UI con el nuevo estado.

---

### 1.3. Constructor de preguntas

Basado en la tabla `public.survey_questions`:

- Cada pregunta contiene:
  - `type`: tipo de pregunta
  - `question_text`: enunciado
  - `required`: si es obligatoria
  - `options`: opciones (según tipo)
  - `order_index`: para el orden de presentación

- **Tipos de pregunta soportados (según esquema y UI actual):**
  - `text` → respuesta de texto libre
  - `single` → opción única (radio)
  - `multiple` → opción múltiple
  - `likert` → escala tipo Likert
  - `checkbox` → casillas de verificación (internamente tratadas como opciones con lista)

- **Operaciones disponibles**
  - Listar preguntas de una encuesta:
    - `GET /api/surveys/[id]/questions`
  - Crear nueva pregunta:
    - `POST /api/surveys/[id]/questions`
    - En el editor:
      - Selección del tipo
      - Marcado como obligatoria o no
      - Enunciado
      - Opciones (según tipo)
  - Editar pregunta existente:
    - `PUT /api/surveys/[id]/questions/[qid]`
    - Posibilidad de cambiar:
      - Tipo de pregunta
      - Enunciado
      - Opciones
      - Campo `required`
  - Eliminar pregunta:
    - `DELETE /api/surveys/[id]/questions/[qid]`
    - Confirmación en la UI antes de borrar.

---

### 1.4. Publicación, enlaces y QR

- **Slug público**
  - Al publicar una encuesta se genera un `slug` único.
  - Si el slug calculado ya existe, se añade sufijo aleatorio hasta encontrar uno disponible.
  - URL pública final: `/s/:slug`.

- **Página pública de encuesta**
  - Ruta: `/s/[slug]`.
  - Actualmente muestra:
    - Título “Encuesta pública”
    - Slug recibido
    - Mensaje indicando que aquí se debe renderizar el formulario y enviar respuestas anónimas.
  - **Estado actual:** página de **formulario público aún en construcción** (placeholder en UI).

- **QR Code**
  - En el editor de encuesta:
    - Se muestra sección **“QR & Enlace público”** cuando la encuesta está publicada.
    - Se genera QR en tiempo real a partir de la URL pública.
    - Funcionalidades:
      - Mostrar la URL pública.
      - Copiar enlace al portapapeles.
      - Previsualizar el QR.
      - **Descargar el QR** como imagen PNG (con nombre `qr-<slug>.png`).

---

### 1.5. Respuestas y analítica

- **Modelo de datos (implementado en BD)**
  - Tabla `public.responses`:
    - `survey_id`
    - `submitted_at`
    - `respondent_token`
    - `meta` (JSON con información adicional del dispositivo/cliente).
  - Tabla `public.response_items`:
    - `response_id`
    - `question_id`
    - `value_text`
    - `value_numeric`
    - `value_json`

- **Seguridad sobre respuestas**
  - Políticas RLS configuradas para:
    - Permitir **inserción anónima** de respuestas (rol `anon`) a encuestas publicadas.
    - Permitir lectura de respuestas y response_items únicamente a:
      - Propietario de la encuesta.
      - Administradores (según tabla `profiles`).

- **Analítica**
  - Ruta `/surveys/[id]/analytics`:
    - Página ya creada.
    - Describe objetivo: gráficos por pregunta y exportación a CSV.
    - **Estado actual:** funcionalidad de analítica aún **en construcción** (texto placeholder, sin gráficos ni export todavía).

---

### 1.6. Auditoría y roles

- Tabla `public.profiles`:
  - Un registro por usuario (`id` referencia a `auth.users`).
  - Rol:
    - `admin`
    - `creator` (por defecto)
  - `display_name` y metadatos de perfil.

- Tabla `public.audit_log`:
  - Registra acciones como:
    - `create`
    - `publish`
    - `archive`
    - `disable`
    - `update`
  - Campos:
    - `actor_id`
    - `action`
    - `target_id`
    - `at` (timestamp)

- Políticas RLS para `audit_log`:
  - Admin puede leer todos los registros.
  - Cada usuario puede ver auditoría asociada a sus propias encuestas.

---

### 1.7. Salud y DevOps

- Endpoint `/status`:
  - Respuesta JSON con:
    - `ok: true`
    - `time`: timestamp ISO
    - `version`: versión de la app (ej. `0.1.0`)
  - Usado como **smoke test** post-deploy.

- GitHub Actions:
  - Workflow `.github/workflows/deploy.yml`:
    - Corre en pushes y PRs a `main`.
    - Pasos:
      - `npm ci`
      - `npm run lint`
      - `npm run typecheck`
      - `npm run build`
    - Deploy a **Vercel** con `vercel deploy --prod` usando `VERCEL_TOKEN` en secretos.

---

## 2. Arquitectura y stack

- **Frontend / Backend**
  - Next.js 14 con **App Router**.
  - Rutas de página (`/`, `/surveys`, `/auth/...`, `/profile`, etc.).
  - Rutas API (`/api/surveys/*`) para operaciones de negocio.
  - Diseño **mobile-first**, estilos con Tailwind + CSS global.

- **Base de datos y backend**
  - Supabase (Postgres administrado).
  - Esquema definido en:
    - `scripts/supabase_schema.sql`
  - Seguridad y RLS en:
    - `scripts/supabase_policies.sql`

- **Autenticación**
  - Supabase Auth:
    - Email + contraseña
    - Magic Link
  - Cliente SSR:
    - `lib/supabaseServer.ts` (manejo de cookies en el lado servidor).
  - Cliente browser:
    - `lib/supabaseBrowser.ts`.

- **Seguridad en Next.js**
  - Headers configurados en `next.config.mjs`:
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Referrer-Policy: strict-origin-when-cross-origin`

- **Dependencias destacadas**
  - `next`, `react`, `react-dom`
  - `@supabase/ssr`, `@supabase/supabase-js`
  - `react-hook-form`
  - `react-hot-toast`
  - `qrcode`, `qrcode.react`
  - `@radix-ui/react-accordion` (para UI avanzada de preguntas)
  - `tailwindcss` + utilidades

---

## 3. Requisitos de hardware y software (para la materia)

Resumen rápido; el detalle está en `docs/req_hardware_software.md`.

- **Servidor / Hosting**
  - Vercel (Free o Pro) para la app Next.js.
  - Supabase gestionado para Postgres + Auth.

- **Equipo de desarrollo local**
  - 8–16 GB de RAM.
  - Windows 10/11 o alguna distribución Linux.
  - Navegador moderno (Chrome, Edge, Firefox, etc.).

- **Software necesario**
  - Node.js LTS.
  - npm o pnpm.
  - Git.
  - VS Code (o IDE equivalente).
  - Supabase CLI (opcional, para tareas locales).
  - Vercel CLI (para despliegues desde consola).
  - GitHub (para repositorio y CI/CD).

- **Metas de rendimiento / disponibilidad**
  - Tiempo de respuesta p95 en vistas públicas: **< 300 ms**.
  - Disponibilidad objetivo mensual: **99.5%**.

- **Seguridad**
  - Tráfico sobre **HTTPS**.
  - Cookies seguras y manejo de sesión en servidor.
  - **Row Level Security (RLS)** sobre tablas sensibles.
  - Políticas de lectura/escritura diferenciadas para:
    - anónimos (respuestas),
    - usuarios autenticados (creadores),
    - administradores.
  - Backups automáticos de la base de datos (a nivel Supabase).

Para más detalle, ver: `docs/req_hardware_software.md`.

---

## 4. Configuración y ejecución en local

### 4.1. Clonar y dependencias

```bash
git clone <url-del-repo>
cd MM100922-DevOps-QR
npm install