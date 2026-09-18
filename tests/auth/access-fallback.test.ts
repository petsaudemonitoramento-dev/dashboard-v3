import { describe, expect, it } from "vitest";

import { destinationForAccessError } from "@/lib/auth/navigation";
import { isReauthenticationRequired } from "@/lib/auth/supabase-errors";
import { AccessDeniedError } from "@/lib/auth/types";

describe("destino de negativa de acesso (B1)", () => {
  it("mapeia os motivos conhecidos", () => {
    expect(destinationForAccessError(new AccessDeniedError("UNAUTHENTICATED", "x"))).toBe(
      "/entrar",
    );
    expect(destinationForAccessError(new AccessDeniedError("FORBIDDEN", "x"))).toBe(
      "/acesso-negado",
    );
    expect(destinationForAccessError(new AccessDeniedError("BLOCKED", "x"))).toBe(
      "/aguardando-aprovacao?status=bloqueado",
    );
  });

  it("erro fora do domínio de acesso vai para /erro", () => {
    expect(destinationForAccessError(new Error("falha qualquer"))).toBe("/erro");
  });

  // Um código novo não pode fazer a função retornar `undefined` — isso
  // derrubaria `redirect()` com 500 em vez de negar o acesso.
  it("nega por padrão diante de um código desconhecido", () => {
    const desconhecido = new AccessDeniedError(
      "CODIGO_FUTURO" as never,
      "motivo ainda não mapeado",
    );
    expect(destinationForAccessError(desconhecido)).toBe("/acesso-negado");
    expect(typeof destinationForAccessError(desconhecido)).toBe("string");
  });
});

describe("reautenticação exigida na troca de senha (A2)", () => {
  it("reconhece pelo código do Supabase", () => {
    expect(
      isReauthenticationRequired({ code: "reauthentication_needed", message: null }),
    ).toBe(true);
  });

  it("reconhece pela mensagem como resguardo", () => {
    expect(
      isReauthenticationRequired({ code: null, message: "Reauthentication required" }),
    ).toBe(true);
  });

  it("não confunde com outros erros de autenticação", () => {
    expect(
      isReauthenticationRequired({ code: "weak_password", message: "Password is weak" }),
    ).toBe(false);
    expect(isReauthenticationRequired(null)).toBe(false);
  });
});
