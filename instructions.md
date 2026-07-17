# DullBot — MVP Completion Spec
**Purpose:** Single build plan to take DullBot from current retail/e-commerce MVP to a complete, launchable product in one coding pass. Feed this directly to Antigravity as the task plan. Ship in the order listed — each phase is usable on its own and nothing built early gets thrown away later.

---

## 0. Context (read first)

DullBot is an AI chat assistant SaaS for Bangladeshi retail/e-commerce businesses, built on Gemini. Current MVP covers: inventory, variants, suppliers, reorder automation, persona/guardrail system, bKash/Nagad SMS-forwarding for payments (to be replaced — see Phase 1).

Two customer bases exist and both matter for every feature below:
- **Direct customers** — the shops paying for DullBot
- **End customers** — the shoppers chatting with the AI (their experience determines shop retention)

Owner of DullBot = the builder himself, running this as a real business — Phase 3 (Control Center) is *his* internal tool, not a client-facing feature.

---

## Phase 1 — Payment Verification (Tier 1: Merchant API)

**Goal:** Replace SMS-forwarding with real-time bKash/Nagad merchant API verification for shops that have merchant accounts.

### Data model
```
payment_verifications
  id
  order_id (FK)
  method: enum [merchant_api, notification_app]
  expected_amount
  matched_reference
  status: enum [pending, confirmed, mismatch, failed]
  customer_provided_ref (transaction ID or last-3-digits, nullable)
  confirmed_at (nullable)
  created_at
```

### Flow
1. Shop connects bKash/Nagad merchant credentials once (encrypted at rest, stored per-shop).
2. On customer "I've paid" message → bot asks for transaction ID **or** last 3 digits of sender number.
3. Backend calls merchant API, matches by amount + reference.
4. **Match** → order status → `confirmed`, customer notified automatically, no human touch.
5. **No match** → bot asks customer to recheck and resend once.
6. **Still no match** → flag `payment_verifications.status = mismatch`, notify shop owner directly with customer's claimed details attached, escalate for manual resolution.

### Acceptance criteria
- [ ] Merchant credentials stored encrypted, never logged in plaintext
- [ ] End-to-end: customer claim → API call → confirm/mismatch → correct notification, all three paths tested
- [ ] Mismatch always reaches the shop owner (not silently dropped)
- [ ] Every verification attempt logged in `payment_verifications` regardless of outcome

---

## Phase 2 — Courier Integration (all five, shared abstraction)

**Goal:** Auto-book courier pickup on order confirmation; support real-time tracking status inside chat.

### Architecture
One interface, five thin adapters — do not build five separate integrations from scratch.

```
CourierAdapter (interface)
  createShipment(order) -> { tracking_id, courier_ref }
  getTrackingStatus(tracking_id) -> status enum
  cancelShipment(tracking_id) -> bool
```

Implement in this order (most common → least):
1. **Pathao Courier** — build the full adapter + interface together here
2. **Steadfast**
3. **RedX**
4. **Paperfly**
5. **eCourier**

### Flow
1. Order status flips to `confirmed` (via Phase 1 or manual confirm) → shop's configured courier adapter's `createShipment` fires automatically.
2. Webhook from courier updates tracking status → stored against the order.
3. Customer asks "where's my order" → bot pulls live tracking status from stored data, answers directly, no human involved.
4. Shop dashboard shows courier status per order (ties into Phase 3 support view).

### Acceptance criteria
- [ ] Shop can select their courier(s) in settings; adapter is chosen at runtime per shop
- [ ] `createShipment` fires automatically on order confirm, no manual step
- [ ] Webhook-driven status updates reflected in chat answers within [define acceptable delay]
- [ ] Cancel flow works and updates order status correctly
- [ ] Each adapter independently testable (mock courier responses for dev/test)

---

## Phase 3 — Owner Control Center (internal dashboard)

**Goal:** A dashboard for the DullBot owner to run DullBot as a business — separate from any per-shop client admin panel.

### Sections

