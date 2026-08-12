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
- **2026-08-03**: Built and deployed the **Facebook Page Selection Modal** for multi-page Meta accounts in `/onboarding` Step 2 & `/dashboard/settings`. Updated `/api/auth/facebook/callback` to detect when a user manages multiple Pages (`pagesData.data.length > 1`) and redirect to a selection modal instead of hardcoding `data[0]`. Handled zero-page errors with a clear banner warning, and created `selectPageMeta` server action (`src/app/dashboard/settings/actions.ts`) to fetch the linked Instagram Business Account specifically for the selected Page. Verified zero TypeScript errors (`npx tsc --noEmit`) and pushed to main.
- **2026-08-05**: Fixed DB schema errors (removed non-existent `meta_instagram_access_token` and `meta_instagram_user_id` columns from update payloads). Redesigned Step 2 channel UX: (1) Instagram no longer triggers its own separate OAuth loop — clicking it when FB is already connected shows an inline info toast explaining no IG was linked to the Page; clicking it when FB is NOT connected runs the same Meta OAuth as Messenger; (2) page picker now fetches IG Business Account for EACH page in parallel (server-side) and shows an "Instagram linked" or "No Instagram" badge per page; (3) page picker CTA updated to "Use this Page"; (4) WhatsApp modal redesigned with richer glassmorphism treatment. TypeScript clean, pushed to main.
- **2026-08-06**: Implemented multi-Facebook-page support per shop. New shop_meta_pages DB table. Webhook routing in messenger and channels/meta routes now looks up by shop_meta_pages.meta_page_id with fallback to shops table for backward compat. selectPagesMeta upserts selected pages, disconnectMetaPage handles per-page removal, getConnectedPages loads pages for UI. StepChannels.tsx redesigned with checkbox multi-select picker, connected pages list with per-page Remove, derived messengerConnected/instagramConnected from shop_meta_pages. TypeScript clean, pushed to main (2e9b66b).
- **2026-08-08**: Completed full security overhaul of DullBot Companion device pairing and `/api/payments/sms-webhook`: (1) Completely burned static fallback secret `dullbot_app_secret_123`; (2) Built `src/lib/companion-registry.ts` issuing unique per-device cryptographic secrets (`dev_sec_...`) with full device revocation support; (3) Rebuilt `/api/payments/sms-webhook/route.ts` enforcing `shop_id` multi-tenant isolation via inner join queries; (4) Hardened Android app (`android:allowBackup="false"`, `android:usesCleartextTraffic="false"`, `EncryptedSharedPreferences`); (5) Verified zero cross-tenant leakage via automated test suite (`scratch/test-companion-security.ts`) with 2 simultaneous shops holding identical BDT 500 orders; (6) Verified Next.js build clean (`npm run build`).
- **2026-08-12**: Executed project-wide performance, caching, security, and UI polish pass: (1) Added `@tanstack/react-query` across Live Inbox, Inventory, Orders, Analytics, Overview; (2) Eliminated N+1 query loop in `getConversations()`; (3) Pre-fetched active conversation messages on server for 0ms load; (4) Added `MessageThreadSkeleton` for conversation switching; (5) Resolved Meta Graph API profile fetching querying `picture.width(200).height(200)` and `profile_pic` fields with fallback to `shop_meta_pages` tokens; (6) Added `getProfilePicUrl` helper in `InboxClient.tsx` rendering `conv.meta_profile_pic` or `profile.profile_pic_url` in sidebar and chat header avatars; (7) Built multi-frame `scrollToBottom` lock preventing image loads from leaving chat stuck in the middle; (8) Redesigned AI Briefing card in customer context sidebar into clean white/fog surface with valid phone number filtering; (9) Implemented smart dual sidebar badges — Urgent Red Pill Badge (`bg-red-500 animate-pulse`) for human takeover/complaint escalations, and Blue Pill Badge for unread customer messages; (10) Built fullscreen blurred media lightbox overlay (`previewMedia`) preventing chat attachments from opening in new tabs; (11) Redesigned dashboard sidebar to slim `w-56` layout, placed `Overview` first, added header collapse toggle (`PanelLeftClose`/`PanelLeftOpen`), and built unified shop avatar + logout footer card; (12) Replaced workspace loading spinner with Uiverse.io Nawsome 5-slider animated loader component (`UiverseLoader`). Verified clean Next.js build (`npm run build`) and pushed `ce04eb4` to `main`.
