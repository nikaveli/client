# Business Profile Audit

A React app that connects to the **Google Business Profile APIs** and produces a scored
audit of any location you manage — profile completeness, opening hours, description,
attributes, photos, reviews & reply rate, and Google Post activity — with prioritised
recommendations.

Everything runs in the browser: you sign in with Google, the app calls the Business
Profile APIs with your OAuth token, and nothing is stored anywhere.

## How it works

1. **Sign in with Google** — uses Google Identity Services to get an OAuth token with the
   `https://www.googleapis.com/auth/business.manage` scope.
2. **Pick an account & location** — accounts come from the Account Management API,
   locations from the Business Information API.
3. **Run the audit** — the engine in `src/audit/auditEngine.js` scores ~20 checks across
   7 categories and renders a report with a 0–100 score and top recommendations.

If some data sources (reviews, media, posts, attributes) aren't available to your API
project, those checks are marked *unavailable* and excluded from the score instead of
failing the whole audit.

## Google Cloud setup (one-time)

The Business Profile APIs are **request-access only**. You need:

1. A Google Cloud project.
2. **Request Business Profile API access** for that project using Google's form:
   https://developers.google.com/my-business/howtos/prereqs
   (You must manage at least one verified Business Profile; approval usually takes a few days.)
3. Once approved, enable these APIs in *APIs & Services → Library*:
   - My Business Account Management API
   - My Business Business Information API
   - Google My Business API (legacy v4 — used for reviews, media, and posts)
4. Configure the **OAuth consent screen** (External, add the `business.manage` scope, add
   yourself as a test user while in testing mode).
5. Create an **OAuth client ID** (*Credentials → Create credentials → OAuth client ID →
   Web application*) and add your origins to *Authorized JavaScript origins*:
   - `http://localhost:3000` for development
   - your production URL when you deploy

## Run it

```bash
cp .env.example .env   # paste your OAuth client ID into .env
npm install
npm start              # opens http://localhost:3000
```

## Prospect audit PDFs (no Claude credits needed)

`tools/prospect-audit.js` scrapes Google Maps via Outscraper for a category in a
city/state, excludes franchises, and writes one audit PDF per business using the
LocalFirst report template. It runs entirely locally — the only cost is Outscraper
credits.

```bash
# .env must contain OUTSCRAPER_API_KEY=...
npm run audit -- --category "restaurant" --city "Denver" --state "CO" --limit 10
```

PDFs land in `audit-reports/`. Franchise exclusion uses three rules: a known-brands
list (`tools/franchises.js`), duplicate names within the result set, and corporate
multi-location website patterns. Add your own exclusions with `--exclude "Name1,Name2"`.

Credit-saving flags: `--skip-reviews`, `--skip-photos`, `--skip-contacts` each skip one
per-business lookup (the corresponding report field is left blank to fill by hand).
Posts/Updates and Date of last Post are always left blank — that data isn't publicly
scrapable — as is anything else the scrape can't see.

## Project structure

```
src/audit/
  googleAuth.js          # Google Identity Services wrapper (OAuth token)
  gbpApi.js              # Business Profile API calls (accounts, locations, reviews, media, posts)
  auditEngine.js         # audit rules, scoring, and recommendations
  components/
    AuditApp.js          # main flow: connect → pick account/location → audit
    AuditReport.js       # scored report with per-section breakdowns
    ScoreRing.js         # overall score dial
```

## Tuning the audit

All thresholds (description length, photo target, post freshness, review reply rate, …)
and point weights live at the top of `src/audit/auditEngine.js`. Add a new check by
returning another `check(...)` from one of the section builders — the score and the
recommendations list pick it up automatically.
