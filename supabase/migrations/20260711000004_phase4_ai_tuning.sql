-- Phase 4: AI Tuning columns on shops
alter table shops
  add column if not exists tone_formal_casual integer not null default 50 check (tone_formal_casual between 0 and 100),
  add column if not exists tone_concise_detailed integer not null default 30 check (tone_concise_detailed between 0 and 100),
  add column if not exists tone_professional_warm integer not null default 20 check (tone_professional_warm between 0 and 100),
  add column if not exists language_mix text not null default 'en' check (language_mix in ('bn', 'en', 'bn_en_mix')),
  add column if not exists emoji_frequency text not null default 'none' check (emoji_frequency in ('none', 'light', 'heavy')),
  add column if not exists max_discount_pct numeric not null default 0 check (max_discount_pct >= 0 and max_discount_pct <= 100),
  add column if not exists auto_escalate_on_complaint boolean not null default true,
  add column if not exists confidence_fallback text not null default 'say_checking' check (confidence_fallback in ('guess', 'say_checking', 'escalate')),
  add column if not exists disclose_ai_if_asked boolean not null default true;

-- Example replies for few-shot prompting
create table if not exists example_replies (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_message text not null,
  ideal_reply text not null,
  created_at timestamptz not null default now()
);
alter table example_replies enable row level security;
create policy "Owner can manage own example_replies"
  on example_replies for all
  using (user_owns_shop(shop_id));
