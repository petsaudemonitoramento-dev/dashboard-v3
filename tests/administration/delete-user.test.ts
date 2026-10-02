import { describe, expect, it, vi } from "vitest";

import {
  deleteAdministrationUser,
  type AdministrationDeletionGateway,
} from "@/lib/administration/delete-user";

function gateway(
  role: "admin" | "gestao" | "leitura" | null,
): AdministrationDeletionGateway {
  return {
    getRole: vi.fn().mockResolvedValue(role),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    recordDeletion: vi.fn().mockResolvedValue(undefined),
  };
}

describe("exclusão administrativa de perfis", () => {
  it("bloqueia exclusão de administrador", async () => {
    const target = gateway("admin");
    await expect(deleteAdministrationUser(target, "actor-id", "admin-id"))
      .resolves.toBe("admin_protected");
    expect(target.deleteUser).not.toHaveBeenCalled();
  });

  it("exclui perfil não administrativo e registra auditoria", async () => {
    const target = gateway("gestao");
    await expect(deleteAdministrationUser(target, "actor-id", "gestao-id"))
      .resolves.toBe("deleted");
    expect(target.deleteUser).toHaveBeenCalledWith("gestao-id");
    expect(target.recordDeletion).toHaveBeenCalledWith({
      actorUserId: "actor-id",
      targetUserId: "gestao-id",
      role: "gestao",
    });
  });

  it("permite limpar conta autenticada ainda sem perfil provisionado", async () => {
    const target = gateway(null);
    await expect(deleteAdministrationUser(target, "actor-id", "pending-id"))
      .resolves.toBe("deleted");
    expect(target.deleteUser).toHaveBeenCalledWith("pending-id");
  });
});
