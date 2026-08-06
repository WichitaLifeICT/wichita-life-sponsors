import { z } from "zod";

export const slotSchema = z.object({
  // Slots use the deliverable-type vocabulary so they line up with the
  // deliverables they hold; slot_type is derived from this server-side.
  deliverable_type: z.string().min(1, "Choose a type."),
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
