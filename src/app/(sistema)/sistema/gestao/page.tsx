import { aggregateC3, districtLabel, type C3Fact, type TerritoryFilter } from "@/lib/analytics/c3";
import { requireManagementAccess } from "@/lib/auth/guards";
import { enforceRouteGuard } from "@/lib/auth/route-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parseTerritory(value: string | undefined): TerritoryFilter {
  if (value === "unknown") return "unknown";
  const id = Number(value);
  return value && Number.isSafeInteger(id) && id > 0 ? id : "all";
}

function parseCompetency(value: string | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

export default async function MunicipalManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ competencia?: string; territorio?: string }>;
}) {
  await enforceRouteGuard(() => requireManagementAccess());
  const params = await searchParams;
  const territory = parseTerritory(params.territorio);
  const supabase = await createClient();

  const [latest, districtsResult] = await Promise.all([
    supabase
      .schema("analytics")
      .from("c3_team_monthly")
      .select("competency")
      .eq("is_current", true)
      .order("competency", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.schema("core").from("districts").select("id, name").order("name"),
  ]);
  if (latest.error) throw new Error("Não foi possível consultar as competências C3.");

  const selectedMonth = parseCompetency(params.competencia) ?? latest.data?.competency?.slice(0, 7) ?? null;
  if (districtsResult.error) throw new Error("Não foi possível consultar os distritos.");

  const facts: C3Fact[] = [];
  if (selectedMonth) {
    // Paginação por competência: nunca limitar ao número de equipes do piloto
    // nem confiar no limite padrão de linhas da Data API.
    for (let offset = 0; ; offset += 500) {
      const page = await supabase
        .schema("analytics")
        .from("c3_team_monthly")
        .select("points_total, denominator, district_id")
        .eq("is_current", true)
        .eq("competency", `${selectedMonth}-01`)
        .order("id", { ascending: true })
        .range(offset, offset + 499);
      if (page.error) throw new Error("Não foi possível consultar os fatos C3.");
      for (const row of page.data ?? []) {
        facts.push({
          pointsTotal: Number(row.points_total),
          denominator: row.denominator,
          districtId: row.district_id,
        });
      }
      if ((page.data?.length ?? 0) < 500) break;
    }
  }

  const summary = aggregateC3(facts, territory);
  const c3 = summary.c3 === null ? "Não disponível" : summary.c3.toFixed(2).replace(".", ",");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <span className="text-xs font-bold uppercase tracking-widest text-[#0d4d80]">Gestão Municipal</span>
      <h1 className="mt-3 text-3xl font-semibold text-[#071d35]">C3 · visão municipal</h1>
      <p className="mt-4 text-slate-600">
        Todas as equipes publicadas participam da visão municipal. O piloto é somente uma coorte analítica.
      </p>
      <form className="mt-6 flex flex-wrap items-end gap-4" method="get">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Competência
          <input className="rounded-lg border border-slate-300 p-2" defaultValue={selectedMonth ?? ""} name="competencia" type="month" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Território
          <select className="rounded-lg border border-slate-300 p-2" defaultValue={String(territory)} name="territorio">
            <option value="all">Município inteiro</option>
            <option value="unknown">Não informado</option>
            {(districtsResult.data ?? []).map((district) => (
              <option key={district.id} value={district.id}>{districtLabel(district.name)}</option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-[#0d4d80] px-5 py-2 font-semibold text-white" type="submit">Aplicar filtro</button>
      </form>
      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-5"><dt>Equipes</dt><dd className="text-3xl font-bold">{summary.teams}</dd></div>
        <div className="rounded-xl bg-slate-50 p-5"><dt>Denominador</dt><dd className="text-3xl font-bold">{summary.denominator.toLocaleString("pt-BR")}</dd></div>
        <div className="rounded-xl bg-slate-50 p-5"><dt>C3</dt><dd className="text-3xl font-bold">{c3}</dd></div>
      </dl>
      <p className="mt-4 text-sm text-slate-500">C3 = soma dos pontos ÷ soma dos denominadores; nunca média dos percentuais por equipe.</p>
    </section>
  );
}
