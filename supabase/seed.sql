-- =============================================================================
-- Wichita Life Sponsor Management — Demo Seed Data
-- All rows are flagged is_demo = true so they can be removed safely later
-- (see Stage 16 / scripts/remove-demo-data.sql).
-- Safe to re-run: every insert uses ON CONFLICT (id) DO NOTHING.
-- =============================================================================

-- Organization -----------------------------------------------------------------
insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-000000000001', 'Wichita Life', 'wichita-life')
on conflict (id) do nothing;

-- Packages ---------------------------------------------------------------------
insert into packages (id, organization_id, name, description, base_price, billing_frequency, active, is_demo) values
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Newsletter Partner','1 newsletter placement per month.',150,'monthly',true,true),
  ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Featured Partner','2 newsletter placements + 1 social post per month.',500,'monthly',true,true),
  ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','Presenting Partner','4 newsletter placements + 2 social posts + 1 website banner per month.',1200,'monthly',true,true)
on conflict (id) do nothing;

-- Package deliverable rules ----------------------------------------------------
insert into package_deliverable_rules (id, organization_id, package_id, deliverable_type, quantity, recurrence) values
  -- Newsletter Partner
  ('11000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','newsletter_placement',1,'monthly'),
  -- Featured Partner
  ('11000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','newsletter_placement',2,'monthly'),
  ('11000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','social_post',1,'monthly'),
  -- Presenting Partner
  ('11000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','newsletter_placement',4,'monthly'),
  ('11000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','social_post',2,'monthly'),
  ('11000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','website_banner',1,'monthly')
on conflict (id) do nothing;

-- Sponsors (mix of statuses / billing frequencies / contract windows) ----------
insert into sponsors (id, organization_id, company_name, status, website, industry,
  primary_contact_name, primary_contact_email, primary_contact_phone,
  billing_contact_name, billing_contact_email, notes,
  contract_start_date, contract_end_date, monthly_price, billing_frequency, payment_method, is_demo) values
  ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Prairie Fire Coffee Co.','active','https://prairiefirecoffee.example','Food & Beverage',
    'Jenna Ruiz','jenna@prairiefirecoffee.example','316-555-0101','Jenna Ruiz','billing@prairiefirecoffee.example','Loves local roaster features.',
    date '2026-01-01', date '2026-09-15', 500, 'monthly','ach',true),
  ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','Sunflower Realty Group','active','https://sunflowerrealty.example','Real Estate',
    'Marcus Webb','marcus@sunflowerrealty.example','316-555-0102','Dana Webb','ap@sunflowerrealty.example','Presenting sponsor for the parade coverage.',
    date '2026-03-01', date '2027-02-28', 1200, 'monthly','check',true),
  ('20000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','ICT Bikes','active','https://ictbikes.example','Retail',
    'Priya Anand','priya@ictbikes.example','316-555-0103','Priya Anand','priya@ictbikes.example','Billed quarterly; wants extra newsletter reach.',
    date '2026-06-01', date '2026-08-20', 300, 'quarterly','credit_card',true),
  ('20000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','Delano Provisions','lead','https://delanoprovisions.example','Food & Beverage',
    'Sam Carter','sam@delanoprovisions.example','316-555-0104',null,null,'Interested; sent proposal, no package yet.',
    null, null, null, 'monthly',null,true),
  ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','Air Capital Fitness','paused','https://aircapitalfitness.example','Health & Fitness',
    'Renee Diaz','renee@aircapitalfitness.example','316-555-0105','Renee Diaz','renee@aircapitalfitness.example','Contract ended in June; considering renewal.',
    date '2025-07-01', date '2026-06-30', 500, 'monthly','ach',true)
on conflict (id) do nothing;

-- Subscriptions (link sponsors to packages; one with a price + deliverable override)
insert into sponsor_subscriptions (id, organization_id, sponsor_id, package_id,
  custom_monthly_price, start_date, end_date, status, auto_generate_deliverables, is_demo) values
  ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',
    null, date '2026-01-01', date '2026-09-15','active',true,true),
  ('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',
    null, date '2026-03-01', date '2027-02-28','active',true,true),
  -- ICT Bikes: Newsletter Partner but overridden to 3 newsletter placements, custom price
  ('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',
    300, date '2026-06-01', date '2026-08-20','active',true,true),
  -- Air Capital Fitness: ended subscription (should be ignored by generation)
  ('30000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002',
    null, date '2025-07-01', date '2026-06-30','ended',true,true)
on conflict (id) do nothing;

-- Subscription deliverable override: ICT Bikes gets 3 newsletter placements ----
insert into subscription_deliverable_overrides (id, organization_id, sponsor_subscription_id, deliverable_type, quantity, recurrence, notes) values
  ('31000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000003','newsletter_placement',3,'monthly','Upgraded reach for summer.')
on conflict (id) do nothing;

