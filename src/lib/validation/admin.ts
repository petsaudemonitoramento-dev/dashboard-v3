import { z } from "zod";

import { USER_ROLES } from "@/lib/auth/types";

/**
 * Ações administrativas aceitas. A lista é fechada aqui e revalidada no banco
 * por `security.admin_apply_profile_action`: a interface nunca é a autoridade.
 */
export const ADMIN_ACTIONS = [
  "aprovar",
  "rejeitar",
  "ativar",
  "inativar",
  "bloquear",
  "desbloquear",
  "definir_papel",
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const adminActionSchema = z
  .object({
    userId: z.uuid(),
    action: z.enum(ADMIN_ACTIONS),
    role: z.enum(USER_ROLES).optional(),
  })
  .refine((data) => data.action !== "definir_papel" || data.role !== undefined, {
    message: "Informe o papel ao redefinir o perfil.",
    path: ["role"],
  });

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  aprovar: "Aprovar",
  rejeitar: "Rejeitar",
  ativar: "Ativar",
  inativar: "Inativar",
  bloquear: "Bloquear",
  desbloquear: "Desbloquear",
  definir_papel: "Definir papel",
};
