"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";

import { importSponsors, type ImportState } from "@/lib/actions/import";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial: ImportState = { done: false, imported: 0, skipped: 0, errors: [] };

export function SponsorImportForm() {
  const [state, formAction, pending] = useActionState(importSponsors, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Upload a CSV file</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm"
        />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or paste it{" "}
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="csv">Paste CSV rows</Label>
        <Textarea
          id="csv"
          name="csv"
          rows={6}
          placeholder="company_name,status,primary_contact_email,monthly_price,billing_frequency…"
          className="font-mono text-xs"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Import sponsors
      </Button>

      {state.done && (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-4 text-success" />
            Imported {state.imported} · skipped {state.skipped} duplicate
            {state.skipped === 1 ? "" : "s"}
          </p>
          {state.errors.length > 0 && (
            <ul className="list-inside list-disc text-destructive">
              {state.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
          {state.imported > 0 && (
            <Link href="/sponsors" className="text-primary hover:underline">
              View sponsors →
            </Link>
          )}
        </div>
      )}
    </form>
  );
}
