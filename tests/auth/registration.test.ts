import { describe, expect, it } from "vitest";

import { describeSignUpError } from "@/lib/auth/supabase-errors";
import { completeProfileSchema } from "@/lib/validation/auth";

describe("cadastro público", () => {
  it("não permite solicitação de profissional neste software", () => {
    expect(
      completeProfileSchema.safeParse({
        fullName: "Pessoa Profissional",
        phone: "",
        professionalRegistration: "",
        requestedRole: "profissional",
      }).success,
    ).toBe(false);
  });

  it("aceita solicitação de gestão municipal", () => {
    expect(
      completeProfileSchema.safeParse({
        fullName: "Pessoa Gestora",
        phone: "",
        professionalRegistration: "",
        requestedRole: "gestao_municipal",
      }).success,
    ).toBe(true);
  });

  it("não permite solicitar administrador", () => {
    expect(
      completeProfileSchema.safeParse({
        fullName: "Pessoa Admin",
        phone: "",
        professionalRegistration: "",
        requestedRole: "administrador",
      }).success,
    ).toBe(false);
  });
});

describe("mensagens de cadastro do Supabase", () => {
  it("explica endereço inválido", () => {
    expect(describeSignUpError({ code: "email_address_invalid" })).toContain(
      "e-mail válido",
    );
  });

  it("explica limite temporário de e-mail e oferece Google", () => {
    expect(describeSignUpError({ code: "over_email_send_rate_limit" })).toContain(
      "Google",
    );
  });

  it("mantém erro desconhecido genérico", () => {
    expect(describeSignUpError({ code: "unexpected" })).not.toContain("unexpected");
  });
});
