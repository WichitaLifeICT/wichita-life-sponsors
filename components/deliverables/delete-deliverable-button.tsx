"use client";

import { Trash2 } from "lucide-react";

import { deleteDeliverable } from "@/lib/actions/deliverables";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteDeliverableButton({
  id,
  label,
  returnTo,
}: {
  id: string;
  label?: string;
  returnTo?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label="Delete deliverable"
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this deliverable?</AlertDialogTitle>
          <AlertDialogDescription>
            {label ? `“${label}” ` : "This deliverable "}
            will be permanently removed, including any calendar assignment. This
            can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* Plain submit button (not AlertDialogAction) so closing the dialog
              doesn't abort the server action mid-flight. */}
          <form action={deleteDeliverable.bind(null, id, returnTo)}>
            <Button type="submit" variant="destructive">
              Delete
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
