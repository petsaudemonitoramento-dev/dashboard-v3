import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow="Acesso institucional"
      title="Boas-vindas"
      description="Entre para acessar o ambiente correspondente ao seu perfil aprovado."
    >
      <SignInForm />
    </AuthShell>
  );
}
