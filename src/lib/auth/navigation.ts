import { AccessDeniedError, type UserRole } from "./types";

const ROLE_HOME: Record<UserRole, string> = {
  administrador: "/sistema/administracao",
  gestao_municipal: "/sistema/gestao",
  profissional: "/sistema/profissional",
};

export function homeForRole(role: UserRole) {
  return ROLE_HOME[role];
}

/** Destino usado quando o motivo da negativa não é reconhecido. */
const FALLBACK_DESTINATION = "/acesso-negado";

export function destinationForAccessError(error: unknown): string {
  if (!(error instanceof AccessDeniedError)) {
    return "/erro";
  }

  switch (error.code) {
    case "UNAUTHENTICATED":
      return "/entrar";
    case "PROFILE_INCOMPLETE":
    case "PROFILE_MISSING":
      return "/completar-cadastro";
    case "PENDING_APPROVAL":
      return "/aguardando-aprovacao?status=pendente";
    case "REJECTED":
      return "/aguardando-aprovacao?status=rejeitado";
    case "BLOCKED":
      return "/aguardando-aprovacao?status=bloqueado";
    case "INACTIVE":
      return "/aguardando-aprovacao?status=inativo";
    case "DELETED":
      return "/aguardando-aprovacao?status=removido";
    case "FORBIDDEN":
      return "/acesso-negado";
    // Um código novo de AccessDeniedError não pode fazer a rota retornar
    // `undefined` e derrubar o redirect: nega por padrão.
    default:
      return FALLBACK_DESTINATION;
  }
}
