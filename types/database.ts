/**
 * Database types for the Wichita Life sponsor-management schema.
 *
 * Hand-authored to match supabase/migrations. Once your Supabase project is
 * linked you can regenerate a fully-typed version with:
 *   supabase gen types typescript --linked > types/database.ts
 */

// ---- Enums -------------------------------------------------------------------
export type UserRole = "owner" | "admin" | "team_member";

export type SponsorStatus = "lead" | "active" | "paused" | "expired" | "archived";

export type BillingFrequency =
  | "monthly" | "quarterly" | "annually" | "one_time" | "custom";

export type DeliverableType =
  | "newsletter_placement"
  | "newsletter_headline" | "newsletter_feature" | "newsletter_lower"
  | "event_banner"
  | "dedicated_email" | "social_post" | "social_story"
  | "social_reel" | "website_banner" | "podcast_mention" | "event_sponsorship" | "custom";

export type Recurrence = "monthly" | "quarterly" | "annually" | "one_time" | "custom";

export type SubscriptionStatus = "active" | "paused" | "ended";

export type DeliverableStatus =
  | "not_scheduled" | "scheduled" | "waiting_on_assets" | "drafting"
  | "ready_for_review" | "approved" | "published" | "skipped"
  | "carried_forward" | "canceled";

export type AssetStatus = "not_needed" | "missing" | "partial" | "received";

export type SlotType =
  | "newsletter" | "dedicated_email" | "instagram_post" | "instagram_story"
  | "instagram_reel" | "facebook_post" | "podcast" | "website" | "event" | "custom";

export type InvoiceStatus =
  | "not_created" | "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "void";

export type PaymentMethod =
  | "ach" | "credit_card" | "check" | "cash" | "stripe" | "other";

export type SponsorAssetType =
  | "logo" | "photo" | "brand_guide" | "ad_copy" | "contract" | "invoice" | "report" | "other";

// ---- Row shapes --------------------------------------------------------------
export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  organization_id: string;
  company_name: string;
  status: SponsorStatus;
  website: string | null;
  analytics_url: string | null;
  industry: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  notes: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_price: number | null;
  billing_frequency: BillingFrequency;
  payment_method: PaymentMethod | null;
  stripe_subscription: boolean;
  deal_type: string | null;
  deal_notes: string | null;
  logo_url: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  base_price: number;
  billing_frequency: BillingFrequency;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PackageDeliverableRule {
  id: string;
  organization_id: string;
  package_id: string;
  deliverable_type: DeliverableType;
  quantity: number;
  recurrence: Recurrence;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SponsorSubscription {
  id: string;
  organization_id: string;
  sponsor_id: string;
  package_id: string | null;
  custom_monthly_price: number | null;
  start_date: string;
  end_date: string | null;
  status: SubscriptionStatus;
  auto_generate_deliverables: boolean;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionDeliverableOverride {
  id: string;
  organization_id: string;
  sponsor_subscription_id: string;
  deliverable_type: DeliverableType;
  quantity: number;
  recurrence: Recurrence;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deliverable {
  id: string;
  organization_id: string;
  sponsor_id: string;
  sponsor_subscription_id: string | null;
  deliverable_type: DeliverableType;
  title: string | null;
  service_month: string;
  original_service_month: string;
  sequence: number | null;
  quantity_total: number | null;
  due_date: string | null;
  scheduled_date: string | null;
  published_date: string | null;
  status: DeliverableStatus;
  content_channel: string | null;
  content_url: string | null;
  asset_status: AssetStatus;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliverableStatusHistory {
  id: string;
  organization_id: string;
  deliverable_id: string;
  from_status: DeliverableStatus | null;
  to_status: DeliverableStatus;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
}

export interface GenerationRun {
  id: string;
  organization_id: string;
  service_month: string;
  run_by: string | null;
  created_count: number;
  skipped_count: number;
  created_at: string;
}

export interface ContentSlot {
  id: string;
  organization_id: string;
  slot_type: SlotType;
  title: string | null;
  scheduled_date: string;
  capacity: number;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliverableSlotAssignment {
  id: string;
  organization_id: string;
  deliverable_id: string;
  content_slot_id: string;
  position: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  sponsor_id: string;
  invoice_number: string | null;
  service_period_start: string | null;
  service_period_end: string | null;
  invoice_date: string | null;
  due_date: string | null;
  amount: number;
  status: InvoiceStatus;
  invoice_url: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  sponsor_id: string;
  invoice_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | null;
  reference_number: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
}

export type DistributionDealType = "wholesale" | "consignment";
export type DistributionProductCategory =
  | "puzzle" | "hat" | "apparel" | "print" | "other";

export interface DistributionLocation {
  id: string;
  organization_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DistributionProduct {
  id: string;
  organization_id: string;
  name: string;
  category: DistributionProductCategory;
  retail_price: number;
  wholesale_price: number;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DistributionDropoff {
  id: string;
  organization_id: string;
  location_id: string;
  deal_type: DistributionDealType;
  delivered_date: string;
  consignment_rate: number;
  paid: boolean;
  paid_date: string | null;
  settled: boolean;
  notes: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DistributionDropoffItem {
  id: string;
  organization_id: string;
  dropoff_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_wholesale_price: number;
  unit_retail_price: number;
  quantity_sold: number;
  quantity_returned: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SponsorAsset {
  id: string;
  organization_id: string;
  sponsor_id: string;
  deliverable_id: string | null;
  asset_type: SponsorAssetType;
  name: string | null;
  file_url: string | null;
  external_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  is_demo: boolean;
  created_at: string;
}
