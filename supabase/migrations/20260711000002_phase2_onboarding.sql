-- Phase 2: Signup & Onboarding columns
alter table shops
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists onboarding_steps_done text[] not null default '{}';
