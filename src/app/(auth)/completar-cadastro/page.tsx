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
      eyebrow="Perfil profissional"
      title="Complete seu cadastro"
      description="Esses dados serão revisados antes da liberação do acesso."
    >
      <CompleteProfileForm />
    </AuthShell>
  );
}
