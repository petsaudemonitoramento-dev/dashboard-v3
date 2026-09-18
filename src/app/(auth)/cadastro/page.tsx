import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Novo acesso"
      title="Criar conta"
      description="Crie sua conta de autenticação. O acesso à Gestão é liberado separadamente pela administração institucional."
    >
      <SignUpForm />
    </AuthShell>
  );
}
