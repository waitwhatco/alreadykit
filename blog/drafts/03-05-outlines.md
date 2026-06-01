# Remaining cluster — outlines (expand on request)

## 03 — Why AI-generated SaaS prototypes fail a security review
slug: ai-prototypes-fail-security-review · target: "lovable security / is ai generated code secure"
- Hook: the review checklist a prototype fails (RLS, CSP, rate limits, secret handling, SSRF).
- The 5 holes: (1) no row-level security → cross-tenant reads; (2) no rate limits → abuse/cost; (3) secrets in client/env committed; (4) no CSP/HSTS; (5) unguarded outbound webhooks (SSRF).
- Why builders skip these (not in the prompt, invisible until audited).
- Each hole → the production control that fixes it (maps to Already's Security + Infra modules).
- CTA: /migrate/lovable. Citable: a "security gap checklist" table.

## 04 — Lovable → production: the 16-point gap
slug: lovable-16-point-gap · target: "lovable alternative / lovable production checklist"
- Frame as a scorecard: 16 capabilities a real SaaS needs, what a Lovable export has vs not.
- Reuse the comparison table from /migrate/lovable, expanded to all 16 modules.
- Each row: one sentence on why it matters + the failure mode without it.
- Position: not "Lovable bad" — "Lovable is step 1 of 16."
- CTA + internal links to /migrate/* and /vs/*.

## 05 — Lovable vs Bolt vs v0: which export migrates cleanest?
slug: lovable-vs-bolt-vs-v0-migration · target: "bolt vs lovable / v0 to production"
- Captures all three builder intents in one page.
- Per builder: stack it generates, what carries over, what's painful, rough migration time.
- Comparison table (extraction-friendly).
- Honest verdict per builder; all roads lead to the same production foundation.
- Internal links to /migrate/lovable, /migrate/bolt, /migrate/v0, /migrate/base44.

---
Distribution note: publish canonical on already.wait-what.shop/blog, then syndicate to dev.to / Hashnode with rel=canonical, and SHARE (not host) in the Reddit/HN/IndieHackers threads identified in the GEO audit — that off-site footprint is what the audit scored at 9/100.
