import { ManagementShell } from "@/components/layout/management-shell";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { loadManagementNotices } from "@/lib/notifications/management";
import { getMetabaseGuestConfig } from "@/lib/metabase/guest-embed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Apenas dados oficiais expostos ao perfil autenticado.
 * Falhas nas notificações não bloqueiam telas nem simulam avisos. */
export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await enforceRouteGuard(() => getActiveProfileContext());
  const supabase = await createClient();
  const [notices, auth] = await Promise.all([
    loadManagementNotices(supabase, profile.role).catch(() => ({ notices: [], error: true })),
    supabase.auth.getUser(),
  ]);
  const candidate = auth.data.user?.user_metadata?.display_name;
  const displayName = typeof candidate === "string" && candidate.length <= 80 ? candidate.trim() : "";
  return (
    <ManagementShell email={profile.email} role={profile.role} userId={user.id}
      displayName={displayName} notices={notices.notices} noticesUnavailable={notices.error}
      intelligenceEnabled={Boolean(getMetabaseGuestConfig())}>
      {children}
    </ManagementShell>
  );
}
