import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

import {
  AccessDeniedError,
  type ActiveProfileContext,
  type AuthenticatedUser,
  type Profile,
  type UserRole,
} from "./types";

const profileRowSchema = z.object({
  user_id: z.uuid(),
  email: z.email(),
  role: z.enum(["admin", "gestao", "leitura"]),
  active: z.boolean(),
});

export interface ProfileGateway {
  getAuthenticatedUser(): Promise<AuthenticatedUser | null>;
  getProfile(userId: string): Promise<Profile | null>;
}

async function createSupabaseProfileGateway(): Promise<ProfileGateway> {
  const supabase = await createClient();

  return {
    async getAuthenticatedUser() {
      const result = await supabase.auth.getUser();
      const user = result.data.user;
      return user ? { id: user.id, email: user.email ?? null } : null;
    },
    async getProfile(userId) {
      const result = await supabase
        .schema("app")
        .from("profiles")
        .select("user_id, email, role, active")
        .eq("user_id", userId)
        .maybeSingle();

      if (result.error) {
        throw new Error("Não foi possível consultar o perfil da Gestão.");
      }
      if (!result.data) return null;

      const row = profileRowSchema.parse(result.data);
      return {
        userId: row.user_id,
        email: row.email,
        role: row.role,
        isActive: row.active,
      };
    },
  };
}

export function evaluateActiveProfile(
  user: AuthenticatedUser | null,
  profile: Profile | null,
): ActiveProfileContext {
  if (!user) {
    throw new AccessDeniedError("UNAUTHENTICATED", "Sessão inválida.");
  }
  if (!profile) {
    throw new AccessDeniedError("PROFILE_MISSING", "Acesso ainda não provisionado.");
  }
  if (!profile.isActive) {
    throw new AccessDeniedError("INACTIVE", "Perfil inativo.");
  }
  return { user, profile };
}

export async function getActiveProfileContext(
  gateway?: ProfileGateway,
): Promise<ActiveProfileContext> {
  const resolvedGateway = gateway ?? (await createSupabaseProfileGateway());
  const user = await resolvedGateway.getAuthenticatedUser();
  const profile = user ? await resolvedGateway.getProfile(user.id) : null;
  return evaluateActiveProfile(user, profile);
}

export function requireRoleFromContext(
  context: ActiveProfileContext,
  role: UserRole,
): ActiveProfileContext {
  if (context.profile.role !== role) {
    throw new AccessDeniedError("FORBIDDEN", "Perfil sem permissão para esta área.");
  }
  return context;
}

export function requireAnyRoleFromContext(
  context: ActiveProfileContext,
  roles: readonly UserRole[],
): ActiveProfileContext {
  if (!roles.includes(context.profile.role)) {
    throw new AccessDeniedError("FORBIDDEN", "Perfil sem permissão para esta operação.");
  }
  return context;
}

export async function requireAdministrator(gateway?: ProfileGateway) {
  return requireRoleFromContext(await getActiveProfileContext(gateway), "admin");
}

export function requireManagementAccess(gateway?: ProfileGateway) {
  return getActiveProfileContext(gateway);
}

export async function requireDashboardAccess(gateway?: ProfileGateway) {
  return requireAnyRoleFromContext(
    await getActiveProfileContext(gateway),
    ["gestao", "leitura"],
  );
}

export async function requireDataManager(gateway?: ProfileGateway) {
  return requireRoleFromContext(await getActiveProfileContext(gateway), "gestao");
}

export async function requireTerritoryAdministrator(gateway?: ProfileGateway) {
  return requireRoleFromContext(await getActiveProfileContext(gateway), "admin");
}
