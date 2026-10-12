"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, ShieldCheck, UploadCloud } from "lucide-react";

import { compactSiapsRow, parseSiapsWorkbook, sha256Hex, type SiapsParseResult } from "@/lib/siaps/parser";
import { readImportApiResponse, SIAPS_REQUEST_TOO_LARGE_MESSAGE, SIAPS_XLSX_TOO_LARGE_MESSAGE } from "@/lib/siaps/errors";
import { MAX_SIAPS_REQUEST_BYTES, MAX_SIAPS_XLSX_BYTES, utf8ByteLength } from "@/lib/siaps/limits";

type Preflight = {
  previewId: string | null;
  new: number;
  identical: number;
  conflicts: number;
  unauthorized: number;
  details: { fileRow: number; ine: string; cnes: string; status: string }[];
};
type CheckResponse = {
  preview: Preflight;
  duplicate?: { filename: string; status: string; rows_total: number } | null;
};
type PublishResponse = { status: "publicado" | "sem_alteracoes"; added: number; unchanged: number };

function serialize(payload: unknown) {
  const json = JSON.stringify(payload);
  if (utf8ByteLength(json) > MAX_SIAPS_REQUEST_BYTES) throw new Error(SIAPS_REQUEST_TOO_LARGE_MESSAGE);
  return json;
}
async function post<T>(payload: unknown): Promise<T> {
  const response = await fetch("/api/importacoes", {
    method: "POST", headers: { "content-type": "application/json" }, body: serialize(payload),
  });
  return readImportApiResponse<T>(response, "Não foi possível conciliar a importação.");
}
const MONTH = /^20\d{2}-(0[1-9]|1[0-2])-01$/;

