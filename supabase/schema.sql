-- Schema do Controle de Depósito (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('supervisor', 'operador')),
  pin_hash text,
  criado_em timestamptz not null default now()
);

-- Um "lote" é um lançamento (fechamento de caixas ou envelopes) até gerar o relatório
create table if not exists lotes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('caixas', 'envelopes')),
  supervisor_id uuid,
  supervisor_nome text,
  criado_em timestamptz not null default now(),
  fechado_em timestamptz,          -- quando o relatório foi gerado
  expira_em timestamptz            -- fechado_em + 24h: depois disso é apagado
);

create table if not exists itens_caixa (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes(id) on delete cascade,
  pdv text not null,
  valor numeric(12, 2) not null default 0,
  operador_id uuid,
  operador_nome text,
  supervisor_id uuid,
  supervisor_nome text,
  criado_em timestamptz not null default now()
);

create table if not exists envelopes (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references lotes(id) on delete cascade,
  codigo text not null,
  valor numeric(12, 2) not null default 0,
  supervisor_id uuid,
  supervisor_nome text,
  criado_em timestamptz not null default now()
);

create index if not exists idx_lotes_aberto on lotes (tipo, supervisor_id) where fechado_em is null;
create index if not exists idx_itens_lote on itens_caixa (lote_id);
create index if not exists idx_env_lote on envelopes (lote_id);

-- Acesso pela chave anon (app interno, login por PIN feito no próprio app)
alter table usuarios enable row level security;
alter table lotes enable row level security;
alter table itens_caixa enable row level security;
alter table envelopes enable row level security;

create policy "app_all" on usuarios for all to anon using (true) with check (true);
create policy "app_all" on lotes for all to anon using (true) with check (true);
create policy "app_all" on itens_caixa for all to anon using (true) with check (true);
create policy "app_all" on envelopes for all to anon using (true) with check (true);

-- Limpeza automática: apaga relatórios 24h depois de gerados (roda a cada 30 min).
-- O app também faz essa limpeza ao abrir; isto garante mesmo se ninguém abrir.
-- Requer a extensão pg_cron (Database > Extensions > pg_cron).
create extension if not exists pg_cron;
select cron.schedule(
  'limpar-relatorios-expirados',
  '*/30 * * * *',
  $$ delete from lotes where expira_em is not null and expira_em < now() $$
);
