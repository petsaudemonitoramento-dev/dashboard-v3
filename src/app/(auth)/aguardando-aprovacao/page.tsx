import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(auth)/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { createClient } from "@/lib/supabase/server";

const MESSAGES: Record<string, { title: string; description: string }> = {
  pendente: {
    title: "Aguardando aprovação",
    description:
      "Seu cadastro foi recebido e precisa ser aprovado por um administrador.",
  },
  rejeitado: {
    title: "Cadastro não aprovado",
    description:
      "Seu pedido de acesso foi rejeitado. Procure a administração técnica.",
  },
  bloqueado: {
    title: "Acesso bloqueado",
    description: "Seu perfil está bloqueado. Procure a administração técnica.",
  },
  inativo: {
    title: "Perfil inativo",
    description: "Seu perfil está inativo e não pode acessar o sistema.",
  },
  removido: {
    title: "Perfil removido",
    description: "Este perfil não está mais disponível.",
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

  const status = (await searchParams).status ?? "pendente";
  const content = MESSAGES[status] ?? MESSAGES.pendente;
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
