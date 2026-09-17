import { z } from "zod";

const email = z.email("Informe um e-mail válido.").max(254);
const password = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z
  .object({
    email,
    password,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const passwordRecoverySchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password, passwordConfirmation: z.string() })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

export const completeProfileSchema = z.object({
  fullName: z.string().trim().min(3).max(160),
  phone: z.string().trim().max(30).transform((value) => value || null),
  professionalRegistration: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null),
});

export const adminProfileUpdateSchema = z.object({
  userId: z.uuid(),
  role: z.enum(["administrador", "gestao_municipal", "profissional"]),
  approvalStatus: z.enum(["pendente", "aprovado", "rejeitado"]),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
});
