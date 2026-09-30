import { describe, expect, it, vi } from "vitest";

import {
  loadAdministrationUsers,
  type AdministrationUserSource,
} from "@/lib/administration/users";

const USERS = [
  { id: "user-1", email: "um@maeaps.test", created_at: "2026-01-01T00:00:00Z" },
  { id: "user-2", email: "dois@maeaps.test", created_at: "2026-01-02T00:00:00Z" },
];

function source(overrides: Partial<AdministrationUserSource> = {}): AdministrationUserSource {
  return {
    listUsers: vi.fn().mockResolvedValue({ users: USERS, total: 51 }),
    listProfiles: vi.fn().mockResolvedValue([
      { user_id: "user-1", email: "um@maeaps.test", role: "admin", active: true },
    ]),
    ...overrides,
  };
}

describe("carregamento paginado de usuários", () => {
  it("limita Auth e perfis aos usuários da página atual", async () => {
    const dataSource = source();
    const result = await loadAdministrationUsers(dataSource, 1);

    expect(dataSource.listUsers).toHaveBeenCalledWith({ page: 1, perPage: 50 });
    expect(dataSource.listProfiles).toHaveBeenCalledWith(["user-1", "user-2"]);
    expect(result).toMatchObject({ currentPage: 1, lastPage: 2, total: 51 });
    expect(result.rows[0].profile?.role).toBe("admin");
    expect(result.rows[1].profile).toBeNull();
  });

  it("não consulta perfis quando a página está vazia", async () => {
    const dataSource = source({
      listUsers: vi.fn().mockResolvedValue({ users: [], total: 0 }),
    });

    const result = await loadAdministrationUsers(dataSource, 1);

    expect(dataSource.listProfiles).not.toHaveBeenCalled();
    expect(result).toMatchObject({ lastPage: 1, rows: [], total: 0 });
  });

  it("normaliza uma página acima da última sem consultar perfis", async () => {
    const dataSource = source({
      listUsers: vi.fn().mockResolvedValue({ users: [], total: 51 }),
    });

    const result = await loadAdministrationUsers(dataSource, 9);

    expect(result.redirectPage).toBe(2);
    expect(dataSource.listProfiles).not.toHaveBeenCalled();
  });

  it("recusa total ausente ou inválido", async () => {
    const dataSource = source({
      listUsers: vi.fn().mockResolvedValue({ users: [], total: Number.NaN }),
    });

    await expect(loadAdministrationUsers(dataSource, 1)).rejects.toThrow(
      "A contagem de usuários retornada é inválida.",
    );
  });
});
