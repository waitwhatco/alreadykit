---
title: "How to add Stripe billing to a Lovable or v0 export"
slug: add-stripe-billing-to-lovable-export
status: draft
target_query: "add stripe to lovable / stripe billing nextjs supabase"
canonical: https://already.wait-what.shop/blog/add-stripe-billing-to-lovable-export
cta: /migrate/lovable
---

# How to add Stripe billing to a Lovable or v0 export

Your AI-built app works and you want to charge for it. The trap: every tutorial shows you `stripe.checkout.sessions.create()` and stops there. That's 10% of billing. The other 90% — the part that decides whether you lose money — is what happens *after* checkout. Here's the full shape of production billing on a Next.js + Supabase app, and the mistakes to avoid.

## Step 1 — Model the subscription in your database
You need a place to store, per customer (or per org), their Stripe customer ID, subscription ID, current plan, and status. Put it next to your Supabase user/org row. Don't read plan state from Stripe on every request — cache it locally and let webhooks keep it fresh.

## Step 2 — Checkout (the easy 10%)
Create a Checkout Session server-side, pass your internal reference (user or org ID) in `client_reference_id` or `metadata`, and redirect. Fine. Now the real work.

## Step 3 — Webhooks, done correctly (the 90%)
This is where AI-generated code fails. Three rules:

1. **Verify the signature.** Use `stripe.webhooks.constructEvent` with the raw body and your signing secret. Never trust an unverified payload.
2. **Be idempotent.** Stripe retries. Store processed `event.id`s and no-op on repeats, or you'll double-apply upgrades and credits. This single mistake causes the most billing bugs.
3. **Have a dead-letter path.** If handling an event throws, you must not lose it. Log it somewhere you can replay, or Stripe's retries will eventually give up and your DB drifts out of sync with reality.

Handle at minimum: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. The last two are what protect revenue — they downgrade and dun.

## Step 4 — Gate features on plan
Read the cached plan from your DB in a Server Component layout (`requirePlan('pro')`), not on the client. Client-side gating is a suggestion, not a control — anyone can flip it.

## Step 5 — Customer portal
Use Stripe's billing portal so customers self-serve upgrades, cancellations, and card updates. Building this yourself is wasted weeks.

## The mistakes that cost money
- No idempotency → double charges / double credits.
- Trusting client-side plan state → free access to paid features.
- No `invoice.payment_failed` handling → users keep premium access after their card dies.
- Reading Stripe on every request → rate limits and latency.

## The shortcut
This is solved, boring, identical work for every SaaS — which is the argument for not hand-rolling it. A production starter ships idempotent webhooks, dead-letter handling, plan gating, and the portal already wired to Supabase, so you migrate your Lovable/v0 export onto it instead of rebuilding billing from a blog post. Walkthrough: [/migrate/lovable](https://already.wait-what.shop/migrate/lovable).
