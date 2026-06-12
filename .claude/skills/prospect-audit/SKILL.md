---
name: prospect-audit
description: Scrape Google Maps for local businesses by category/city/state, exclude franchises, and generate one LocalFirst audit PDF per business. Use when the user asks to run audits, generate audit reports, or scrape prospects (e.g. "/prospect-audit dentists Boulder CO" or "run audits for salons in Aurora").
---

# Prospect Audit Batch

Generate Google Business Profile audit PDFs for local-business prospects.

## Steps

1. Parse the category, city, state, and optional limit (default 10, max 50) from
   the user's request. If any of category/city/state is missing, ask.
2. Ensure dependencies are installed (`npm install` if `node_modules` is missing)
   and that `OUTSCRAPER_API_KEY` is present in `.env` or the environment. If the
   key is missing, ask the user for it — never commit it.
3. Run:
   `npm run audit -- --category "<category>" --city "<city>" --state "<state>" --limit <limit>`
4. Report which businesses were excluded as franchises and why.
5. Spot-check one generated PDF by reading it (verify fields populated and layout
   intact) before delivering.
6. Send all generated PDFs from `audit-reports/` to the user with SendUserFile.
7. Remind the user which fields they fill by hand: Total Views on Photos,
   Posts/Updates, and Date of last Post.

## Notes

- The script lives at `tools/prospect-audit.js`; franchise list at `tools/franchises.js`.
- Extra exclusions: `--exclude "Name1,Name2"`. Credit savers: `--skip-reviews`,
  `--skip-photos`, `--skip-contacts` (those fields become blank write-in lines).
- Each business costs ~3-4 Outscraper requests. Do not re-run a batch
  unnecessarily — it spends the user's Outscraper credits.
