import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Novo acesso"
      title="Criar conta"
      description="Profissionais da APS e integrantes da Gestão Municipal podem criar uma conta e solicitar o perfil correspondente. Todo acesso depende de aprovação administrativa."
    >
      <SignUpForm />
    </AuthShell>
  );
}
