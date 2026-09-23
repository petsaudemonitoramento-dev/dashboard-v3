import { redirect } from "next/navigation";

import { getActiveProfileContext } from "@/lib/auth/guards";
import { homeForRole } from "@/lib/auth/navigation";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function SystemHomePage() {
  const context = await enforceRouteGuard(() => getActiveProfileContext());
  redirect(homeForRole(context.profile.role));
}
