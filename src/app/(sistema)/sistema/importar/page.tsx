import { ImportWizard } from "@/components/siaps/import-wizard";
import { requireDataManager } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await enforceRouteGuard(() => requireDataManager());
  const supabase = await createClient();
  const history = await supabase.schema("siaps").from("imports").select("id, filename, competency, status, rows_total, uploaded_at").order("uploaded_at", { ascending: false }).limit(12);
  if (history.error) throw new Error("Não foi possível consultar o histórico de importações.");
  return <div className="space-y-6"><section className="hero-panel"><div><span className="eyebrow">SIAPS</span><h1>Importar dados</h1><p>Valide e publique planilhas oficiais C3 com rastreabilidade e prevenção de duplicidade.</p></div></section><ImportWizard/><section className="panel"><div className="panel-heading"><span className="eyebrow">Rastreabilidade</span><h2>Histórico recente</h2></div><div className="table-scroll"><table className="data-table"><thead><tr><th>Arquivo</th><th>Competência</th><th>Registros</th><th>Status</th><th>Recebido em</th></tr></thead><tbody>{(history.data ?? []).map((item) => <tr key={item.id}><td>{item.filename}</td><td>{new Date(`${item.competency}T00:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })}</td><td>{item.rows_total}</td><td><span className="badge">{item.status}</span></td><td>{new Date(item.uploaded_at).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div></section></div>;
}
