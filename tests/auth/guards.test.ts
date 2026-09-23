import { describe, expect, it } from "vitest";

import {
  evaluateActiveProfile,
  requireAdministrator,
  requireDashboardAccess,
  requireDataManager,
  requireManagementAccess,
  requireTerritoryAdministrator,
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
    email: user.email!,
    role: "leitura",
    isActive: true,
    ...overrides,
  };
}

function gateway(role: UserRole, isActive = true): ProfileGateway {
  return {
    getAuthenticatedUser: async () => user,
    getProfile: async () => profile({ role, isActive }),
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

describe("perfil app.profiles", () => {
  it("bloqueia usuário não autenticado", () => {
    expectCode(() => evaluateActiveProfile(null, null), "UNAUTHENTICATED");
  });

  it("bloqueia perfil ainda não provisionado", () => {
    expectCode(() => evaluateActiveProfile(user, null), "PROFILE_MISSING");
  });

  it("bloqueia perfil inativo", () => {
    expectCode(() => evaluateActiveProfile(user, profile({ isActive: false })), "INACTIVE");
  });

  it("aceita cada papel ativo do MAE APS", () => {
    for (const role of ["admin", "gestao", "leitura"] as const) {
      expect(evaluateActiveProfile(user, profile({ role })).profile.role).toBe(role);
    }
  });
});

describe("guards server-side", () => {
  it("reserva administração ao papel admin", async () => {
    await expect(requireAdministrator(gateway("admin"))).resolves.toBeTruthy();
    await expect(requireAdministrator(gateway("gestao"))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireAdministrator(gateway("leitura"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("mantém o contexto autenticado genérico para layouts internos", async () => {
    for (const role of ["admin", "gestao", "leitura"] as const) {
      await expect(requireManagementAccess(gateway(role))).resolves.toBeTruthy();
    }
  });

  it("dashboard é acessível somente por gestao e leitura", async () => {
    await expect(requireDashboardAccess(gateway("gestao"))).resolves.toBeTruthy();
    await expect(requireDashboardAccess(gateway("leitura"))).resolves.toBeTruthy();
    await expect(requireDashboardAccess(gateway("admin"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("importação SIAPS é exclusiva da gestao", async () => {
    await expect(requireDataManager(gateway("gestao"))).resolves.toBeTruthy();
    await expect(requireDataManager(gateway("admin"))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireDataManager(gateway("leitura"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("território é exclusivo do administrador", async () => {
    await expect(requireTerritoryAdministrator(gateway("admin"))).resolves.toBeTruthy();
    await expect(requireTerritoryAdministrator(gateway("gestao"))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(requireTerritoryAdministrator(gateway("leitura"))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nunca libera perfil inativo", async () => {
    await expect(requireDashboardAccess(gateway("gestao", false))).rejects.toMatchObject({
      code: "INACTIVE",
    });
    await expect(requireTerritoryAdministrator(gateway("admin", false))).rejects.toMatchObject({
      code: "INACTIVE",
    });
  });
});
