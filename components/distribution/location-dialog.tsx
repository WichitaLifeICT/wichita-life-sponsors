"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  createLocation,
  updateLocation,
  type DistActionState,
} from "@/lib/actions/distribution";
import type { DistributionLocation } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function LocationDialog({
  location,
  trigger,
}: {
  location?: DistributionLocation;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const action = location
    ? updateLocation.bind(null, location.id)
    : createLocation;
  const [state, formAction, pending] = useActionState<DistActionState, FormData>(
    action,
    { error: null },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{location ? "Edit location" : "New location"}</DialogTitle>
          </DialogHeader>
          {state.error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="l_name">Name</Label>
            <Input id="l_name" name="name" defaultValue={location?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="l_contact">Contact name</Label>
              <Input
                id="l_contact"
                name="contact_name"
                defaultValue={location?.contact_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="l_phone">Phone</Label>
              <Input id="l_phone" name="phone" defaultValue={location?.phone ?? ""} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="l_email">Contact email</Label>
              <Input
                id="l_email"
                name="contact_email"
                type="email"
                defaultValue={location?.contact_email ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="l_address">Address</Label>
              <Input
                id="l_address"
                name="address"
                defaultValue={location?.address ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="l_notes">Notes</Label>
              <Textarea
                id="l_notes"
                name="notes"
                rows={2}
                defaultValue={location?.notes ?? ""}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {location ? "Save" : "Create location"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
