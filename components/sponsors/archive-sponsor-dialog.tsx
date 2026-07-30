"use client";

import { Archive } from "lucide-react";

import { archiveSponsor } from "@/lib/actions/sponsors";
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

export function ArchiveSponsorDialog({
  sponsorId,
  companyName,
}: {
  sponsorId: string;
  companyName: string;
}) {
  const action = archiveSponsor.bind(null, sponsorId);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Archive className="size-4" />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {companyName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This hides the sponsor from active views. Nothing is deleted — you can
            set the status back to active at any time by editing the sponsor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <form action={action}>
            <Button type="submit">Archive sponsor</Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
