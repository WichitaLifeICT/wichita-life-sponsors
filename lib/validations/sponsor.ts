import { z } from "zod";
import { deliverableRuleSchema } from "@/lib/validations/package";

const SPONSOR_STATUS = [
  "lead",
  "active",
  "paused",
  "expired",
  "archived",
] as const;

const BILLING_FREQUENCY = [
  "monthly",
  "quarterly",
  "annually",
  "one_time",
  "custom",
] as const;

const PAYMENT_METHOD = [
  "ach",
  "credit_card",
  "check",
  "cash",
  "stripe",
  "other",
] as const;

// Empty string -> undefined, so optional fields clear cleanly.
const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined));

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address.",
  });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Use a valid date.",
  });

const optionalMoney = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  })
  .refine((v) => v === undefined || v >= 0, {
    message: "Price cannot be negative.",
  });

export const sponsorSchema = z
  .object({
    company_name: z.string().trim().min(1, "Company name is required.").max(200),
    status: z.enum(SPONSOR_STATUS),
    website: optionalText,
    industry: optionalText,
    primary_contact_name: optionalText,
    primary_contact_email: optionalEmail,
    primary_contact_phone: optionalText,
    billing_contact_name: optionalText,
    billing_contact_email: optionalEmail,
    notes: z.string().trim().max(5000).optional().transform((v) => (v ? v : undefined)),
    contract_start_date: optionalDate,
    contract_end_date: optionalDate,
    monthly_price: optionalMoney,
    billing_frequency: z.enum(BILLING_FREQUENCY),
    payment_method: z
      .enum(PAYMENT_METHOD)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    stripe_subscription: z.coerce.boolean().default(false),
    // Package assignment (creates/updates a single active subscription).
    package_id: z
      .string()
      .optional()
      .transform((v) => (v && v !== "none" ? v : undefined)),
    custom_monthly_price: optionalMoney,
    auto_generate_deliverables: z.coerce.boolean().default(true),
    // Inline à la carte deliverables (used when package_id === "custom").
    rules: z.array(deliverableRuleSchema).default([]),
    save_as_package: z.coerce.boolean().default(false),
    new_package_name: optionalText,
  })
  .refine(
    (data) =>
      !data.contract_start_date ||
      !data.contract_end_date ||
      data.contract_end_date >= data.contract_start_date,
    {
      message: "Contract end date must be on or after the start date.",
      path: ["contract_end_date"],
    },
  );

export type SponsorFormValues = z.input<typeof sponsorSchema>;
export type SponsorParsed = z.output<typeof sponsorSchema>;
