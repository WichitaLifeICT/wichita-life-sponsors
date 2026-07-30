"use client";

import { Trash2 } from "lucide-react";

import { removeDemoData } from "@/lib/actions/data";
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

export function RemoveDemoButton() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          <Trash2 className="size-4" />
          Remove demo data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove all demo data?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes only the sample records (the 5 demo sponsors, demo
            packages, slots, and drop-offs). Anything real you&apos;ve entered is
            kept. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {/* Plain submit (not AlertDialogAction) so closing the dialog doesn't
              abort the server action before it runs. */}
          <form action={removeDemoData}>
            <Button type="submit">Remove demo data</Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
