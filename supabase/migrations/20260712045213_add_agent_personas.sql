-- Curated by Dull Studio, not editable by individual shops
create table agent_personas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null,                    -- e.g. "The veteran page manager"
  avatar_url text,
  job_function text not null,               -- 'reassurer' | 'explainer' | 'closer' | 'problem_solver' | 'caretaker' | 'advisor' | 'negotiator' | 'professional'
  personality_traits text[] not null,       -- short tags for gallery display
  best_for text[] not null,                 -- category tags: 'fashion','electronics','food', etc.
  language_style text not null,             -- 'bangla_heavy' | 'banglish' | 'english' | 'formal_bangla'
  
  -- Full casting document — the canonical source, used to build the cached system prompt
  full_specification text not null,         -- the complete rich character doc
  
  -- Extracted fields for the gallery preview UI (denormalized from full_specification for fast display)
  preview_dialogue jsonb not null,          -- 2-3 example {customer_message, reply} pairs for the picker UI
  disclosure_line text not null,            -- the honest, in-character "yes I'm an AI" response
  
  active boolean default true,
  created_at timestamptz default now()
);

alter table shops add column if not exists persona_id uuid references agent_personas(id);
alter table shops add column if not exists persona_custom_name text;
alter table shops add column if not exists persona_updated_at timestamptz not null default now();

alter table shops add column if not exists disclosure_mode text not null default 'reactive_honest'
  check (disclosure_mode in ('reactive_honest', 'proactive_upfront', 'playful_deflect_once'));
  
alter table shops add column if not exists prompt_cache_ref text;
alter table shops add column if not exists prompt_cache_expires_at timestamptz;
