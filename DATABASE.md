# Wichita Life — Database Outline

> **Status:** Proposed design (Stage 1). Reviewed with recommendations below.
> SQL migrations and seeds are written in **Stage 2** after you approve this.

## Conventions

- Every business table has `organization_id uuid not null references organizations(id)`.
- Primary keys are `uuid` (default `gen_random_uuid()`).
- `created_at` / `updated_at` are `timestamptz default now()`; `updated_at` is
  maintained by a trigger.
- **Enums** are used for stable, system-level status/type values but kept easy to
  extend (adding a value is a one-line migration). User-facing *labels* are handled
  in settings, not by renaming enum values.
- Money is stored as `numeric(12,2)`. Dates that represent a calendar day (contract
  dates, due dates, service month) are `date`, not `timestamptz`, to avoid timezone
  drift. The app's display timezone is **America/Chicago**.

## Enumerated types

| Enum                    | Values                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `user_role`             | owner, admin, team_member                                                                                |
| `sponsor_status`        | lead, active, paused, expired, archived                                                                  |
| `billing_frequency`     | monthly, quarterly, annually, one_time, custom                                                           |
| `deliverable_type`      | newsletter_placement, dedicated_email, social_post, social_story, social_reel, website_banner, podcast_mention, event_sponsorship, custom |
| `recurrence`            | monthly, quarterly, annually, one_time, custom                                                           |
| `subscription_status`   | active, paused, ended                                                                                    |
| `deliverable_status`    | not_scheduled, scheduled, waiting_on_assets, drafting, ready_for_review, approved, published, skipped, carried_forward, canceled |
| `asset_status`          | not_needed, missing, partial, received                                                                   |
| `slot_type`             | newsletter, dedicated_email, instagram_post, instagram_story, instagram_reel, facebook_post, podcast, website, event, custom |
| `invoice_status`        | not_created, draft, sent, partially_paid, paid, overdue, void                                            |
| `payment_method`        | ach, credit_card, check, cash, other                                                                     |
| `sponsor_asset_type`    | logo, photo, brand_guide, ad_copy, contract, invoice, report, other                                      |

## Tables

### organizations
`id, name, slug (unique), created_at, updated_at`
Wichita Life is inserted by the seed as the first organization.

### profiles
`id (= auth.users.id), organization_id, full_name, role (user_role), created_at, updated_at`
One row per authenticated user. A trigger creates a profile when a new auth user
signs up.

### sponsors
`id, organization_id, company_name, status (sponsor_status), website, industry,
primary_contact_name, primary_contact_email, primary_contact_phone,
billing_contact_name, billing_contact_email, notes, contract_start_date,
contract_end_date, monthly_price (numeric), billing_frequency, payment_method,
logo_url, created_at, updated_at`

### packages
`id, organization_id, name, description, base_price (numeric), billing_frequency,
active (bool default true), created_at, updated_at`

### package_deliverable_rules
`id, organization_id, package_id → packages, deliverable_type, quantity (int),
recurrence, notes, created_at, updated_at`
Defines the recurring deliverables a package includes.

### sponsor_subscriptions
`id, organization_id, sponsor_id → sponsors, package_id → packages (nullable),
custom_monthly_price (numeric, nullable — overrides package price),
start_date, end_date (nullable), status (subscription_status),
auto_generate_deliverables (bool default true), notes, created_at, updated_at`

### subscription_deliverable_overrides
`id, organization_id, sponsor_subscription_id → sponsor_subscriptions,
deliverable_type, quantity (int), recurrence, notes, created_at, updated_at`
Per-sponsor customization. **Interpretation to confirm (see recommendations):** an
override row *sets* the effective quantity for that deliverable type (0 = remove),
replacing the package rule for that type.

### deliverables
`id, organization_id, sponsor_id → sponsors,
sponsor_subscription_id → sponsor_subscriptions (nullable, for manual adds),
deliverable_type, title, service_month (date, first of month),
due_date, scheduled_date, published_date (all date, nullable),
status (deliverable_status), content_channel, content_url,
asset_status (asset_status), notes, created_at, updated_at`
Plus a bookkeeping column **`original_service_month`** (see recommendations) so
carry-forward preserves the original month.

### deliverable_status_history
`id, organization_id, deliverable_id → deliverables, from_status, to_status,
changed_by (→ profiles), changed_at, note`
Audit trail for the deliverables workspace (Stage 7).

