"use client";

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { runGeneration } from "@/lib/actions/generation";
import { deliverableTypeLabel } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GenerationPreview } from "@/lib/data/generation";

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? "Generating…" : "Generate deliverables"}
    </Button>
  );
}

export function GenerateDialog({
  serviceMonth, // YYYY-MM-01
  monthLabel,
  preview,
}: {
  serviceMonth: string;
  monthLabel: string;
  preview: GenerationPreview;
}) {
  const [open, setOpen] = useState(false);
  const action = runGeneration.bind(null, serviceMonth);
  const nothingToDo = preview.totalNew === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Sparkles className="size-4" />
          Generate monthly deliverables
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate deliverables · {monthLabel}</DialogTitle>
          <DialogDescription>
            Preview what will be created. Running this is safe to repeat — it
            never creates duplicates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <strong className="tabular-nums">{preview.totalNew}</strong> new to
              create
            </span>
            <span className="text-muted-foreground">
              {preview.skipped} already exist (skipped)
            </span>
          </div>

          {nothingToDo ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <CheckCircle2 className="size-4 text-success" />
              Everything for {monthLabel} has already been generated.
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
              {preview.rows.map((row) => (
                <div key={row.sponsorId} className="text-sm">
                  <p className="font-medium">{row.sponsorName}</p>
                  <ul className="ml-4 list-disc text-muted-foreground">
                    {row.byType.map((t) => (
                      <li key={t.deliverable_type}>
                        {t.count}× {deliverableTypeLabel(t.deliverable_type)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} type="button">
            Cancel
          </Button>
          <form action={action}>
            <ConfirmButton disabled={nothingToDo} />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
