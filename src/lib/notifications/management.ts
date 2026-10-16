import { ratioOfSums } from "@/lib/analytics/management-pages";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
export type ManagementNotice = {
  id: string;
  title: string;
  description: string;
  href: string;
  severity: "warning" | "reminder";
};

type EstablishmentRow = {
  competency: string;
  establishment_id: string;
  cnes: string;
  establishment_name: string;
  denominator: number;
  points_total: number | string;
};

/** Informações territoriais somente para Gestão/Leitura; RBAC/RLS continuam no Supabase.
 * Sinalização gerencial interna: C3 <= 50, NÃO é meta oficial nem alerta clínico.
 */
export async function loadManagementNotices(
  supabase: Supabase,
  role: "gestao" | "leitura" | "admin",
  now = new Date(),
): Promise<{ notices: ManagementNotice[]; error: boolean }> {
  if (role === "admin") return { notices: [], error: false };
  const notices: ManagementNotice[] = [];
  let error = false;

  const latest = await supabase.schema("analytics").from("dashboard_c3_establishment_monthly")
    .select("competency").order("competency", { ascending: false }).limit(1);
  if (latest.error) {
    error = true;
  } else {
    const competency = latest.data?.[0]?.competency as string | undefined;
    if (competency) {
      const rows: EstablishmentRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const result = await supabase.schema("analytics").from("dashboard_c3_establishment_monthly")
          .select("competency,establishment_id,cnes,establishment_name,denominator,points_total")
          .eq("competency", competency).order("establishment_id").range(offset, offset + 499);
        if (result.error) { error = true; break; }
        const page = (result.data ?? []) as EstablishmentRow[];
        rows.push(...page);
        if (page.length < 500) break;
      }
      if (!error) {
        const groups = new Map<string, EstablishmentRow[]>();
        for (const row of rows) groups.set(row.establishment_id, [...(groups.get(row.establishment_id) ?? []), row]);
        const attention = [...groups.entries()].map(([id, group]) => {
          const score = ratioOfSums(group).c3;
          return { id, row: group[0], score };
        }).filter((item) => item.row && item.score !== null
          && Number.isFinite(item.score) && item.score >= 0 && item.score <= 50
          && ratioOfSums(groups.get(item.id)!).denominator > 0)
          .sort((a, b) => (a.score ?? 100) - (b.score ?? 100));
        for (const item of attention.slice(0, 5)) {
          const name = item.row!.establishment_name || `UBS ${item.row!.cnes}`;
          notices.push({
            id: `ubs:${competency}:${item.id}`,
            title: `${name} requer atenção gerencial`,
            description: `C3 ${item.score!.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} na competência ${competency.slice(0, 7)}. Critério visual MAE APS: até 50.`,
            href: `/sistema/gestao/ubs-equipes?busca=${encodeURIComponent(item.row!.cnes || name)}`,
            severity: "warning",
          });
        }
      }
    }
  }

  // Lembrete mensal dentro do sistema. Só Gestão pode consultar imports e realizar publicação.
  // Uma publicação registrada no próprio mês atende a periodicidade do lembrete.
  if (role === "gestao") {
    const localDateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Fortaleza", year: "numeric", month: "2-digit",
    }).formatToParts(now);
    const year = localDateParts.find((part) => part.type === "year")?.value;
    const month = localDateParts.find((part) => part.type === "month")?.value;
    if (!year || !month) return { notices, error: true };
    const yearMonth = `${year}-${month}`;
    const monthStart = `${yearMonth}-01T00:00:00-03:00`;
    const imported = await supabase.schema("siaps").from("imports")
      .select("status,uploaded_at").gte("uploaded_at", monthStart)
      .order("uploaded_at", { ascending: false }).limit(100);
    if (imported.error) {
      error = true;
    } else {
      const publishedThisMonth = (imported.data ?? []).some((row) =>
        /publicad|publish|conclu|complet/i.test(String(row.status)),
      );
      if (!publishedThisMonth) {
        notices.unshift({
          id: `siaps:${yearMonth}`,
          title: "Lembrete mensal: atualizar o SIAPS",
          description: `Não foi identificada uma importação publicada em ${yearMonth}. Confira os dados oficiais antes de enviar a planilha.`,
          href: "/sistema/importar",
          severity: "reminder",
        });
      }
    }
  }
  return { notices, error };
}
