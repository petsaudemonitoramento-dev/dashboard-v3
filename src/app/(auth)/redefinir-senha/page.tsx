import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      eyebrow="Segurança"
      title="Nova senha"
      description="Defina uma nova senha para concluir a recuperação do acesso."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
