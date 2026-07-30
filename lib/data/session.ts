import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/database";

export interface SessionContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  organization: Organization | null;
}

/**
 * Loads the signed-in user together with their profile and organization.
 * Returns null when there is no authenticated user.
 *
 * Wrapped in React.cache so multiple server components in one request share a
 * single round-trip.
 */
export const getSessionContext = cache(
  async (): Promise<SessionContext | null> => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    let organization: Organization | null = null;
    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle();
      organization = org ?? null;
    }

    return {
      userId: user.id,
      email: user.email ?? null,
      profile: (profile as Profile) ?? null,
      organization,
    };
  },
);
