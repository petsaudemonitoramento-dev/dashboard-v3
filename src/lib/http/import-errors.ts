import { ZodError } from "zod";

import { AccessDeniedError } from "@/lib/auth/types";

export type ImportErrorResponse = {
  status: 400 | 401 | 403 | 500;
  message: string;
};

export function importErrorResponse(error: unknown): ImportErrorResponse {
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return { status: 400, message: "Dados de importação inválidos." };
  }
  if (error instanceof AccessDeniedError) {
    if (error.code === "UNAUTHENTICATED") {
      return { status: 401, message: "Autenticação obrigatória." };
    }
    return { status: 403, message: "Perfil sem permissão para importar." };
  }
  return { status: 500, message: "Falha interna ao processar a importação." };
}
