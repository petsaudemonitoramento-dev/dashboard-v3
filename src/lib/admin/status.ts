import type {
  ApprovalStatus,
  RequestableUserRole,
  UserRole,
} from "@/lib/auth/types";

export type ProfileSituation =
  | "ativo"
  | "pendente"
  | "rejeitado"
  | "bloqueado"
  | "inativo"
  | "incompleto";

export type AdminProfileRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  requested_role: RequestableUserRole | null;
  approval_status: ApprovalStatus;
  is_active: boolean;
  completed_at: string | null;
  blocked_at: string | null;
  created_at: string;
};

export function situationOf(profile: AdminProfileRow): ProfileSituation {
  if (profile.blocked_at) return "bloqueado";
  if (!profile.is_active) return "inativo";
  if (!profile.completed_at) return "incompleto";
  if (profile.approval_status === "rejeitado") return "rejeitado";
  if (profile.approval_status !== "aprovado") return "pendente";
  return "ativo";
}

export const SITUATION_LABEL: Record<ProfileSituation, string> = {
  ativo: "Ativo",
  pendente: "Aguardando aprovação",
  rejeitado: "Rejeitado",
  bloqueado: "Bloqueado",
  inativo: "Inativo",
  incompleto: "Cadastro incompleto",
};

export const SITUATION_STYLE: Record<ProfileSituation, string> = {
  ativo: "bg-emerald-100 text-emerald-900",
  pendente: "bg-amber-100 text-amber-900",
  rejeitado: "bg-rose-100 text-rose-900",
  bloqueado: "bg-rose-200 text-rose-950",
  inativo: "bg-slate-200 text-slate-700",
  incompleto: "bg-sky-100 text-sky-900",
};

export const ROLE_LABEL: Record<UserRole, string> = {
  administrador: "Administrador",
  gestao_municipal: "Gestão Municipal",
  profissional: "Profissional",
};

export function availableActions(situation: ProfileSituation) {
  switch (situation) {
    case "pendente":
    case "incompleto":
      return ["aprovar", "rejeitar"] as const;
    case "ativo":
      return ["inativar", "bloquear", "rejeitar"] as const;
    case "inativo":
      return ["ativar", "bloquear"] as const;
    case "bloqueado":
      return ["desbloquear"] as const;
    case "rejeitado":
      return ["aprovar"] as const;
  }
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
