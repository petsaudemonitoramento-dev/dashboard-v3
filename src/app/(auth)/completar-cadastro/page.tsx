import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { CompleteProfileForm } from "@/components/auth/auth-forms";
import { createClient } from "@/lib/supabase/server";

export default async function CompleteProfilePage() {
  const supabase = await createClient();
  const result = await supabase.auth.getUser();
  if (!result.data.user) {
    redirect("/entrar");
  }

  return (
    <AuthShell
      eyebrow="Solicitação de acesso"
      title="Complete seu cadastro"
      description="Informe seus dados e escolha o tipo de acesso solicitado. O perfil será revisado antes da liberação."
    >
      <CompleteProfileForm />
    </AuthShell>
  );
}
