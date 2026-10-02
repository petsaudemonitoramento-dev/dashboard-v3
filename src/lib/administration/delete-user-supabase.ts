import "server-only";

import {
  deleteAdministrationUser,
  type AdministrationRole,
} from "@/lib/administration/delete-user";
import { createPrivilegedClient } from "@/lib/supabase/privileged";

export async function deleteAdministrationUserFromSupabase(
  actorUserId: string,
  targetUserId: string,
) {
  const privileged = createPrivilegedClient();

  return deleteAdministrationUser(
    {
      async getRole(userId) {
        const result = await privileged
          .schema("app")
          .from("profiles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle();

        if (result.error) throw new Error("Não foi possível verificar o perfil a excluir.");
        return (result.data?.role ?? null) as AdministrationRole | null;
      },

      async deleteUser(userId) {
        const result = await privileged.auth.admin.deleteUser(userId);
        if (result.error) throw new Error("Não foi possível excluir a conta de acesso.");
      },

      async recordDeletion({ actorUserId: actor, targetUserId: target, role }) {
        const result = await privileged
          .schema("audit")
          .from("events")
          .insert({
            actor_user_id: actor,
            event_type: "profile_deleted",
            entity_type: "auth.users",
            entity_id: target,
            metadata: { role },
          });

        if (result.error) throw new Error("Não foi possível registrar a auditoria da exclusão.");
      },
    },
    actorUserId,
    targetUserId,
  );
}
