import { describe, expect, it } from "vitest";

import {
  availableActions,
  situationOf,
  type AdminProfileRow,
} from "@/lib/admin/status";
import { adminActionSchema } from "@/lib/validation/admin";

function row(overrides: Partial<AdminProfileRow> = {}): AdminProfileRow {
  return {
    user_id: "7f1d0e2a-1111-4222-8333-444455556666",
    email: "pessoa@exemplo.br",
    full_name: "Pessoa Teste",
    role: "profissional",
    requested_role: null,
    approval_status: "aprovado",
    is_active: true,
    completed_at: "2026-09-01T10:00:00Z",
    blocked_at: null,
    created_at: "2026-09-01T09:00:00Z",
    ...overrides,
  };
}

describe("situação efetiva do perfil", () => {
  it("classifica o perfil plenamente liberado como ativo", () => {
    expect(situationOf(row())).toBe("ativo");
  });

  // A precedência precisa acompanhar `evaluateActiveProfile`, senão a tela
  // mostraria "ativo" para quem o guard do servidor recusa.
  it.each([
    ["bloqueado", row({ blocked_at: "2026-09-02T10:00:00Z", is_active: false })],
    ["inativo", row({ is_active: false })],
    ["incompleto", row({ completed_at: null })],
    ["rejeitado", row({ approval_status: "rejeitado" })],
    ["pendente", row({ approval_status: "pendente" })],
  ])("classifica %s", (esperado, candidato) => {
    expect(situationOf(candidato)).toBe(esperado);
  });

  it("bloqueio tem precedência sobre aprovação", () => {
    expect(
      situationOf(
        row({
          approval_status: "aprovado",
          blocked_at: "2026-09-02T10:00:00Z",
          is_active: false,
        }),
      ),
    ).toBe("bloqueado");
  });
});

describe("ações oferecidas por situação", () => {
  it("perfil pendente pode ser aprovado ou rejeitado", () => {
    expect(availableActions("pendente")).toEqual(["aprovar", "rejeitar"]);
  });

  it("perfil bloqueado só oferece desbloqueio", () => {
    expect(availableActions("bloqueado")).toEqual(["desbloquear"]);
  });

  it("toda situação tem ao menos uma ação", () => {
    for (const s of [
      "ativo",
      "pendente",
      "rejeitado",
      "bloqueado",
      "inativo",
      "incompleto",
    ] as const) {
      expect(availableActions(s).length).toBeGreaterThan(0);
    }
  });
});

describe("validação da ação administrativa", () => {
  const userId = "7f1d0e2a-1111-4222-8333-444455556666";

  it("aceita ação simples sem papel", () => {
    expect(
      adminActionSchema.safeParse({ userId, action: "aprovar" }).success,
    ).toBe(true);
  });

  it("exige papel ao redefinir o perfil", () => {
    expect(
      adminActionSchema.safeParse({ userId, action: "definir_papel" }).success,
    ).toBe(false);
    expect(
      adminActionSchema.safeParse({
        userId,
        action: "definir_papel",
        role: "gestao_municipal",
      }).success,
    ).toBe(true);
  });

  // Os papéis legados da V2 não podem voltar por uma requisição forjada.
  it.each(["acs", "aluno", "equipe_ubs", "gestao_distrital"])(
    "recusa papel legado: %s",
    (role) => {
      expect(
        adminActionSchema.safeParse({ userId, action: "definir_papel", role })
          .success,
      ).toBe(false);
    },
  );

  it("recusa ação desconhecida", () => {
    expect(
      adminActionSchema.safeParse({ userId, action: "promover_a_deus" }).success,
    ).toBe(false);
  });
});
