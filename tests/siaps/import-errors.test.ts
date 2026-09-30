import { z } from "zod";
import { describe, expect, it } from "vitest";

import { AccessDeniedError } from "@/lib/auth/types";
import { importErrorResponse } from "@/lib/http/import-errors";
import { RequestBodyTooLargeError } from "@/lib/http/request-body";
import {
  readImportApiResponse,
  SIAPS_REQUEST_TOO_LARGE_MESSAGE,
  SiapsDomainValidationError,
} from "@/lib/siaps/errors";

describe("respostas HTTP da importação SIAPS", () => {
  it("usa 400 para JSON e entrada inválidos", () => {
    expect(importErrorResponse(new SyntaxError("json"))).toMatchObject({ status: 400 });
    const validationError = z.string().safeParse(1).error;
    expect(importErrorResponse(validationError)).toMatchObject({ status: 400 });
  });

  it("usa 401 quando não há autenticação", () => {
    expect(importErrorResponse(new AccessDeniedError("UNAUTHENTICATED", "x"))).toMatchObject({ status: 401 });
  });

  it("usa 403 somente para perfis não autorizados", () => {
    expect(importErrorResponse(new AccessDeniedError("FORBIDDEN", "x"))).toMatchObject({ status: 403 });
    expect(importErrorResponse(new AccessDeniedError("INACTIVE", "x"))).toMatchObject({ status: 403 });
  });

  it("usa 500 para falha interna inesperada", () => {
    expect(importErrorResponse(new Error("database unavailable"))).toEqual({
      status: 500,
      message: "Falha interna ao processar a importação.",
    });
  });

  it("usa 400 para falha de validação de domínio", () => {
    expect(importErrorResponse(new SiapsDomainValidationError("INE inválido ou duplicado."))).toEqual({
      status: 400,
      message: "INE inválido ou duplicado.",
    });
  });

  it("usa 413 e mensagem pública para corpo acima do limite", () => {
    expect(importErrorResponse(new RequestBodyTooLargeError())).toEqual({
      status: 413,
      message: SIAPS_REQUEST_TOO_LARGE_MESSAGE,
    });
  });

  it("traduz 413 não-JSON gerado pela plataforma", async () => {
    const response = new Response("FUNCTION_PAYLOAD_TOO_LARGE", {
      status: 413,
      headers: { "content-type": "text/plain" },
    });

    await expect(readImportApiResponse(response, "Falha ao publicar.")).rejects.toThrow(
      SIAPS_REQUEST_TOO_LARGE_MESSAGE,
    );
  });
});