-- Deliverables -----------------------------------------------------------------
-- August 2026 (service_month 2026-08-01) — mix of statuses & asset states.
insert into deliverables (id, organization_id, sponsor_id, sponsor_subscription_id, deliverable_type,
  title, service_month, original_service_month, sequence, quantity_total,
  due_date, scheduled_date, published_date, status, asset_status, is_demo) values
  -- Prairie Fire (Featured): 2 newsletter + 1 social
  ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','newsletter_placement','Newsletter placement 1 of 2', date '2026-08-01', date '2026-08-01',1,2, date '2026-08-05', date '2026-08-05', null,'scheduled','received',true),
  ('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','newsletter_placement','Newsletter placement 2 of 2', date '2026-08-01', date '2026-08-01',2,2, date '2026-08-19', null, null,'not_scheduled','missing',true),
  ('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','social_post','Social post 1 of 1', date '2026-08-01', date '2026-08-01',1,1, date '2026-08-08', date '2026-08-08', null,'scheduled','received',true),
  -- Sunflower Realty (Presenting): 4 newsletter + 2 social + 1 banner (subset shown)
  ('40000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','newsletter_placement','Newsletter placement 1 of 4', date '2026-08-01', date '2026-08-01',1,4, date '2026-08-05', date '2026-08-05', null,'waiting_on_assets','partial',true),
  ('40000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','newsletter_placement','Newsletter placement 2 of 4', date '2026-08-01', date '2026-08-01',2,4, date '2026-08-12', null, null,'not_scheduled','missing',true),
  ('40000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','website_banner','Website banner 1 of 1', date '2026-08-01', date '2026-08-01',1,1, date '2026-08-01', date '2026-08-01', null,'approved','received',true),
  -- ICT Bikes (overridden to 3 newsletter)
  ('40000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','newsletter_placement','Newsletter placement 1 of 3', date '2026-08-01', date '2026-08-01',1,3, date '2026-08-05', date '2026-08-05', null,'scheduled','received',true),
  ('40000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','newsletter_placement','Newsletter placement 2 of 3', date '2026-08-01', date '2026-08-01',2,3, date '2026-08-12', null, null,'not_scheduled','not_needed',true),
  ('40000000-0000-0000-0000-000000000022','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000003','newsletter_placement','Newsletter placement 3 of 3', date '2026-08-01', date '2026-08-01',3,3, date '2026-08-19', null, null,'not_scheduled','not_needed',true),
  -- July 2026 published history + one carried forward into August
  ('40000000-0000-0000-0000-000000000030','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','newsletter_placement','Newsletter placement 1 of 2', date '2026-07-01', date '2026-07-01',1,2, date '2026-07-08', date '2026-07-08', date '2026-07-08','published','received',true),
  -- Carried forward: originally July, now being fulfilled in August (note preserved original_service_month)
  ('40000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','social_post','Social post (carried from July)', date '2026-08-01', date '2026-07-01',2,2, date '2026-08-15', null, null,'carried_forward','missing',true)
on conflict (id) do nothing;

-- Content slots (newsletter + social inventory for August 2026) -----------------
insert into content_slots (id, organization_id, slot_type, title, scheduled_date, capacity, is_demo) values
  ('50000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','newsletter','Wichita Life Newsletter', date '2026-08-05', 2, true),
  ('50000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','newsletter','Wichita Life Newsletter', date '2026-08-12', 2, true),
  ('50000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','newsletter','Wichita Life Newsletter', date '2026-08-19', 2, true),
  ('50000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','instagram_post','Instagram Feed Post', date '2026-08-08', 1, true),
  ('50000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','dedicated_email','Dedicated Email Blast', date '2026-08-14', 1, true)
on conflict (id) do nothing;

-- Slot assignments (schedule a few deliverables) -------------------------------
insert into deliverable_slot_assignments (id, organization_id, deliverable_id, content_slot_id, position) values
  ('51000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001',0),
  ('51000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000020','50000000-0000-0000-0000-000000000001',1),
  ('51000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','50000000-0000-0000-0000-000000000004',0)
on conflict (id) do nothing;

-- Invoices (paid / overdue / partial / annual-style) ---------------------------
insert into invoices (id, organization_id, sponsor_id, invoice_number,
  service_period_start, service_period_end, invoice_date, due_date, amount, status, is_demo) values
  -- Prairie Fire: paid, current month
  ('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','WL-2026-0001', date '2026-08-01', date '2026-08-31', date '2026-08-01', date '2026-08-15', 500,'paid',true),
  -- Sunflower Realty: sent, past due (overdue)
  ('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','WL-2026-0002', date '2026-07-01', date '2026-07-31', date '2026-07-01', date '2026-07-15', 1200,'sent',true),
  -- ICT Bikes: quarterly invoice (Jun–Aug), partially paid
  ('60000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','WL-2026-0003', date '2026-06-01', date '2026-08-31', date '2026-06-01', date '2026-06-15', 900,'partially_paid',true)
on conflict (id) do nothing;

-- Payments ---------------------------------------------------------------------
insert into payments (id, organization_id, sponsor_id, invoice_id, amount, payment_date, payment_method, reference_number, is_demo) values
  ('70000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001', 500, date '2026-08-10','ach','ACH-88213',true),
  -- ICT Bikes paid half of the quarterly invoice
  ('70000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000003', 450, date '2026-06-12','credit_card','CC-40021',true)
on conflict (id) do nothing;

-- Generation run record (August 2026 was generated) ----------------------------
insert into generation_runs (id, organization_id, service_month, created_count, skipped_count) values
  ('80000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001', date '2026-08-01', 9, 0)
on conflict (id) do nothing;