### generation_runs
`id, organization_id, service_month (date), run_by (→ profiles), created_count (int),
created_at`
Records when monthly generation was executed (idempotency + history).

### content_slots
`id, organization_id, slot_type, title, scheduled_date (date), capacity (int default 1),
notes, created_at, updated_at`
Newsletter / social inventory.

### deliverable_slot_assignments
`id, organization_id, deliverable_id → deliverables, content_slot_id → content_slots,
position (int), created_at`
Unique on `(deliverable_id)` if a deliverable can only be in one slot; unique on
`(content_slot_id, position)` for ordering.

### invoices
`id, organization_id, sponsor_id → sponsors, invoice_number,
service_period_start (date), service_period_end (date), invoice_date (date),
due_date (date), amount (numeric), status (invoice_status), invoice_url, notes,
created_at, updated_at`

### payments
`id, organization_id, sponsor_id → sponsors, invoice_id → invoices (nullable),
amount (numeric), payment_date (date), payment_method, reference_number, notes,
created_at`

### sponsor_assets
`id, organization_id, sponsor_id → sponsors, asset_type (sponsor_asset_type), name,
file_url, external_url, notes, created_at`
Later linked to deliverables (Stage 11) via an optional `deliverable_id`.

## Indexes (initial)

- Every `organization_id` column.
- `sponsors(status)`, `sponsors(contract_end_date)`.
- `deliverables(service_month)`, `deliverables(status)`, `deliverables(sponsor_id)`,
  `deliverables(due_date)`, `deliverables(scheduled_date)`.
- `invoices(status)`, `invoices(sponsor_id)`, `invoices(due_date)`.
- `payments(invoice_id)`, `payments(sponsor_id)`.
- `content_slots(scheduled_date)`, `deliverable_slot_assignments(content_slot_id)`.
- Partial unique index to prevent duplicate generation, e.g. unique on
  `(sponsor_subscription_id, deliverable_type, service_month, <sequence>)`.

## Row Level Security (RLS)

- RLS **enabled on every table**.
- A helper `auth_org_id()` returns the signed-in user's `organization_id` from
  `profiles`.
- Policy on each business table: `USING (organization_id = auth_org_id())` for
  select/insert/update/delete, so authenticated users only ever touch their own
  organization's rows. Refined per-role in later stages if needed.
- Storage buckets are private; files are served via signed URLs and access is scoped
  by organization (Stage 11).

## Seed data (Stage 2)

- 1 organization: **Wichita Life** (slug `wichita-life`).
- 1 owner profile (linked to your Supabase auth user).
- **3+ packages:** Newsletter Partner, Featured Partner, Presenting Partner
  (with deliverable rules matching your examples).
- **5 sample sponsors** across statuses (active, lead, paused, expired) with a mix of:
  paid / unpaid invoices, scheduled / unscheduled deliverables, monthly vs
  quarterly vs annual billing, and a customized package (override) example.
- All demo rows tagged so they can be safely removed in Stage 16 (`is_demo` flag or a
  documented cleanup script).

## Recommended changes to the requested schema

Before writing migrations, I recommend these additions/adjustments:

1. **`original_service_month` on `deliverables`.** The spec says a carried-forward
   deliverable must "preserve the original service month." Cleanest way: keep
   `service_month` as the month it's *currently* being fulfilled in, and add
   `original_service_month` to remember where it started. (Alternative: never change
   `service_month` and add `fulfillment_month`. I'll use whichever you prefer — I
   lean toward `original_service_month`.)

2. **`subscription_status` needs `ended`.** Your subscription status wording implies
   active/paused/expired; I propose `active | paused | ended` and drive
   "expired/ended" off dates + this field, so generation can cleanly ignore ended
   subscriptions.

3. **`payment_method` as an enum** with an `other` escape hatch, rather than free
   text, for consistent reporting — with `custom`/`other` so it's never limiting.

4. **`deliverable_status_history` + `generation_runs` tables** (not in the original
   field lists) are required to satisfy "status history / audit log" (Stage 7) and
   "record when generation was run" (Stage 6). Adding them now.

5. **`is_demo boolean default false`** on seedable tables so Stage 16's "safely
   remove demo data" is a trivial, reversible filter instead of guesswork.

6. **A sequence/index number for generated deliverables** (e.g. store "1 of 2" via a
   `sequence` int) so the idempotency unique index is exact and the UI can label
   "Newsletter placement 1 of 2."

These are additive and don't remove any field you asked for. Tell me if you'd like
any changed before I write the migrations.
