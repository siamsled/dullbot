---
name: dullbot-spec
description: |
  Comprehensive specification and feasibility guidelines for DullBot's architecture, caching strategy, SMS-forwarding payment verification, OTP verification, and phased build plan.
  Triggers on queries about DullBot's system architecture, database design, caching, OTP workflows, or payment matching logic.
---

# DullBot: Build Spec & Feasibility

This document contains the core engineering rules, payment verification workflows, architecture decisions, and phase configurations for DullBot.

## 1. Executive Summary
DullBot's core concept — a deadpan, no-nonsense AI sales agent for small Bangladeshi businesses on WhatsApp, Messenger, and Instagram — is sound and differentiated.

### Core Architecture Constraints & Realities (2026):
* **Gemini Free-Tier Limits**: Daily quotas are pooled per Google Cloud project, not per API key. Expect a ceiling of roughly 1,500 requests/day on Gemini Flash.
* **bKash/Nagad Payment Verification**: Direct API integration is not available without trade licenses, and registration is temporarily disabled on bKash's side. DullBot uses a lightweight **SMS-forwarding verification trick** to bypass this.
* **SMS OTP Costs**: OTP via SMS is roughly ৳0.30–0.34 per message, but sending plain-text OTPs inside open WhatsApp customer-initiated windows is completely free.

---

## 2. AI Engine: Gemini Rate Limits & Caching Rules
* **Model Limits (Free Tier)**:
  * Gemini 3 Flash / 2.5 Flash: 10 RPM, 1,500 RPD, 250,000 TPM
  * Gemini Flash-Lite: 15 RPM, 1,500–2,000 RPD, 250,000 TPM
* **Caching Strategy**: Cache repetitive requests (e.g., product availability inquiries) using a cache key formatted as `(shop_id, product_id, normalized_question)` to save token budgets.
* **Pre-Filtering**: Run keyword/regex filters for standard greetings and simple FAQs before passing questions to Gemini to reduce token usage by 30-40%.

---

## 3. Payment Verification Workflow (SMS-Forwarding)
Since direct API integration is restricted, DullBot utilizes automated SMS parsing:
1. **Instruction**: DullBot instructs the customer: *"Send ৳[amount] to [bKash/Nagad number] with reference [order code]"*.
2. **Forwarding**: The merchant's Android phone runs a lightweight, free SMS-forwarding application that forwards carrier messages to DullBot's webhook.
3. **Parsing**: DullBot parses the forwarded SMS for:
   * Transaction ID
   * Received Amount
   * Reference code (order code)
   * Sender phone number
4. **Matching**: On a match, the order status transitions to `auto-confirmed` and is whitelisted for fulfillment.
5. **Moat - Spam Database**: Key a shared database across all shops on phone numbers to flag delivery failures, refusals, or ghost orders.

---

## 4. OTP & Identity Verification
* **WhatsApp Open Window**: Inside a customer-initiated 24-hour service window, send OTPs as free-form plain-text messages rather than formal "Authentication templates" (which Meta charges utility rates for).
* **SMS Fallback**: Reserve paid local SMS OTP (costing ~৳0.30) exclusively for web-checkout flows where no WhatsApp conversation is open.

---

## 5. Architecture Decisions
* **Order-Confirmation Tiers**:
  * *Light*: Name, address, and phone number only (low-value items).
  * *OTP-Verified*: Code verified in WhatsApp window.
  * *Prepay-Verified*: Delivery charge paid + SMS reference code matched.
* **WABA Numbers**: Start pilot shops using a single shared WhatsApp Business number under the DullBot brand. Migrate mature shops to dedicated numbers as they scale to avoid block rates impacting the shared pool.
* **Gemini Call Budgeting**: Instrument a first-class token/call tracking counter per shop from day one.

---

## 6. Phased Rollout Plan
* **Phase 0 (0-10 shops)**: Gemini free tier (single project), SMS-forwarding verification hook, open-window WhatsApp OTPs, shared WABA number.
* **Phase 1 (10-50 shops)**: Enabled pay-as-you-go Gemini billing (capped), integrate SMS OTP provider for web checkouts, start SSLCommerz/ShurjoPay onboarding, migrate active shops to dedicated WABAs.
* **Phase 2 (50-200+ shops)**: Default to dedicated WABA numbers, tiered subscription model, direct bKash merchant API integration if aggregator fees warrant.
