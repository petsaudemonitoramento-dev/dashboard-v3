import { describe, expect, it } from "vitest";

import {
  evaluateActiveProfile,
  requireAdministrator,
  requireMunicipalManagement,
  requireProfessional,
  type ProfileGateway,
} from "@/lib/auth/guards";
import {
  AccessDeniedError,
  type AuthenticatedUser,
  type Profile,
  type UserRole,
} from "@/lib/auth/types";

const user: AuthenticatedUser = {
  id: "c799c75e-70cf-44c1-b0cf-d3f5dd5421d2",
  email: "teste@example.com",
};

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    userId: user.id,
    role: "profissional",
    fullName: "Pessoa Teste",
    phone: null,
    professionalRegistration: null,
    approvalStatus: "aprovado",
    isActive: true,
    completedAt: "2026-09-08T12:00:00Z",
    blockedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function gateway(role: UserRole): ProfileGateway {
  return {
    getAuthenticatedUser: async () => user,
    getProfile: async () => profile({ role }),
  };
}

function expectCode(run: () => unknown, code: string) {
  try {
    run();
    throw new Error("Era esperado bloqueio de acesso.");
  } catch (error) {
    expect(error).toBeInstanceOf(AccessDeniedError);
    expect((error as AccessDeniedError).code).toBe(code);
  }
}

describe("condição de perfil ativo", () => {
  it("bloqueia usuário não autenticado", () => {
    expectCode(() => evaluateActiveProfile(null, null), "UNAUTHENTICATED");
  });

  it("bloqueia perfil ausente", () => {
    expectCode(() => evaluateActiveProfile(user, null), "PROFILE_MISSING");
  });

  it.each([
    ["cadastro incompleto", profile({ completedAt: null }), "PROFILE_INCOMPLETE"],
    ["aprovação pendente", profile({ approvalStatus: "pendente" }), "PENDING_APPROVAL"],
    ["cadastro rejeitado", profile({ approvalStatus: "rejeitado" }), "REJECTED"],
    ["perfil inativo", profile({ isActive: false }), "INACTIVE"],
    ["perfil bloqueado", profile({ blockedAt: "2026-09-08T12:00:00Z" }), "BLOCKED"],
    ["perfil removido", profile({ deletedAt: "2026-09-08T12:00:00Z" }), "DELETED"],
  ])("bloqueia %s", (_label, candidate, code) => {
    expectCode(
      () => evaluateActiveProfile(user, candidate as Profile),
      code as string,
    );
  });

  it("aceita somente perfil completo, aprovado e ativo", () => {
    expect(evaluateActiveProfile(user, profile())).toEqual({
      user,
      profile: profile(),
    });
  });
});

describe("guards server-side por papel", () => {
  it("permite administrador apenas no guard administrativo", async () => {
    await expect(requireAdministrator(gateway("administrador"))).resolves.toBeTruthy();
    await expect(requireProfessional(gateway("administrador"))).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("impede Profissional de acessar Gestão", async () => {
    await expect(
      requireMunicipalManagement(gateway("profissional")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("impede Gestão de acessar Profissional", async () => {
    await expect(
      requireProfessional(gateway("gestao_municipal")),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("permite cada perfil aprovado somente no próprio guard", async () => {
    await expect(
      requireMunicipalManagement(gateway("gestao_municipal")),
    ).resolves.toBeTruthy();
    await expect(requireProfessional(gateway("profissional"))).resolves.toBeTruthy();
  });
});
