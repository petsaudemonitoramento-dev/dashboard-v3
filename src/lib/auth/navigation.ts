import { AccessDeniedError, type UserRole } from "./types";

const ROLE_HOME: Record<UserRole, string> = {
  admin: "/sistema/gestao",
  gestao: "/sistema/gestao",
  leitura: "/sistema/gestao",
};

export function homeForRole(role: UserRole) {
  return ROLE_HOME[role];
}

export function destinationForAccessError(error: unknown): string {
  if (!(error instanceof AccessDeniedError)) return "/erro";

  switch (error.code) {
    case "UNAUTHENTICATED":
      return "/entrar";
    case "PROFILE_MISSING":
      return "/aguardando-aprovacao?status=sem-perfil";
    case "INACTIVE":
      return "/aguardando-aprovacao?status=inativo";
    case "FORBIDDEN":
      return "/acesso-negado";
    default:
      return "/acesso-negado";
  }
}
