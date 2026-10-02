import { describe, expect, it } from "vitest";

import {
  administrationActionHref,
  administrationHref,
  parseAdministrationPage,
  parseAdministrationStatus,
} from "@/lib/administration/pagination";

describe("paginação da Administração", () => {
  it.each([
    [undefined, 1, false],
    ["", 1, false],
    ["1", 1, true],
    ["2", 2, false],
    ["37", 37, false],
  ])("interpreta %j como página %i", (value, page, needsRedirect) => {
    expect(parseAdministrationPage(value)).toEqual({ page, needsRedirect });
  });

  it.each(["0", "-1", "1.5", "texto", "01", "9007199254740992", ["1", "2"], new File([], "page")])(
    "recusa página inválida %j",
    (value) => {
      expect(parseAdministrationPage(value)).toEqual({ page: 1, needsRedirect: true });
    },
  );

  it("gera URLs canônicas e preserva apenas status conhecido", () => {
    expect(administrationHref({})).toBe("/sistema/administracao");
    expect(administrationHref({ page: 2 })).toBe("/sistema/administracao?page=2");
    expect(administrationHref({ page: 2, status: "salvo" })).toBe(
      "/sistema/administracao?page=2&status=salvo",
    );
    expect(parseAdministrationStatus("erro")).toBe("erro");
    expect(parseAdministrationStatus("qualquer")).toBeUndefined();
  });

  it("normaliza a página recebida por uma action sem aceitar retorno arbitrário", () => {
    expect(administrationActionHref("3", "salvo")).toBe(
      "/sistema/administracao?page=3&status=salvo",
    );
    expect(administrationActionHref("https://exemplo.test", "erro")).toBe(
      "/sistema/administracao?status=erro",
    );
  });
});
