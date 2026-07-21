# Meta Expansion + Comment Automation — Task List

## Phase 1 — Instagram DM
- [x] Migration: `meta_instagram_user_id` on shops
- [x] Messenger webhook: handle `object: 'instagram'` + `instagram` channel
- [x] meta-api.ts: channel-aware send
- [x] SettingsClient.tsx: Instagram connection section

## Phase 2 — WhatsApp Cloud API
- [x] Migration: WhatsApp columns on shops + conversations
- [x] New webhook route: `/api/webhooks/whatsapp/route.ts`
- [x] meta-api.ts: sendWhatsAppMessage, sendWhatsAppTemplate, session check
- [x] SettingsClient.tsx: WhatsApp connection section

## Phase 3 — Comment Automation Core
- [x] Migration: `post_automations` + `post_comments` tables
- [x] Webhook: feed change handler + dedup + AI comment reply + guardrail
- [x] New page: `/dashboard/social/` with SocialClient.tsx
- [ ] Sidebar: add Social nav item
- [x] Actions: CRUD for post_automations

## Phase 4 — Private Reply via Messenger
- [x] Comment handler: private reply logic, 7-day window check, one-shot guard

## Phase 5 — Comment Deletion + Product Awareness
- [x] Comment handler: deletion with 0.85 confidence threshold
- [x] Comment handler: inject product catalog into reply prompt