**Business health**
- Active shops count, MRR
- Revenue vs Gemini API cost per shop (real margin, not assumed)
- Low-balance clients needing outreach
- Quiet/churn-risk shops (no activity in N days)

**Per-shop config (support view)**
- Persona in use, guardrail settings
- Payment verification method: merchant_api / notification_app / none
- Courier integration status + which courier(s)
- Connected Meta pages
- *Purpose: when a client messages confused, see their full setup instantly*

**Platform health**
- Webhook uptime / error rate
- Gemini API failure rate
- Any shop's bot gone silent (rate-limited, credit exhausted, webhook down) — alert *before* the client notices

**Escalation queue — two lanes, do not merge them**
| Lane | Trigger | Routing |
|---|---|---|
| Shop-side | Bot can't answer a product/order question, shop owner unreachable | Stays with the shop, never enters this queue |
| Platform-side | Payment verification fails to run, webhook down, courier API rejecting requests, bot silent due to a DullBot bug | Hits this queue directly, notifies owner |

- [ ] Platform-side lane must support **remote intervention**: owner can view a flagged conversation's full history and act directly (reply, push a fix) without the shop owner present.
- [ ] Every remote access into a shop's live conversation is **audit-logged** (who accessed, when, which conversation) — this is a real permission boundary, treat it as one.

**Onboarding funnel**
- Signup → Meta connected → inventory added → live
- Shows exactly where new signups drop off

**Payment verification stats**
- % auto-confirmed vs manual per shop
- Mismatch rate
- Breakdown by method (Tier 1 vs Tier 2 once built)

### Acceptance criteria
- [ ] Business health + per-shop support view ship first — needed the moment there are >3-4 live clients
- [ ] Platform-side escalation lane triggers real alerts (not just a dashboard row nobody checks)
- [ ] Audit log for remote conversation access is queryable (who/when/which shop)

---

## Phase 4 — Payment Verification (Tier 2: Android Notification App)

**Goal:** Payment confirmation for shops with only personal bKash/Nagad accounts (no merchant API access).

### Critical constraint
Do **not** build this as an SMS-reading app. Google Play requires an app to be registered as the phone's **default SMS handler** before it can request SMS-read permission — no shop owner will replace their real texting app for this, and it will be rejected/restricted on the Play Store.

### Correct approach: NotificationListenerService
Reads notification banner content from other apps (the bKash/Nagad payment alert) without needing default-SMS-handler status. Proven pattern already used in production for similar payment-verification use cases in other Asian markets (e.g. Indonesia's QRIS ecosystem).

### Flow
1. Shop owner installs companion Android app, grants Notification Access (one-time toggle in settings).
2. App runs a background `NotificationListenerService`, parses bKash/Nagad payment notification text (amount, sender number fragment).
3. Forwards parsed payload to a webhook.
4. Backend matches to pending order by phone number + amount → same confirm/mismatch flow as Phase 1, writes to the same `payment_verifications` table with `method: notification_app`.

### Build decision (open — default assumption below)
Shared vs white-labeled app: **build shared first** (one Play Store listing, one codebase, shop owners log in with existing DullBot credentials). White-labeling can be added later as a paid tier — nothing in the shared build is wasted if that happens.

### Acceptance criteria
- [ ] App requests Notification Access only — never SMS permission, never default-handler status
- [ ] Correctly parses bKash and Nagad notification formats specifically (test against real notification samples from both)
- [ ] Handles ambiguous matches (same amount, multiple pending orders) by prompting for exact transaction ID
- [ ] Background service survives app kill / phone reboot without requiring the owner to reopen the app
- [ ] Passes Play Store review as submitted (Notification Access apps have their own disclosure requirements — check current Play policy before submission)

---

## Build order summary

1. Phase 1 — Merchant API payment verification
2. Phase 2 — Courier abstraction + Pathao, then remaining 4 adapters
3. Phase 3 — Owner Control Center (business health + support view first; rest follows)
4. Phase 4 — Android notification-listener app

Each phase is independently shippable. Do not start Phase 4 until Phase 1's confirm/mismatch flow is proven end-to-end in production — Phase 4 reuses that exact logic.