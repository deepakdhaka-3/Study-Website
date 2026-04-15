-- Study Helper schema for Supabase.
-- Run these statements in the Supabase SQL editor.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  topic text,
  question text not null,
  answer text not null,
  source_label text,
  confidence numeric(4, 3) default 1.000,
  keywords text[] default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  question_count int not null default 0,
  score int not null default 0,
  total int not null default 0,
  questions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_entries_topic_idx on public.knowledge_entries using btree (lower(coalesce(topic, '')));
create index if not exists knowledge_entries_question_trgm_idx on public.knowledge_entries using gin (question gin_trgm_ops);
create index if not exists knowledge_entries_answer_trgm_idx on public.knowledge_entries using gin (answer gin_trgm_ops);
create index if not exists knowledge_entries_search_idx on public.knowledge_entries using gin (
  to_tsvector('english', coalesce(topic, '') || ' ' || coalesce(question, '') || ' ' || coalesce(answer, ''))
);

create or replace function public.search_knowledge_entries(
  query_text text,
  match_limit int default 6
)
returns table (
  id uuid,
  topic text,
  question text,
  answer text,
  source_label text,
  confidence numeric,
  updated_at timestamptz
)
language sql
stable
as $$
  select
    k.id,
    k.topic,
    k.question,
    k.answer,
    k.source_label,
    k.confidence,
    k.updated_at
  from public.knowledge_entries k
  where
    to_tsvector('english', coalesce(k.topic, '') || ' ' || coalesce(k.question, '') || ' ' || coalesce(k.answer, '')) @@ plainto_tsquery('english', query_text)
    or k.question ilike '%' || query_text || '%'
    or k.answer ilike '%' || query_text || '%'
    or k.topic ilike '%' || query_text || '%'
  order by
    ts_rank(
      to_tsvector('english', coalesce(k.topic, '') || ' ' || coalesce(k.question, '') || ' ' || coalesce(k.answer, '')),
      plainto_tsquery('english', query_text)
    ) desc,
    k.updated_at desc
  limit match_limit;
$$;

alter table public.knowledge_entries enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists "knowledge_entries_read" on public.knowledge_entries;
create policy "knowledge_entries_read"
on public.knowledge_entries
for select
to anon, authenticated
using (true);

drop policy if exists "quiz_attempts_read" on public.quiz_attempts;
create policy "quiz_attempts_read"
on public.quiz_attempts
for select
to anon, authenticated
using (true);

drop policy if exists "quiz_attempts_insert" on public.quiz_attempts;
create policy "quiz_attempts_insert"
on public.quiz_attempts
for insert
to anon, authenticated
with check (true);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists knowledge_entries_touch_updated_at on public.knowledge_entries;
create trigger knowledge_entries_touch_updated_at
before update on public.knowledge_entries
for each row
execute function public.touch_updated_at();

