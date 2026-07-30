import { redirect } from "next/navigation";

import { getSessionContext } from "@/lib/data/session";
import { SidebarBody } from "@/components/layout/sidebar-body";
import { MobileHeader } from "@/components/layout/mobile-header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionContext();

  // The proxy already guards these routes; this is a defense-in-depth check.
  if (!session) redirect("/login");

  const orgName = session.organization?.name ?? "Wichita Life";
  const userName = session.profile?.full_name ?? null;
  const userEmail = session.email;

  return (
    <div className="flex min-h-svh bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
        <div className="sticky top-0 h-svh">
          <SidebarBody
            orgName={orgName}
            userName={userName}
            userEmail={userEmail}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader
          orgName={orgName}
          userName={userName}
          userEmail={userEmail}
        />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
