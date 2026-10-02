import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordRecoveryForm } from "@/components/auth/auth-forms";

export default function PasswordRecoveryPage() {
  return (
    <AuthShell
      eyebrow="Segurança"
      title="Recuperar senha"
      description="Informe seu e-mail. As instruções serão enviadas sem revelar se a conta existe."
    >
      <PasswordRecoveryForm />
    </AuthShell>
  );
}
