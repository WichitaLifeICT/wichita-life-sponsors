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
- [!] **Get your approval on plan + schema before writing any code**

## Stage 2 — Database design & migrations
- [ ] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] Add Supabase clients (browser/server) and `.env.local.example`
- [ ] Write enum types
- [ ] Write table migrations with FKs + indexes
- [ ] Enable RLS + policies (`auth_org_id()` helper)
- [ ] `updated_at` triggers + new-user profile trigger
- [ ] Seed: Wichita Life org, owner, 3+ packages, 5 sponsors, mixed records
- [ ] Document how to run migrations and seeds (README)

## Stage 3 — Auth + app shell
- [ ] Login page (email/password)
- [ ] Middleware route protection + redirect to login
- [ ] Responsive sidebar (Dashboard, Sponsors, Deliverables, Calendar, Packages, Billing, Assets, Settings)
- [ ] Org name (top) + user + logout (bottom)
- [ ] Loading / empty / error states
- [ ] README auth section

## Stage 4 — Sponsors
- [ ] Sponsor list with columns, search, filters, sorting, pagination
- [ ] Summary cards (active, contracted revenue, unpaid, expiring ≤60d)
- [ ] Create / edit sponsor forms + validation
- [ ] Sponsor detail page (Overview / Deliverables / Billing / Assets / Notes)
- [ ] Action buttons + confirmation dialogs

## Stage 5 — Packages + overrides
- [ ] Package list / create / edit / deactivate / duplicate
- [ ] Deliverable rules editor
- [ ] Sponsor package assignment with overrides (price, add/remove/qty, auto-generate flag)
- [ ] Clear "customized package" indicator
- [ ] Package edits never rewrite historical deliverables

## Stage 6 — Monthly deliverable generation
- [ ] Generation button + month selector + preview
- [ ] Idempotent generation; respect dates, status, recurrence, overrides
- [ ] `generation_runs` record
- [ ] Manual add + carry-forward (preserve original service month)
- [ ] Monthly fulfillment summary
- [ ] Automated tests

## Stage 7 — Deliverables workspace
- [ ] Table view + board view (drag/drop if reliable)
- [ ] Filters + bulk actions
- [ ] Deliverable detail + status history / audit log

## Stage 8 — Content calendar & inventory
- [ ] Month / week / agenda views
- [ ] Slot CRUD, capacity states (empty/partial/full/overbooked)
- [ ] Assign/reschedule deliverables, capacity guard with override
- [ ] Filters

## Stage 9 — Billing & payments
- [ ] Billing dashboard
- [ ] Invoice table + create/edit/send/void
- [ ] Record partial/full payment; auto status by payments + due date
- [ ] Frequency-aware payment status (no false "unpaid" for quarterly/annual)
- [ ] Tests (full/partial/over/overdue/void/quarterly/annual)

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
