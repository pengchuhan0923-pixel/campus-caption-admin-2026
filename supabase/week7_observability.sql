-- Week 7 observability and configuration schema.
-- Run after week6_admin.sql. Every table is protected by superadmin-only RLS.

create extension if not exists pgcrypto;

create table if not exists public.llm_providers (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  base_url text, is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.llm_models (
  id uuid primary key default gen_random_uuid(), provider_id uuid references public.llm_providers(id) on delete restrict,
  name text not null, slug text not null unique, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.prompt_chains (
  id uuid primary key default gen_random_uuid(), name text not null unique, description text,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.prompt_chain_steps (
  id uuid primary key default gen_random_uuid(), prompt_chain_id uuid not null references public.prompt_chains(id) on delete cascade,
  step_order integer not null check (step_order > 0), name text not null, template text not null,
  created_at timestamptz not null default now(), unique(prompt_chain_id, step_order)
);
create table if not exists public.prompt_chain_mix (
  id uuid primary key default gen_random_uuid(), prompt_chain_id uuid not null unique references public.prompt_chains(id) on delete cascade,
  weight integer not null default 100 check (weight between 0 and 100), updated_at timestamptz not null default now()
);
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(), term text not null unique, category text not null default 'general',
  is_blocked boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.generation_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
  prompt_chain_id uuid references public.prompt_chains(id) on delete set null, input text not null,
  status text not null default 'completed' check(status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
create table if not exists public.llm_responses (
  id uuid primary key default gen_random_uuid(), generation_request_id uuid references public.generation_requests(id) on delete cascade,
  model_id uuid references public.llm_models(id) on delete set null, response_text text,
  latency_ms integer, status_code integer, created_at timestamptz not null default now()
);
create table if not exists public.ai_generation_examples (
  id uuid primary key default gen_random_uuid(), title text not null, input text not null, expected_output text not null,
  is_active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists public.allowed_signup_domains (
  id uuid primary key default gen_random_uuid(), domain text not null unique, is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.whitelisted_emails (
  id uuid primary key default gen_random_uuid(), email text not null unique, note text,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_images (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique, alt_text text not null,
  title text, created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-media', 'admin-media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

do $$ declare table_name text; begin
  foreach table_name in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','generation_requests','llm_responses','ai_generation_examples','allowed_signup_domains','whitelisted_emails','admin_images'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Superadmins manage %s" on public.%I', table_name, table_name);
    execute format('create policy "Superadmins manage %s" on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', table_name, table_name);
  end loop;
end $$;

drop policy if exists "Superadmins manage admin media objects" on storage.objects;
create policy "Superadmins manage admin media objects" on storage.objects for all to authenticated
using (bucket_id='admin-media' and public.is_superadmin())
with check (bucket_id='admin-media' and public.is_superadmin());

-- Seed the currently used provider/model and the live caption prompt chain.
insert into public.llm_providers(name, base_url) values ('OpenAI','https://api.openai.com/v1') on conflict(name) do nothing;
insert into public.llm_models(provider_id,name,slug)
select id,'GPT-6 Luna','gpt-6-luna' from public.llm_providers where name='OpenAI'
on conflict(slug) do nothing;
insert into public.prompt_chains(name,description) values ('Campus Caption','Creates safe, concise campus captions from a scene and vibe.') on conflict(name) do nothing;
insert into public.prompt_chain_steps(prompt_chain_id,step_order,name,template)
select id,1,'Caption generation','Write one original social-media caption for a Columbia University student in New York City. Scene: {{scene}} Vibe: {{vibe}}.'
from public.prompt_chains where name='Campus Caption' on conflict(prompt_chain_id,step_order) do nothing;
insert into public.prompt_chain_mix(prompt_chain_id,weight)
select id,100 from public.prompt_chains where name='Campus Caption' on conflict(prompt_chain_id) do nothing;

-- Backfill observability from existing AI captions without duplicating rows.
insert into public.generation_requests(id,user_id,prompt_chain_id,input,status,created_at)
select gen_random_uuid(), c.created_by, pc.id, coalesce(c.prompt,c.context,c.text), 'completed', c.created_at
from public.captions c cross join public.prompt_chains pc
where c.is_ai_generated=true and pc.name='Campus Caption'
and not exists(select 1 from public.generation_requests gr where gr.created_at=c.created_at and gr.user_id is not distinct from c.created_by);

insert into public.llm_responses(generation_request_id,model_id,response_text,status_code,created_at)
select gr.id, lm.id, c.text, 200, c.created_at
from public.captions c
join public.generation_requests gr on gr.created_at=c.created_at and gr.user_id is not distinct from c.created_by
left join public.llm_models lm on lm.slug=c.model
where c.is_ai_generated=true
and not exists(select 1 from public.llm_responses lr where lr.generation_request_id=gr.id);

create or replace function public.observe_ai_caption() returns trigger
language plpgsql security definer set search_path=public as $$
declare request_id uuid; chain_id uuid; model_id uuid;
begin
  if not new.is_ai_generated then return new; end if;
  select id into chain_id from public.prompt_chains where name='Campus Caption' limit 1;
  select id into model_id from public.llm_models where slug=new.model limit 1;
  insert into public.generation_requests(user_id,prompt_chain_id,input,status,created_at)
  values(new.created_by,chain_id,coalesce(new.prompt,new.context,new.text),'completed',new.created_at)
  returning id into request_id;
  insert into public.llm_responses(generation_request_id,model_id,response_text,status_code,created_at)
  values(request_id,model_id,new.text,200,new.created_at);
  return new;
end $$;
drop trigger if exists observe_ai_caption_after_insert on public.captions;
create trigger observe_ai_caption_after_insert after insert on public.captions
for each row execute function public.observe_ai_caption();