export function ImportWizard() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [hash, setHash] = useState("");
  const [parsed, setParsed] = useState<SiapsParseResult | null>(null);
  const [competency, setCompetency] = useState("");
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [duplicate, setDuplicate] = useState<CheckResponse["duplicate"]>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);

  function payload(mode: "check" | "publish", previewId?: string) {
    if (!parsed?.rows.length || !MONTH.test(competency)) throw new Error("Selecione um arquivo válido e informe a competência.");
    return {
      mode, filename, fileSha256: hash, competency,
      rows: parsed.rows.map(compactSiapsRow),
      ...(previewId ? { previewId } : {}),
    };
  }

  async function selectFile(file?: File) {
    if (!file) return;
    setBusy(true); setResult(null); setPreflight(null); setDuplicate(null); setParsed(null);
    setFilename(file.name); setHash(""); setCompetency("");
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Selecione um arquivo com extensão .xlsx.");
      if (file.type && file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") throw new Error("Tipo incompatível com XLSX.");
      if (!file.size) throw new Error("O arquivo está vazio.");
      if (file.size > MAX_SIAPS_XLSX_BYTES) throw new Error(SIAPS_XLSX_TOO_LARGE_MESSAGE);
      const buffer = await file.arrayBuffer();
      const [data, sha] = await Promise.all([
        Promise.resolve(parseSiapsWorkbook(buffer, file.name)), sha256Hex(buffer),
      ]);
      if (!data.errors.length) {
        const chosen = data.competency ?? "2000-01-01";
        serialize({ mode: "check", filename: file.name, fileSha256: sha,
          competency: chosen, rows: data.rows.map(compactSiapsRow) });
      }
      setParsed(data); setHash(sha); setCompetency(data.competency ?? "");
    } catch (error) {
      setParsed({
        competency: null, rows: [], errors: [error instanceof Error ? error.message : "Falha ao ler o arquivo."],
        warnings: [], headerRow: null,
      });
    } finally { setBusy(false); }
  }

  async function analyze() {
    setBusy(true); setResult(null); setPreflight(null); setDuplicate(null);
    try {
      const response = await post<CheckResponse>(payload("check"));
      setPreflight(response.preview); setDuplicate(response.duplicate ?? null);
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : "Falha na análise.", ok: false });
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!preflight?.previewId || preflight.conflicts || preflight.unauthorized || busy) return;
    setBusy(true); setResult(null);
    try {
      const response = await post<PublishResponse>(payload("publish", preflight.previewId));
      setResult({
        message: response.status === "sem_alteracoes"
          ? `Verificação concluída: ${response.unchanged} registros já estavam corretos. Nenhum dado foi alterado.`
          : `Conciliação publicada: ${response.added} novas equipes e ${response.unchanged} já existentes preservadas.`,
        ok: true,
      });
      setPreflight(null); // tokens de publicação são de uso único
      router.refresh();
    } catch (error) {
      setPreflight(null); // obriga reanálise após erro ou concorrência
      setResult({ message: error instanceof Error ? error.message : "Falha na publicação.", ok: false });
    } finally { setBusy(false); }
  }

  const canAnalyze = Boolean(parsed?.rows.length && !parsed?.errors.length && MONTH.test(competency) && !busy);
  const canPublish = Boolean(preflight?.previewId && !preflight.conflicts && !preflight.unauthorized && !busy);
  const count = parsed?.rows.length ?? 0;

  return <section className="panel space-y-5" aria-busy={busy}>
    <div className="panel-heading">
      <span className="eyebrow">Importador Inteligente V2</span>
      <h2>Conciliação segura de equipes C3</h2>
      <p>Reconheça a estrutura e compare cada INE antes de publicar. Importações parciais não substituem a competência inteira.</p>
    </div>
    <span className="sr-only" aria-live="polite">{busy ? "Analisando arquivo." : "Pronto para interação."}</span>

    <label className="upload-dropzone flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center">
      {busy ? <LoaderCircle aria-hidden="true" className="mb-3 size-9 animate-spin" /> : <UploadCloud aria-hidden="true" className="mb-3 size-9" />}
      <strong>Selecione a planilha XLSX do SIAPS</strong>
      <span className="mt-1 text-sm text-slate-500">Nenhum dado é gravado durante a leitura local ou a análise.</span>
      <input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={e => void selectFile(e.target.files?.[0])}/>
    </label>

    {parsed && <>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="metric-card">
          <FileSpreadsheet className="size-5" aria-hidden="true"/><span>Arquivo / aba</span>
          <strong className="text-sm! break-all">{filename}</strong>
          <small>{parsed.sheetName ?? "Aba não identificada"}</small>
        </div>
        <div className="metric-card">
          <label htmlFor="siaps-competency">Competência</label>
          <input id="siaps-competency" className="field mt-2 w-full" type="date" value={competency}
            onChange={event => {
              setCompetency(event.target.value ? `${event.target.value.slice(0,7)}-01` : "");
              setPreflight(null); setDuplicate(null); setResult(null);
            }} />
          <small>Mês e ano do relatório.</small>
        </div>
        <div className="metric-card accent-green"><span>Registros lidos</span><strong>{count}</strong></div>
        <div className="metric-card accent-orange"><span>Verificações</span>
          <strong>{parsed.errors.length + parsed.warnings.length}</strong>
          <small>{parsed.errors.length} erros · {parsed.warnings.length} avisos</small>
        </div>
      </div>
      {!!parsed.errors.length && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        <strong>Erros que impedem a importação</strong>
        <ul className="mt-2 list-disc pl-5">{parsed.errors.slice(0,20).map((item,i)=><li key={i}>{item}</li>)}</ul>
      </div>}
      {!!parsed.warnings.length && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <strong>Alterações de estrutura e advertências</strong>
        <ul className="mt-2 list-disc pl-5">{parsed.warnings.slice(0,20).map((item,i)=><li key={i}>{item}</li>)}</ul>
      </div>}
      {!!count && <div role="region" tabIndex={0} className="table-scroll" aria-label="Amostra de equipes da planilha">
        <table className="data-table"><caption className="sr-only">Primeiras oito equipes</caption>
          <thead><tr><th scope="col">INE</th><th scope="col">CNES</th><th scope="col">Equipe</th><th scope="col">Denominador</th><th scope="col">Pontos</th></tr></thead>
          <tbody>{parsed.rows.slice(0,8).map(row=><tr key={row.fileRow}>
            <td>{row.ine}</td><td>{row.cnes}</td><td>{row.teamName || "—"}</td>
            <td>{row.denominator}</td><td>{row.pointsTotal}</td>
          </tr>)}</tbody>
        </table>
      </div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <small className="break-all text-slate-500">SHA-256: {hash}</small>
        <button type="button" className="primary-button" disabled={!canAnalyze}
          onClick={() => void analyze()}>
          <ShieldCheck aria-hidden="true" className="mr-2 inline size-4"/> Analisar duplicidades e permissões
        </button>
      </div>

      {preflight && <section aria-label="Resultado da conciliação" className="space-y-3 rounded-xl border p-4">
        <h3>Prévia antes da publicação</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {([["Novos",preflight.new],["Idênticos",preflight.identical],["Conflitos",preflight.conflicts],["Fora do escopo",preflight.unauthorized]] as const)
            .map(([label,value])=><div className="metric-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        {duplicate && <p className="text-sm">Este arquivo também consta no histórico como <strong>{duplicate.status}</strong> ({duplicate.rows_total} linhas).</p>}
        {(preflight.conflicts > 0 || preflight.unauthorized > 0) && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950" role="alert">
          <AlertCircle className="mr-2 inline size-5" aria-hidden="true"/>
          <strong>Publicação bloqueada por segurança.</strong>
          <p className="mt-1 text-sm">Há registros diferentes dos vigentes ou equipes fora da sua autorização. Nenhum dado será sobrescrito. Solicite conciliação ou uma exportação restrita ao seu escopo.</p>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {(preflight.details ?? []).slice(0,12).map((x,i)=><li key={i}>Linha {x.fileRow} · INE {x.ine} · {x.status === "conflito" ? "divergência" : "sem permissão"}</li>)}
          </ul>
        </div>}
        {!preflight.conflicts && !preflight.unauthorized && <p className="text-sm">
          Serão incluídos <strong>{preflight.new}</strong> registros novos.
          Outros <strong>{preflight.identical}</strong> permanecerão inalterados.
          A ausência de equipes na planilha não remove dados existentes.
        </p>}
        <button type="button" className="primary-button" disabled={!canPublish}
          onClick={() => void publish()}>{preflight.new ? "Confirmar inclusão segura" : "Registrar verificação sem alterações"}</button>
      </section>}
    </>}
    {result && <div role={result.ok ? "status" : "alert"}
      className={`rounded-xl border p-4 ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-800"}`}>
      {result.ok ? <CheckCircle2 aria-hidden="true" className="mr-2 inline size-5"/> : <AlertCircle aria-hidden="true" className="mr-2 inline size-5"/>}
      {result.message}
    </div>}
  </section>;
}
