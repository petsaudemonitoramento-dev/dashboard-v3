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
  role: z.enum(["administrador", "gestao_municipal", "profissional"]),
  full_name: z.string().nullable(),
  phone: z.string().nullable(),
  professional_registration: z.string().nullable(),
  approval_status: z.enum(["pendente", "aprovado", "rejeitado"]),
  is_active: z.boolean(),
  completed_at: z.string().nullable(),
  blocked_at: z.string().nullable(),
  deleted_at: z.string().nullable(),
});

export interface ProfileGateway {
  getAuthenticatedUser(): Promise<AuthenticatedUser | null>;
  getProfile(userId: string): Promise<Profile | null>;
}

function mapProfileRow(row: z.infer<typeof profileRowSchema>): Profile {
  return {
    userId: row.user_id,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    professionalRegistration: row.professional_registration,
    approvalStatus: row.approval_status,
    isActive: row.is_active,
    completedAt: row.completed_at,
    blockedAt: row.blocked_at,
    deletedAt: row.deleted_at,
  };
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
        .schema("core")
        .from("profiles")
        .select(
          "user_id, role, full_name, phone, professional_registration, approval_status, is_active, completed_at, blocked_at, deleted_at",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (result.error) {
        throw new Error("Não foi possível consultar o perfil.");
      }

      return result.data
        ? mapProfileRow(profileRowSchema.parse(result.data))
        : null;
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
    throw new AccessDeniedError("PROFILE_MISSING", "Perfil não encontrado.");
  }
  if (profile.deletedAt) {
    throw new AccessDeniedError("DELETED", "Perfil removido.");
  }
  if (profile.blockedAt) {
    throw new AccessDeniedError("BLOCKED", "Perfil bloqueado.");
  }
  if (!profile.isActive) {
    throw new AccessDeniedError("INACTIVE", "Perfil inativo.");
  }
  if (!profile.completedAt) {
    throw new AccessDeniedError("PROFILE_INCOMPLETE", "Cadastro incompleto.");
  }
  if (profile.approvalStatus === "rejeitado") {
    throw new AccessDeniedError("REJECTED", "Cadastro rejeitado.");
  }
  if (profile.approvalStatus !== "aprovado") {
    throw new AccessDeniedError(
      "PENDING_APPROVAL",
      "Cadastro aguardando aprovação.",
    );
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
    throw new AccessDeniedError(
      "FORBIDDEN",
      "Perfil sem permissão para esta área.",
    );
  }
  return context;
}

async function requireRole(role: UserRole, gateway?: ProfileGateway) {
  const context = await getActiveProfileContext(gateway);
  return requireRoleFromContext(context, role);
}

export function requireAdministrator(gateway?: ProfileGateway) {
  return requireRole("administrador", gateway);
}

export function requireMunicipalManagement(gateway?: ProfileGateway) {
  return requireRole("gestao_municipal", gateway);
}

export function requireProfessional(gateway?: ProfileGateway) {
  return requireRole("profissional", gateway);
}
