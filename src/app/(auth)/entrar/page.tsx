import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/auth-forms";

export default function SignInPage() {
  return (
    <AuthShell
      eyebrow=""
      title="Acesso ao MAE APS"
      description="Entre com sua conta autorizada para acessar o ambiente correspondente ao seu perfil."
    >
      <SignInForm />
    </AuthShell>
  );
}
