# DullBot — Agent Handoff State

**Read this file first, before exploring the codebase.** Update it before 
ending any session. This is the single source of truth for "what's 
actually true right now" across model/tool switches.

## What DullBot is
B2B SaaS chatbot platform for Bangladeshi small businesses. Centrally-owned 
Gemini API key, token-metered billing (not BYO-key). Businesses select an 
AI persona to run their Messenger customer chat.

## Confirmed solid (verified with real evidence, not just claimed)
- Model: `gemini-3.1-flash-lite` — DO NOT switch to gemini-3.5-flash, it's 
  ~6x more expensive and was already tried/reverted once.
- Pre-filter (zero-cost replies for greetings/stock/price/hours) — working.
- Output token cap (400) — tested against all 10 personas, no truncation.
- 10 personas built with short-answer examples + native Bengali guardrail 
  phrasing (not translated English rules) — verified via real webhook tests.
- Guardrails rebuilt: discount toggle, escalation sensitivity, confidence 
  fallback, AI disclosure mode, voice message toggle, abusive-customer 
  handling, high-value order review threshold.
- Onboarding v2 rebuild (strict gate `onboarding_step === 'complete'`, 3 business types: retail/restaurant/service, channel-first wizard with Messenger gate & IG/WA options, Facebook page auto-fill, restaurant location & table booking prompts, bulk pricing note/escalation guardrails, live demo preview, unlock animation, and admin funnel view) — built and verified clean `npm run build`.

## Key decisions — don't re-litigate these
- Explicit Gemini context caching does NOT apply — prompts are too small 
  (under the 2,048-4,096 token minimum). Implicit caching is automatic, no 
  code needed. Don't re-attempt explicit caching without a real reason to 
  revisit.
- Meta's CONFIRMED_EVENT_UPDATE tag is deprecated (April 27, 2026, returns 
  error 100). Proactive reminders outside a customer's 24h window need 
  Utility Templates (manual approval in Meta Business Manager), not that tag.
- business_type values: 'retail' (merged with former 'wholesale' — bulk 
  pricing is now a flag, not a separate type) | 'restaurant' | 'service'.
- AI disclosure: honest if asked, never proactively claims to be human. 
  Non-negotiable, not business-configurable.

## In progress / built but NOT yet verified with real evidence
- Booking/scheduling system (resources, availability, exclusion constraint 
  for double-booking prevention) — code exists, concurrency test script 
  was written but never confirmed run with a real result. VERIFY BEFORE 
  TRUSTING.
- Payment verification (bKash/Nagad, merchant API + Android notification-
  listener companion app) and courier dispatch (5 providers) — built, but 
  no real end-to-end test (real payment + real courier dispatch) has been 
  confirmed with evidence yet.
- Per-variant product images + Context Media tag fix — Stage 1 migration 
  done, Stage 2 (dropping legacy `images` column) is INTENTIONALLY PAUSED 
  pending manual review of real test evidence. Do not run Stage 2 without 
  explicit approval.

## Known unresolved issues
- CSV export from Inventory was reported broken — root cause not yet 
  diagnosed.
- Video compression feasibility on current hosting (Vercel function 
  constraints) — research was requested, result unknown.
- Meta Utility Template registration (needed for proactive reminders 
  outside 24h window) — manual step in Meta Business Manager, completion 
  status unknown.

## Session log
- **2026-07-26**: Completed Onboarding v2 rebuild (strict gate, 7-step wizard, 3 business types, Facebook auto-fill, Step 7 live demo, unlock stagger animation, and admin funnel view). Verified production build clean (`npm run build`). Removed insecure `dull-store` fallback in `getCurrentShop` to prevent unauthenticated user session leaks. Fixed Google OAuth cookie dropout bug by stripping out large `provider_token` and `provider_refresh_token` parameters from session cookie. Added Back button to Step 2 (Connect Channels) for backward wizard navigation. All changes verified, compiled, and deployed to production.
- **2026-08-03**: Redesigned `/login` visual layer for **Windows 11 Light Mode** — clean light desktop canvas (`#f3f6fc`), pastel Windows Bloom 3D blobs (Sky Blue `rgba(0, 120, 212, 0.3)`, Soft Lavender `rgba(147, 97, 253, 0.32)`, Mint Cyan `rgba(56, 189, 248, 0.28)`), Light Acrylic frosted glass card (`rgba(255, 255, 255, 0.75)`, `blur(32px)`), slate high-contrast typography, crisp inputs with Windows 11 blue focus ring (`#0078d4`), and blue-purple primary submit gradient. Preserved all auth logic (Google OAuth, password sign-in, session slimming). Verified zero TypeScript errors (`npx tsc --noEmit`) and pushed to main.
