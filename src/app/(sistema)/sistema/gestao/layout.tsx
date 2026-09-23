import { requireDashboardAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function DashboardAccessLayout({ children }: { children: React.ReactNode }) {
  await enforceRouteGuard(() => requireDashboardAccess());
  return children;
}
