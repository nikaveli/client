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
