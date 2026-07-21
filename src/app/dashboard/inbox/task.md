# Meta Expansion + Comment Automation — Task List

## Phase 1 — Instagram DM
- [x] Migration: `meta_instagram_user_id` on shops
- [/] Messenger webhook: handle `object: 'instagram'` + `instagram` channel
- [ ] meta-api.ts: channel-aware send
- [ ] SettingsClient.tsx: Instagram connection section

## Phase 2 — WhatsApp Cloud API
- [ ] Migration: WhatsApp columns on shops + conversations
- [ ] New webhook route: `/api/webhooks/whatsapp/route.ts`
- [ ] meta-api.ts: sendWhatsAppMessage, sendWhatsAppTemplate, session check
- [ ] SettingsClient.tsx: WhatsApp connection section

## Phase 3 — Comment Automation Core
- [ ] Migration: `post_automations` + `post_comments` tables
- [ ] Webhook: feed change handler + dedup + AI comment reply + guardrail
- [ ] New page: `/dashboard/social/` with SocialClient.tsx
- [ ] Sidebar: add Social nav item
- [ ] Actions: CRUD for post_automations

## Phase 4 — Private Reply via Messenger
- [ ] Comment handler: private reply logic, 7-day window check, one-shot guard

## Phase 5 — Comment Deletion + Product Awareness
- [ ] Comment handler: deletion with 0.85 confidence threshold
- [ ] Comment handler: inject product catalog into reply prompt
