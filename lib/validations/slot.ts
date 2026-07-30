import { z } from "zod";

const SLOT_TYPE = [
  "newsletter",
  "dedicated_email",
  "instagram_post",
  "instagram_story",
  "instagram_reel",
  "facebook_post",
  "podcast",
  "website",
  "event",
  "custom",
] as const;

export const slotSchema = z.object({
  slot_type: z.enum(SLOT_TYPE),
  title: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : undefined)),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  capacity: z.coerce.number().int().min(1).max(50),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type SlotParsed = z.output<typeof slotSchema>;
