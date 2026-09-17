import { redirect } from "next/navigation";

import { destinationForAccessError } from "./navigation";
import type { ActiveProfileContext } from "./types";

export async function enforceRouteGuard(
  guard: () => Promise<ActiveProfileContext>,
) {
  try {
    return await guard();
  } catch (error) {
    redirect(destinationForAccessError(error));
  }
}
