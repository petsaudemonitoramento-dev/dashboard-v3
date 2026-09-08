import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/auth-forms";

export default function SignUpPage() {
  return (
    <AuthShell
      eyebrow="Novo acesso"
      title="Criar conta"
      description="O cadastro público solicita somente o perfil Profissional e depende de aprovação administrativa."
    >
      <SignUpForm />
    </AuthShell>
  );
}
