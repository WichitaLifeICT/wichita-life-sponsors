"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { SidebarBody } from "@/components/layout/sidebar-body";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileHeaderProps {
  orgName: string;
  userName: string | null;
  userEmail: string | null;
}

export function MobileHeader({
  orgName,
  userName,
  userEmail,
}: MobileHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarBody
            orgName={orgName}
            userName={userName}
            userEmail={userEmail}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <span className="font-semibold">{orgName}</span>
    </header>
  );
}
