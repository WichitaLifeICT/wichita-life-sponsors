# Pre-Launch Checklist

Work through this before you start entering real Wichita Life data.

## Database migrations (Supabase → SQL Editor)
Run any you haven't yet (all safe to re-run):
- [ ] `20260101000001_schema.sql` and `20260101000002_functions_and_rls.sql` (core)
- [ ] `20260101000003_email_slot_types.sql` (email ad slots)
- [ ] `20260101000004_stripe_payment_method.sql` (Stripe + subscription flag)
- [ ] `20260101000006_billing_periods.sql` (mark-paid ledger)
- [ ] `20260101000007_distribution.sql` (wholesale/consignment)
- [ ] `20260101000008_storage.sql` (asset storage bucket + policies)

## Environment / security
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
      `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel (Project → Settings → Env Vars).
- [ ] The **service_role** key is only in Vercel env vars — never shared, never in
      the repo, never used in browser code. (It isn't referenced by any client code.)
- [ ] Row Level Security is on for every table (the migrations enable it) so data
      is scoped to your organization.
- [ ] You can sign in and see your data; a signed-out visitor is redirected to login.

## Data
- [ ] Explore with the demo data first (5 sample sponsors).
- [ ] When ready, **Settings → Data management → Remove demo data** (deletes only
      sample rows; anything you added stays).
- [ ] Import your real sponsors (**Sponsors → Import**) or add them by hand.
- [ ] Create your real packages, then assign them to sponsors.

## First month
- [ ] Set contract start dates so billing periods and generation work.
- [ ] **Deliverables → Generate monthly deliverables** for the current month.
- [ ] **Calendar → Auto-schedule emails** for your send days.
- [ ] Assign deliverables to slots; check each sponsor shows "All scheduled".

## Backups
Supabase automatically backs up your database on paid plans; on the free plan you
can export tables from the Supabase dashboard (Table Editor → Export) periodically.
