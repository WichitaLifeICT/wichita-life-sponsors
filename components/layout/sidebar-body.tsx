import { Sparkles } from "lucide-react";

import { NavLinks } from "@/components/layout/nav-links";
import { UserMenu } from "@/components/layout/user-menu";

interface SidebarBodyProps {
  orgName: string;
  userName: string | null;
  userEmail: string | null;
  onNavigate?: () => void;
}

/** The sidebar contents, reused by both the desktop rail and the mobile sheet. */
export function SidebarBody({
  orgName,
  userName,
  userEmail,
  onNavigate,
}: SidebarBodyProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Organization (top) */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{orgName}</p>
          <p className="text-xs text-muted-foreground">Sponsor Management</p>
        </div>
      </div>

      {/* Navigation (middle) */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks onNavigate={onNavigate} />
      </div>

      {/* User + logout (bottom) */}
      <div className="border-t p-3">
        <UserMenu name={userName} email={userEmail} />
      </div>
    </div>
  );
}
