"use client";

import { Trash2 } from "lucide-react";

import { removeDemoData } from "@/lib/actions/data";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
          <form action={removeDemoData}>
            <AlertDialogAction type="submit">Remove demo data</AlertDialogAction>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
