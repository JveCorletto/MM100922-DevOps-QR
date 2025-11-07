# Sistema de Encuestas con QR (MVP)

Stack: Next.js 14 (App Router), Supabase (Auth, Postgres, Storage), Vercel, GitHub Actions.

## Funcionalidades (MVP)
- Autenticación: email/contraseña + Magic Link. Placeholder para TOTP (próx. sprint).
- Gestión de encuestas: crear, editar (builder básico) y publicar.
- QR/Enlace público: slug público `/s/:slug` (placeholder).
- Respuestas anónimas (vía API/SQL y RLS incluidos).
- Analítica básica (placeholder), exportación CSV (pendiente).
- /status para smoke test post-deploy.

## Instalación
```bash
npm i
cp .env.example .env.local  # agrega tus claves de Supabase
npm run dev
```

Variables necesarias:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE` (solo servidor/CI)

## Base de datos (Supabase)
Ejecuta en el SQL Editor:
- `scripts/supabase_schema.sql`
- `scripts/supabase_policies.sql`

Crea tu perfil al registrarte con Auth insertando una fila en `public.profiles` con tu `auth.uid()` y rol `creator` o `admin`.

## Deploy
- Vercel: proyecto de Next.js. Añade env vars. Conecta el repo.
- CI/CD: al hacer push a `main`, construye y despliega vía GitHub Actions + Vercel CLI.

## Roadmap corto (según TDR)
- TOTP con flujo de alta/rotación/desactivación.
- Prevención de múltiples respuestas por dispositivo (cookie/token).
- Analítica por pregunta con gráficos y exportación CSV.
- Panel Admin (alta/baja de encuestas, roles, auditoría).
