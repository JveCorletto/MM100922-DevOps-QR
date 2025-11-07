-- Esquema base para Supabase (Postgres)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text check (role in ('admin','creator')) default 'creator',
  created_at timestamptz default now()
);

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  status text not null check (status in ('draft','published','archived','disabled')) default 'draft',
  publish_at timestamptz,
  close_at timestamptz,
  public_slug text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  type text not null check (type in ('single','multiple','likert','text')),
  question_text text not null,
  required boolean default false,
  options jsonb,
  order_index int default 0
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  submitted_at timestamptz default now(),
  respondent_token text,
  meta jsonb
);

create table if not exists public.response_items (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  value_text text,
  value_numeric numeric,
  value_json jsonb
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null check (action in ('create','publish','archive','disable','update')),
  target_id uuid,
  at timestamptz default now()
);
