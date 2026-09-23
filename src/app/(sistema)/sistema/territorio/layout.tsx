import { requireTerritoryAdministrator } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";

export default async function TerritoryAccessLayout({ children }: { children: React.ReactNode }) {
  await enforceRouteGuard(() => requireTerritoryAdministrator());
  return children;
}
