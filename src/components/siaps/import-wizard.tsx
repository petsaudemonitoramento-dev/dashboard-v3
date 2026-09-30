"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";

import { compactSiapsRow, parseSiapsWorkbook, sha256Hex, type SiapsParseResult } from "@/lib/siaps/parser";
import { readImportApiResponse, SIAPS_REQUEST_TOO_LARGE_MESSAGE, SIAPS_XLSX_TOO_LARGE_MESSAGE } from "@/lib/siaps/errors";
import { MAX_SIAPS_REQUEST_BYTES, MAX_SIAPS_XLSX_BYTES, utf8ByteLength } from "@/lib/siaps/limits";

type Duplicate = { id: string; filename: string; competency: string; status: string; rows_total: number } | null;
type CheckResponse = { duplicate?: Duplicate };
type PublishResponse = { rows?: number };

function serializedImportPayload(payload: unknown) {
  const body = JSON.stringify(payload);
  if (utf8ByteLength(body) > MAX_SIAPS_REQUEST_BYTES) {
    throw new Error(SIAPS_REQUEST_TOO_LARGE_MESSAGE);
  }
  return body;
}

async function postImport<T>(payload: unknown, fallbackMessage: string) {
  const body = serializedImportPayload(payload);
  const response = await fetch("/api/importacoes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  return readImportApiResponse<T>(response, fallbackMessage);
}

export function ImportWizard() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [hash, setHash] = useState("");
  const [parsed, setParsed] = useState<SiapsParseResult | null>(null);
  const [competency, setCompetency] = useState("");
  const [duplicate, setDuplicate] = useState<Duplicate>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setFilename(file.name); setHash(""); setParsed(null); setCompetency("");
    setDuplicate(null); setResult(null); setBusy(true);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Selecione um arquivo com extensão .xlsx.");
      if (file.type && file.type !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") throw new Error("O tipo do arquivo não corresponde a XLSX.");
      if (file.size === 0) throw new Error("O arquivo está vazio.");
      if (file.size > MAX_SIAPS_XLSX_BYTES) throw new Error(SIAPS_XLSX_TOO_LARGE_MESSAGE);
      const buffer = await file.arrayBuffer();
      const [nextParsed, nextHash] = await Promise.all([Promise.resolve(parseSiapsWorkbook(buffer, file.name)), sha256Hex(buffer)]);
      let validatedParse = nextParsed;
      if (!nextParsed.errors.length) {
        try {
          serializedImportPayload({
            mode: "publish",
            filename: file.name,
            fileSha256: nextHash,
            competency: nextParsed.competency ?? "2000-01-01",
            rows: nextParsed.rows.map(compactSiapsRow),
          });
        } catch (error) {
          validatedParse = {
            ...nextParsed,
            errors: [...nextParsed.errors, error instanceof Error ? error.message : SIAPS_REQUEST_TOO_LARGE_MESSAGE],
          };
        }
      }
      setFilename(file.name); setHash(nextHash); setParsed(validatedParse); setCompetency(validatedParse.competency ?? "");
      if (validatedParse.errors.length) return;
      const check = await postImport<CheckResponse>(
        { mode: "check", filename: file.name, fileSha256: nextHash, competency: nextParsed.competency ?? "2000-01-01", rows: [] },
        "Não foi possível verificar se o arquivo já foi importado.",
      );
      setDuplicate(check.duplicate ?? null);
    } catch (error) {
      setParsed({ competency: null, rows: [], errors: [error instanceof Error ? error.message : "Falha ao ler o arquivo."], warnings: [], headerRow: null });
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!parsed || parsed.errors.length || !/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(competency)) return;
    setBusy(true); setResult(null);
    try {
      const body = await postImport<PublishResponse>(
        { mode: "publish", filename, fileSha256: hash, competency, rows: parsed.rows.map(compactSiapsRow) },
        "Falha ao publicar.",
      );
      setResult({ message: `Importação publicada: ${body.rows ?? 0} registros válidos.`, ok: true });
      router.refresh();
    } catch (error) { setResult({ message: error instanceof Error ? error.message : "Falha ao publicar.", ok: false }); }
    finally { setBusy(false); }
  }

  return <section aria-busy={busy} className="panel space-y-5">
    <div className="panel-heading"><span className="eyebrow">Fluxo oficial</span><h2>Nova importação C3</h2><p>Leitura, validação e pré-visualização acontecem antes da confirmação.</p></div>
    <span aria-live="polite" className="sr-only">{busy ? "Processando a importação." : "Importação pronta para interação."}</span>
    <label className="upload-dropzone flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/60 p-8 text-center hover:border-sky-500">
      {busy ? <LoaderCircle aria-hidden="true" className="mb-3 size-9 animate-spin text-sky-700" /> : <UploadCloud aria-hidden="true" className="mb-3 size-9 text-sky-700" />}
      <strong>Selecione a planilha XLSX do SIAPS</strong><span className="mt-1 text-sm text-slate-500">O arquivo é validado antes de qualquer gravação.</span>
      <input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectFile(event.target.files?.[0])} />
    </label>
    {parsed && <>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="metric-card"><FileSpreadsheet aria-hidden="true" className="size-5 text-sky-700" /><span>Arquivo</span><strong className="text-base! break-all">{filename}</strong></div>
        <div className="metric-card"><label className="block text-slate-500" htmlFor="siaps-competency">Competência</label><input id="siaps-competency" className="field mt-3 w-full" type="date" value={competency} onChange={(event) => setCompetency(event.target.value ? `${event.target.value.slice(0, 7)}-01` : "")} /><small>Somente mês e ano são usados.</small></div>
        <div className="metric-card accent-green"><span>Registros válidos</span><strong>{parsed.rows.length}</strong></div>
        <div className="metric-card accent-orange"><span>Ocorrências</span><strong>{parsed.errors.length + parsed.warnings.length}</strong><small>{parsed.errors.length} erros · {parsed.warnings.length} advertências</small></div>
      </div>
      {duplicate && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900" role="alert"><AlertCircle aria-hidden="true" className="mr-2 inline size-5" /><strong>Arquivo duplicado:</strong> já consta como {duplicate.status} com {duplicate.rows_total} registros.</div>}
      {!!parsed.errors.length && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert"><strong>Erros que impedem a importação</strong><ul className="mt-2 list-disc pl-5">{parsed.errors.slice(0, 20).map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {!!parsed.warnings.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="status"><strong>Advertências</strong><ul className="mt-2 list-disc pl-5">{parsed.warnings.slice(0, 20).map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {!!parsed.rows.length && <div aria-label="Pré-visualização dos registros da importação" className="table-scroll" role="region" tabIndex={0}><table className="data-table"><caption className="sr-only">Primeiros oito registros válidos encontrados na planilha</caption><thead><tr><th scope="col">Linha</th><th scope="col">CNES / UBS</th><th scope="col">INE / Equipe</th><th scope="col">A–K</th><th scope="col">Pontos</th><th scope="col">Denominador</th><th scope="col">Razão oficial</th></tr></thead><tbody>{parsed.rows.slice(0, 8).map((row) => <tr key={row.fileRow}><td>{row.fileRow}</td><td>{row.cnes}<br/><small>{row.establishmentName}</small></td><td>{row.ine}<br/><small>{row.teamName}</small></td><td>{Object.values(row.components).join(" · ")}</td><td>{row.pointsTotal}</td><td>{row.denominator}</td><td>{row.officialRatio ?? "—"}</td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">SHA-256: <code>{hash}</code></span><button className="primary-button" disabled={busy || !!duplicate || !!parsed.errors.length || !competency} onClick={() => void publish()} type="button">Confirmar e publicar</button></div>
      {result && <div className={`rounded-xl border p-4 ${result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`} role={result.ok ? "status" : "alert"}>{result.ok ? <CheckCircle2 aria-hidden="true" className="mr-2 inline size-5" /> : <AlertCircle aria-hidden="true" className="mr-2 inline size-5" />}{result.message}</div>}
    </>}
  </section>;
}
