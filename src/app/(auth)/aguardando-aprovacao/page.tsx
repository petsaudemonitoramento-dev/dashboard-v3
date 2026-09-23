import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

const MESSAGES: Record<string, { title: string; description: string }> = {
  "sem-perfil": {
    title: "Aguardando liberação",
    description:
      "Sua conta de autenticação existe, mas o acesso à Gestão ainda não foi provisionado.",
  },
  inativo: {
    title: "Perfil inativo",
    description: "Seu perfil de Gestão está inativo. Procure a administração técnica.",
  },
};

export default async function WaitingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const result = await supabase.auth.getUser();
  if (!result.data.user) {
    redirect("/entrar");
  }

  const status = (await searchParams).status ?? "sem-perfil";
  const content = MESSAGES[status] ?? MESSAGES["sem-perfil"];
  return (
    <AuthShell
      eyebrow="Situação do acesso"
      title={content.title}
      description={content.description}
    >
      <form action={signOutAction}>
        <button
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white px-5 font-bold text-slate-800"
          type="submit"
        >
          Sair com segurança
        </button>
      </form>
    </AuthShell>
  );
}
