"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/data/session";
import { parseCsv } from "@/lib/csv";
import { todayISO } from "@/lib/domain/dates";

export interface ImportState {
  done: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

const STATUSES = new Set(["lead", "active", "paused", "expired", "archived"]);
const FREQS = new Set(["monthly", "quarterly", "annually", "one_time", "custom"]);
const METHODS = new Set(["ach", "credit_card", "check", "cash", "stripe", "other"]);

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) if (row[k]) return row[k];
  return "";
}
function money(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function isoDate(v: string): string | null {
  if (!v) return null;
  // Accept YYYY-MM-DD or M/D/YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

export async function importSponsors(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  let text = String(formData.get("csv") ?? "");
  const file = formData.get("file");
  if (file && typeof file === "object" && "text" in file) {
    const f = file as File;
    if (f.size > 0) text = await f.text();
  }
  if (!text.trim()) {
    return { done: true, imported: 0, skipped: 0, errors: ["No CSV provided."] };
  }

  const session = await getSessionContext();
  if (!session?.organization)
    return { done: true, imported: 0, skipped: 0, errors: ["Session expired."] };
  const orgId = session.organization.id;

  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return { done: true, imported: 0, skipped: 0, errors: ["No rows found in the CSV."] };
  }

  const supabase = await createClient();

  // Existing names/emails for duplicate detection.
  const { data: existing } = await supabase
    .from("sponsors")
    .select("company_name, primary_contact_email");
  const seenNames = new Set(
    (existing ?? []).map((s) => (s.company_name as string).toLowerCase()),
  );
  const seenEmails = new Set(
    (existing ?? [])
      .map((s) => (s.primary_contact_email as string | null)?.toLowerCase())
      .filter(Boolean) as string[],
  );

  // Packages for optional assignment by name.
  const { data: pkgs } = await supabase.from("packages").select("id, name");
  const pkgByName = new Map(
    (pkgs ?? []).map((p) => [(p.name as string).toLowerCase(), p.id as string]),
  );

  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = pick(row, "company_name", "company", "name");
    const line = i + 2; // header is line 1

    if (!name) {
      errors.push(`Row ${line}: missing company name — skipped.`);
      continue;
    }
    const email = pick(row, "primary_contact_email", "email").toLowerCase();
    if (
      seenNames.has(name.toLowerCase()) ||
      (email && seenEmails.has(email))
    ) {
      skipped++;
      continue;
    }

    const status = pick(row, "status").toLowerCase();
    const freq = pick(row, "billing_frequency", "frequency").toLowerCase();
    const method = pick(row, "payment_method", "method").toLowerCase();

    const { data: inserted, error } = await supabase
      .from("sponsors")
      .insert({
        organization_id: orgId,
        company_name: name,
        status: STATUSES.has(status) ? status : "lead",
        website: pick(row, "website") || null,
        industry: pick(row, "industry") || null,
        primary_contact_name: pick(row, "primary_contact_name", "contact_name") || null,
        primary_contact_email: pick(row, "primary_contact_email", "email") || null,
        primary_contact_phone: pick(row, "primary_contact_phone", "phone") || null,
        billing_contact_name: pick(row, "billing_contact_name") || null,
        billing_contact_email: pick(row, "billing_contact_email") || null,
        notes: pick(row, "notes") || null,
        monthly_price: money(pick(row, "monthly_price", "price")),
        billing_frequency: FREQS.has(freq) ? freq : "monthly",
        payment_method: METHODS.has(method) ? method : null,
        contract_start_date: isoDate(pick(row, "contract_start_date", "start_date")),
        contract_end_date: isoDate(pick(row, "contract_end_date", "end_date")),
      })
      .select("id")
      .single();

    if (error || !inserted) {
      errors.push(`Row ${line} (${name}): could not import.`);
      continue;
    }

    // Optional package assignment by name.
    const pkgName = pick(row, "package").toLowerCase();
    const pkgId = pkgName ? pkgByName.get(pkgName) : undefined;
    if (pkgId) {
      await supabase.from("sponsor_subscriptions").insert({
        organization_id: orgId,
        sponsor_id: inserted.id,
        package_id: pkgId,
        start_date:
          isoDate(pick(row, "contract_start_date", "start_date")) ?? todayISO(),
        end_date: isoDate(pick(row, "contract_end_date", "end_date")),
        status: "active",
      });
    }

    seenNames.add(name.toLowerCase());
    if (email) seenEmails.add(email);
    imported++;
  }

  revalidatePath("/sponsors");
  return { done: true, imported, skipped, errors };
}
