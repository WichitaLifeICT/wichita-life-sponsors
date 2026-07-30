# Wichita Life — Task Checklist

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` needs your input

Each stage ends with a review and a manual-test list. I will not start the next stage
without your go-ahead.

## Stage 1 — Planning (this stage)
- [x] Inspect current project directory
- [x] Confirm stack and multi-tenant approach
- [x] Write `PLAN.md`
- [x] Write `DATABASE.md`
- [x] Write `TASKS.md`
- [x] Explain required accounts, credentials, and environment variables
- [x] **Approval received** — standalone repo, Supabase setup steps, schema extras approved

## Stage 2 — Database design & migrations
- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4 (shadcn foundation set; primitives in Stage 3)
- [x] Add Supabase clients (browser/server/proxy) and `.env.local.example`
- [x] Write enum types (13 enums)
- [x] Write table migrations with FKs + indexes (15 tables)
- [x] Enable RLS + policies (`auth_org_id()` helper) on every table
- [x] `updated_at` triggers + new-user profile/org bootstrap trigger
- [x] Seed: Wichita Life org, 3 packages, 5 sponsors, mixed paid/unpaid/scheduled records
- [x] Document how to run migrations and seeds (README)
- [x] Verified: `typecheck`, `lint`, `test`, production `build` all pass

## Stage 3 — Auth + app shell
- [x] Login page (email/password) via Supabase Auth server action
- [x] Proxy route protection + redirect to login (smoke-tested: 307 redirects work)
- [x] Responsive sidebar (all 8 nav items) — desktop rail + mobile sheet
- [x] Org name (top) + user menu + logout (bottom)
- [x] Loading / empty / error states (skeleton, EmptyState, error boundary)
- [x] shadcn/ui primitives authored locally (button, input, card, avatar, dropdown, sheet, badge, skeleton, separator, label)
- [x] README auth section
- [x] Verified: typecheck, lint, build, and runtime route smoke test all pass

## Stage 4 — Sponsors
- [x] Sponsor list with columns, search, filters (status/package/payment/expiring), sorting, pagination
- [x] Summary cards (active, contracted revenue, unpaid, expiring ≤60d) — clickable to filtered views
- [x] Create / edit sponsor forms + Zod validation + package assignment
- [x] Sponsor detail page (Overview / Deliverables / Billing / Assets / Notes tabs)
- [x] Action buttons + archive confirmation dialog; "customized package" indicator
- [x] Domain logic (revenue normalization, payment status, dates) with unit tests
- [x] Verified: typecheck, lint, production build pass

## Stage 5 — Packages + overrides
- [x] Package list / create / edit / deactivate / duplicate
- [x] Deliverable rules editor (dynamic rows)
- [x] Sponsor customization page: override quantities, add/remove, price, auto-generate flag
- [x] Clear "customized package" indicator (sponsor badge + effective-deliverable resolution)
- [x] Package edits only affect future generation (rules replaced, deliverables untouched)
- [x] `resolveEffectiveDeliverables` domain logic + unit tests (13 tests total)
- [x] Verified: tests, typecheck, lint, production build pass

## Stage 6 — Monthly deliverable generation
- [x] Generation button + month selector + preview dialog
- [x] Idempotent generation; respects dates, status, recurrence, overrides
- [x] `generation_runs` record written on each run
- [x] Manual add + carry-forward (preserves original service month)
- [x] Monthly fulfillment summary (owed/published/scheduled/waiting/not-scheduled/carried + %)
- [x] Automated tests (21 total; 8 dedicated generation cases) + docs/GENERATION.md

## Stage 7 — Deliverables workspace
- [x] Table view (selectable) + board view (drag-drop + move menu)
- [x] Filters (sponsor/type/status/asset/unscheduled/overdue/carried) + view toggle
- [x] Bulk actions (publish, assets received, carry forward, set status, set due date)
- [x] Deliverable detail page + editable fields + status history / audit log
- [x] Verified: tests, typecheck, lint, production build pass

## Stage 8 — Content calendar & inventory
- [x] Month + agenda views (week view = follow-up)
- [x] Slot CRUD, capacity states (empty/partial/full/overbooked) color-coded
- [x] Assign/reschedule/unassign deliverables; sets scheduled date + status; capacity guard with overbook override
- [x] Unscheduled-this-month panel beside the calendar
- [x] Filters (slot type, newsletter/social, open/filled) + view toggle
- [x] Verified: tests, typecheck, lint, production build pass

## Stage 9 — Billing (simplified per owner: value + mark paid per period, no invoicing)
- [x] Billing overview (contracted monthly, collected, outstanding, sponsors with balance)
- [x] Per-sponsor period ledger generated from contract start + frequency (monthly/quarterly/annual/one-time)
- [x] Mark each period paid/unpaid (stamps paid date); editable amount per period
- [x] Frequency-aware periods (quarterly/annual don't show false monthly "unpaid")
- [x] "Payments up to date / N unpaid" standing on sponsor Overview + Billing tab
- [x] Stripe payment method + subscription flag
- [x] Period-generation unit tests (7); 28 tests total; typecheck, lint, build pass
- [ ] (Later) Stripe API sync — deferred

## Stage 10 — Dashboard
- [ ] Summary cards (real data)
- [ ] Needs attention / This week / Monthly fulfillment / Revenue sections
- [ ] Month selector; every card clickable to filtered view

## Stage 11 — Asset management
- [ ] Supabase Storage (private), signed URLs
- [ ] Assets page, filters, upload from sponsor page, previews
- [ ] Size/type validation, org isolation, delete confirmation
- [ ] Link assets to deliverables; asset status control

## Stage 12 — In-app alerts
- [ ] Alert rules + notification center
- [ ] Open / dismissed / resolved states + auto-resolve

## Stage 13 — Reports & export
- [ ] Fulfillment / billing / contract / inventory reports
- [ ] CSV export
- [ ] Printable per-sponsor report (PDF via browser)

## Stage 14 — Settings
- [ ] Organization settings (tz America/Chicago, currency, terms, warning period)
- [ ] Channel enable/disable (no hard-coded channel names in logic)
- [ ] Status label settings
- [ ] Data export + backup docs
- [ ] Account settings (name, email, password reset, logout)

## Stage 15 — Polish + tests
- [ ] Responsiveness, loading/empty/error, validation, a11y, keyboard nav
- [ ] Consistent dates (America/Chicago) + currency formatting
- [ ] Business-logic test suite (generation, overrides, dates, quarterly, carry-forward, invoice balances, payment status, slot capacity)
- [ ] Type-check + lint + tests + production build all green
- [ ] `TESTING.md`

## Stage 16 — Prepare for real use
- [ ] Separate demo vs production data; safe demo-removal process
- [ ] CSV import for sponsors (+ invoices if practical) + template + dup detection
- [ ] Pre-launch + security checklist (RLS, secrets, no service-role in browser)
- [ ] Vercel deployment instructions
- [ ] Full README + `USER_GUIDE.md`

## Bonus — Distribution (wholesale & consignment) — owner request
- [x] Schema: locations, products, drop-offs, line items (migration 20260101000007) + RLS
- [x] Wholesale (# units × wholesale $/unit, mark paid) and consignment (record sold, your % cut, units on shelf, settle)
- [x] Distribution section: summary cards + Drop-offs / Products / Locations tabs
- [x] New drop-off with item editor; drop-off detail with sales recording
- [x] Distribution value math + 5 unit tests
