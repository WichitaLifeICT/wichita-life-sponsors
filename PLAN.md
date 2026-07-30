# Wichita Life — Sponsor Management App: Implementation Plan

> **Status:** Planning (Stage 1). No application code has been written yet.
> This document is for your review and approval before building begins.

## 1. What we are building (plain English)

A private, web-based operations tool for **Wichita Life** (a local media company)
to manage sponsors end to end. Today it is used only by you, but it is built so it
could later become a multi-organization SaaS product without a rewrite.

The app is designed to answer, at a glance:

- What sponsor deliverables do I owe **this month**?
- What sponsor content is due **this week**?
- Which sponsors **have not paid**?
- Which sponsors still need to **send assets**?
- Which newsletter or social-media spots are **open**?
- Which contracts are **expiring**?
- How much **recurring sponsor revenue** is currently contracted?

## 2. Technology stack (approved in your request)

| Layer            | Choice                              | Why                                             |
| ---------------- | ----------------------------------- | ----------------------------------------------- |
| Framework        | Next.js (App Router)                | Modern React, server components, easy on Vercel |
| Language         | TypeScript                          | Type safety across data-heavy business logic    |
| Styling          | Tailwind CSS                        | Fast, consistent styling                        |
| UI components    | shadcn/ui                           | Polished, accessible, owned-in-repo components  |
| Database / Auth  | Supabase (Postgres, Auth, Storage)  | Managed Postgres + RLS + file storage + login   |
| Hosting          | Vercel                              | First-class Next.js deployment                  |
| Source control   | GitHub                              | Already in use (this repo)                       |
| Testing          | Vitest                              | Fast unit tests for business logic              |

## 3. Multi-tenant from day one (but single-user in practice)

Every business table carries an `organization_id`. All data access is filtered by
the signed-in user's organization through **Row Level Security (RLS)** in Postgres,
so the isolation is enforced by the database itself — not just the UI. You are
seeded as the sole **owner** of the **Wichita Life** organization. Adding more
organizations or team members later is a data change, not a code rewrite.

## 4. A completely standalone project

This lives in its own dedicated repository — **`wichitalifeict/wichita-life-sponsors`**
— with fresh git history and no connection to any other Wichita project. It is a
self-contained Next.js application built from scratch.

## 5. Proposed project structure

```
wichita-life-sponsors/
├── PLAN.md  DATABASE.md  TASKS.md  # planning docs
│
├── app/                           # Next.js App Router
│   ├── (auth)/login/              # public login page
│   ├── (app)/                     # protected area (requires login)
│   │   ├── dashboard/
│   │   ├── sponsors/
│   │   ├── deliverables/
│   │   ├── calendar/
│   │   ├── packages/
│   │   ├── billing/
│   │   ├── assets/
│   │   ├── reports/
│   │   └── settings/
│   ├── layout.tsx  globals.css
│
├── components/
│   ├── ui/                        # shadcn/ui primitives
│   ├── layout/                    # sidebar, topbar, shell
│   └── <feature>/                 # feature-specific components
│
├── lib/
│   ├── supabase/                  # browser + server clients, middleware helper
│   ├── domain/                    # pure business logic (generation, billing, status)
│   ├── validations/               # Zod schemas for every form
│   └── utils/                     # dates (America/Chicago), currency, formatting
│
├── types/                         # shared TypeScript types + generated DB types
│
├── supabase/
│   ├── migrations/                # versioned SQL migrations
│   ├── seed.sql                   # demo data (5 sponsors, 3+ packages)
│   └── config.toml
│
├── __tests__/                     # Vitest unit tests for business logic
│
├── .env.local.example             # documents required environment variables
├── middleware.ts                  # route protection / session refresh
└── README.md                      # setup + auth documentation
```

**Design principles**

- **Pure business logic in `lib/domain/`** — deliverable generation, billing status,
  and carry-forward are plain functions with no database or UI dependency, so they
  are easy to unit-test and reason about.
- **Server-side Supabase for anything privileged** — the service-role key never
  reaches the browser. The browser only ever gets the public anon key.
- **Reusable, organization-agnostic components** — no "Wichita Life" strings baked
  into logic; channel names and labels are data/configuration, not hard-coded.

## 6. Build stages (mapped to your prompts)

Each stage ends with a review + a list of what you should test manually. I will not
start the next stage until you say so.

| Stage | Focus                                   | Key output                                   |
| ----- | --------------------------------------- | -------------------------------------------- |
| 1     | Planning **(this document)**            | PLAN / DATABASE / TASKS + account setup      |
| 2     | Database design & migrations            | SQL migrations, RLS, seed data               |
| 3     | Auth + app shell                        | Login, protected routes, sidebar             |
| 4     | Sponsors                                | List, filters, create/edit, detail page      |
| 5     | Packages + custom overrides             | Package CRUD, deliverable rules              |
| 6     | Monthly deliverable generation          | Idempotent generator + preview + tests       |
| 7     | Deliverables workspace                  | Table + board + bulk actions + status history|
| 8     | Content calendar & inventory            | Slots, capacity, assignment                  |
| 9     | Billing & payments                      | Invoices, payments, accurate status          |
| 10    | Dashboard                               | Real-data cards + drill-down                 |
| 11    | Asset management                        | Supabase Storage, previews, signed URLs      |
| 12    | In-app alerts                           | Notification center, auto-resolve            |
| 13    | Reports & CSV export                    | Fulfillment/billing/contract/inventory       |
| 14    | Settings & configurable fields          | Org, channels, data export                   |
| 15    | Polish + tests                          | a11y, responsive, TESTING.md                 |
| 16    | Prepare for real use                    | CSV import, demo-data cleanup, USER_GUIDE.md |

## 7. Core business rules (worth agreeing on early)

- **Service month** is the unit deliverables are owed for (e.g. "August 2026").
  A deliverable keeps its **original** service month even if it is carried forward.
- **Generation is idempotent.** Running it twice for the same month never creates
  duplicates; a generation-run record tracks when it ran.
- **Package edits affect the future only.** Historical deliverables are never
  rewritten when a package changes.
- **Billing respects frequency.** A quarterly/annual sponsor is not flagged "unpaid"
  in months where nothing is due — status is computed from the service period, not
  the calendar month.

## 8. What we are explicitly NOT building yet

Per your instructions: no Stripe, no QuickBooks, no Beehiiv, no social-media APIs,
and no sponsor logins. Billing and payments are tracked manually in this version.

## 9. Accounts, credentials & environment variables you'll need

See the "Setup" section of the README (created in Stage 2/3). Summary:

1. **Supabase account + project** (free tier is fine to start). You'll copy three
   values from Project Settings → API.
2. **Vercel account** connected to this GitHub repo (for later deployment).
3. Local `.env.local` (never committed) with:
   - `NEXT_PUBLIC_SUPABASE_URL` — safe for the browser
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for the browser
   - `SUPABASE_SERVICE_ROLE_KEY` — **server-only**, never exposed to the browser

I'll provide a `.env.local.example` and exact click-by-click steps in Stage 2.
