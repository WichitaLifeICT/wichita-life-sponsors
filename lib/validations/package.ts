import { z } from "zod";

const BILLING_FREQUENCY = [
  "monthly",
  "quarterly",
  "annually",
  "one_time",
  "custom",
] as const;

const DELIVERABLE_TYPE = [
  "newsletter_placement",
  "dedicated_email",
  "social_post",
  "social_story",
  "social_reel",
  "website_banner",
  "podcast_mention",
  "event_sponsorship",
  "custom",
] as const;

const RECURRENCE = [
  "monthly",
  "quarterly",
  "annually",
  "one_time",
  "custom",
] as const;

const money = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return 0;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  })
  .refine((v) => v >= 0, { message: "Price cannot be negative." });

export const deliverableRuleSchema = z.object({
  deliverable_type: z.enum(DELIVERABLE_TYPE),
  quantity: z.coerce.number().int().min(0).max(999),
  recurrence: z.enum(RECURRENCE),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const packageSchema = z.object({
  name: z.string().trim().min(1, "Package name is required.").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  base_price: money,
  billing_frequency: z.enum(BILLING_FREQUENCY),
  active: z.coerce.boolean().default(true),
  rules: z.array(deliverableRuleSchema).default([]),
});

export type PackageParsed = z.output<typeof packageSchema>;
export type DeliverableRuleValues = z.input<typeof deliverableRuleSchema>;
