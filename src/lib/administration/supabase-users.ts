import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";
import {
  loadAdministrationUsers,
  type AdministrationProfile,
} from "@/lib/administration/users";

export async function loadAdministrationUsersFromSupabase(page: number) {
  const privileged = createPrivilegedClient();

  return loadAdministrationUsers({
    async listUsers(input) {
      const result = await privileged.auth.admin.listUsers(input);
      if (result.error) throw new Error("Não foi possível consultar os usuários autenticados.");
      return {
        users: result.data.users,
        total: result.data.total,
      };
    },
    async listProfiles(userIds) {
      const result = await privileged
        .schema("app")
        .from("profiles")
        .select("user_id, email, role, active")
        .in("user_id", userIds);
      if (result.error) throw new Error("Não foi possível consultar os perfis da página.");
      return (result.data ?? []) as AdministrationProfile[];
    },
  }, page);
}
