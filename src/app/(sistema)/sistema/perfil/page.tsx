import { UserRound } from "lucide-react";
import { ProfileNameForm } from "@/components/layout/profile-name-form";
import { getActiveProfileContext } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function MyProfilePage() {
  const { profile } = await enforceRouteGuard(() => getActiveProfileContext());
  const supabase = await createClient();
  const auth = await supabase.auth.getUser();
  const name = auth.data.user?.user_metadata?.display_name;
  const initialName = typeof name === "string" && name.length <= 80 ? name : "";
  const roleLabel = profile.role === "admin" ? "Administração" : profile.role === "gestao" ? "Gestão" : "Leitura";
  return <div className="management-module">
    <header className="module-header"><div>
      <span>Preferências da conta</span><h1>Meu perfil</h1>
      <p>Atualize os seus dados de apresentação sem alterar permissões de acesso.</p>
    </div></header>
    <section className="dashboard-card management-profile-settings" aria-label="Configurações do perfil">
      <div className="dashboard-card-heading"><div><span>Conta autorizada</span><h2><UserRound aria-hidden="true" /> Informações pessoais</h2></div></div>
      <div className="management-profile-readonly"><span>E-mail da conta</span><strong>{profile.email}</strong></div>
      <div className="management-profile-readonly"><span>Perfil autorizado</span><strong>{roleLabel}</strong></div>
      <ProfileNameForm name={initialName} />
      <p className="management-profile-hint">Por segurança, e-mail e função são administrados separadamente. Para modificar sua senha, utilize o fluxo de recuperação da tela de login.</p>
    </section>
  </div>;
}
