-- ============================================================
-- Manejo CRM — Supabase schema
-- Paste this whole file into Supabase Studio → SQL Editor → Run.
-- Safe to re-run: every statement is idempotent (create-if-not-exists /
-- drop-and-recreate for policies/triggers).
-- ============================================================

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- profiles — one row per authenticated person, drives RLS.
-- role='rep'   -> full read/write on everything (Bruno + future teammates)
-- role='client'-> reserved for the future client portal; not used yet.
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'rep' check (role in ('rep', 'client')),
  client_id uuid, -- only meaningful when role='client'; deliberately no FK (see client_id note below)
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "self read" on public.profiles;
create policy "self read" on public.profiles
  for select using (id = auth.uid());

-- security definer so RLS on profiles itself doesn't recurse when other
-- tables' policies call this function.
create or replace function public.is_rep(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p where p.id = uid and p.role = 'rep'
  );
$$;

-- New auth user -> auto-provision a profile row, defaulting to 'rep'.
-- Flipping someone to role='client' (future client portal) is a manual
-- one-time update after their first login, not handled here.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'rep', coalesce(new.raw_user_meta_data ->> 'name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Root entity tables — no parent, whole record kept verbatim in `data`.
-- ------------------------------------------------------------

create table if not exists public.leads (
  id uuid primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.leads enable row level security;
drop policy if exists "reps full access" on public.leads;
create policy "reps full access" on public.leads
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create table if not exists public.clientes_ativos (
  id uuid primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.clientes_ativos enable row level security;
drop policy if exists "reps full access" on public.clientes_ativos;
create policy "reps full access" on public.clientes_ativos
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists clientes_ativos_set_updated_at on public.clientes_ativos;
create trigger clientes_ativos_set_updated_at before update on public.clientes_ativos
  for each row execute function public.set_updated_at();

create table if not exists public.consultores (
  id uuid primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.consultores enable row level security;
drop policy if exists "reps full access" on public.consultores;
create policy "reps full access" on public.consultores
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists consultores_set_updated_at on public.consultores;
create trigger consultores_set_updated_at before update on public.consultores
  for each row execute function public.set_updated_at();

create table if not exists public.fornecedores (
  id uuid primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.fornecedores enable row level security;
drop policy if exists "reps full access" on public.fornecedores;
create policy "reps full access" on public.fornecedores
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists fornecedores_set_updated_at on public.fornecedores;
create trigger fornecedores_set_updated_at before update on public.fornecedores
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Child entity tables — `client_id` may point at a leads.id OR a
-- clientes_ativos.id (a record can be logged against a lead before it
-- converts). Deliberately NO foreign key constraint: the app itself
-- never validated this either, and a real FK would need a polymorphic-
-- parent scheme this data doesn't warrant. Indexed for RLS/joins/pull
-- queries only.
-- ------------------------------------------------------------

create table if not exists public.pedidos (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists pedidos_client_id_idx on public.pedidos (client_id);
alter table public.pedidos enable row level security;
drop policy if exists "reps full access" on public.pedidos;
create policy "reps full access" on public.pedidos
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists pedidos_set_updated_at on public.pedidos;
create trigger pedidos_set_updated_at before update on public.pedidos
  for each row execute function public.set_updated_at();

create table if not exists public.contatos (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists contatos_client_id_idx on public.contatos (client_id);
alter table public.contatos enable row level security;
drop policy if exists "reps full access" on public.contatos;
create policy "reps full access" on public.contatos
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists contatos_set_updated_at on public.contatos;
create trigger contatos_set_updated_at before update on public.contatos
  for each row execute function public.set_updated_at();

create table if not exists public.competitivas (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists competitivas_client_id_idx on public.competitivas (client_id);
alter table public.competitivas enable row level security;
drop policy if exists "reps full access" on public.competitivas;
create policy "reps full access" on public.competitivas
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists competitivas_set_updated_at on public.competitivas;
create trigger competitivas_set_updated_at before update on public.competitivas
  for each row execute function public.set_updated_at();

create table if not exists public.upsells (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists upsells_client_id_idx on public.upsells (client_id);
alter table public.upsells enable row level security;
drop policy if exists "reps full access" on public.upsells;
create policy "reps full access" on public.upsells
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists upsells_set_updated_at on public.upsells;
create trigger upsells_set_updated_at before update on public.upsells
  for each row execute function public.set_updated_at();

create table if not exists public.sacs (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists sacs_client_id_idx on public.sacs (client_id);
alter table public.sacs enable row level security;
drop policy if exists "reps full access" on public.sacs;
create policy "reps full access" on public.sacs
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists sacs_set_updated_at on public.sacs;
create trigger sacs_set_updated_at before update on public.sacs
  for each row execute function public.set_updated_at();

create table if not exists public.compromissos (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists compromissos_client_id_idx on public.compromissos (client_id);
alter table public.compromissos enable row level security;
drop policy if exists "reps full access" on public.compromissos;
create policy "reps full access" on public.compromissos
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists compromissos_set_updated_at on public.compromissos;
create trigger compromissos_set_updated_at before update on public.compromissos
  for each row execute function public.set_updated_at();

create table if not exists public.estoques (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists estoques_client_id_idx on public.estoques (client_id);
alter table public.estoques enable row level security;
drop policy if exists "reps full access" on public.estoques;
create policy "reps full access" on public.estoques
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists estoques_set_updated_at on public.estoques;
create trigger estoques_set_updated_at before update on public.estoques
  for each row execute function public.set_updated_at();

create table if not exists public.visitas (
  id uuid primary key,
  client_id uuid,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists visitas_client_id_idx on public.visitas (client_id);
alter table public.visitas enable row level security;
drop policy if exists "reps full access" on public.visitas;
create policy "reps full access" on public.visitas
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists visitas_set_updated_at on public.visitas;
create trigger visitas_set_updated_at before update on public.visitas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- propostas — the one child table with a real, safe FK: a proposal is
-- only ever created from the lead pipeline, never after conversion.
-- ------------------------------------------------------------

create table if not exists public.propostas (
  id uuid primary key,
  lead_id uuid references public.leads(id) on delete cascade,
  updated_at timestamptz not null default now(),
  data jsonb not null
);
create index if not exists propostas_lead_id_idx on public.propostas (lead_id);
alter table public.propostas enable row level security;
drop policy if exists "reps full access" on public.propostas;
create policy "reps full access" on public.propostas
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists propostas_set_updated_at on public.propostas;
create trigger propostas_set_updated_at before update on public.propostas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- app_settings — single fixed-id row bundling every global/singleton
-- bit of state (config, metaVisitasMes, avaliacaoCompetitiva,
-- estoqueAlertasDispensados, roteiroDispensados). No independent
-- lifecycle, so one row beats five near-empty tables.
-- ------------------------------------------------------------

create table if not exists public.app_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  updated_at timestamptz not null default now(),
  data jsonb not null
);
alter table public.app_settings enable row level security;
drop policy if exists "reps full access" on public.app_settings;
create policy "reps full access" on public.app_settings
  for all using (public.is_rep(auth.uid())) with check (public.is_rep(auth.uid()));
drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Seed the singleton row so the app can always upsert-by-id against it.
insert into public.app_settings (id, data)
values ('00000000-0000-0000-0000-000000000001', '{}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Storage — private bucket for visit photos + representative logo.
-- Access gated by the same is_rep() helper via storage.objects RLS.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('fotos', 'fotos', false)
on conflict (id) do nothing;

drop policy if exists "reps read fotos" on storage.objects;
create policy "reps read fotos" on storage.objects
  for select using (bucket_id = 'fotos' and public.is_rep(auth.uid()));

drop policy if exists "reps write fotos" on storage.objects;
create policy "reps write fotos" on storage.objects
  for insert with check (bucket_id = 'fotos' and public.is_rep(auth.uid()));

drop policy if exists "reps update fotos" on storage.objects;
create policy "reps update fotos" on storage.objects
  for update using (bucket_id = 'fotos' and public.is_rep(auth.uid()));

drop policy if exists "reps delete fotos" on storage.objects;
create policy "reps delete fotos" on storage.objects
  for delete using (bucket_id = 'fotos' and public.is_rep(auth.uid()));

-- ============================================================
-- Done. Next step: open the app, sign in via magic link once —
-- that creates your auth.users row and (via the trigger above) your
-- profiles row with role='rep' automatically.
-- ============================================================
