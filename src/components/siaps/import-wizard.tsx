"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud } from "lucide-react";

import { compactSiapsRow, parseSiapsWorkbook, sha256Hex, type SiapsParseResult } from "@/lib/siaps/parser";

type Duplicate = { id: string; filename: string; competency: string; status: string; rows_total: number } | null;

export function ImportWizard() {
  const [filename, setFilename] = useState("");
  const [hash, setHash] = useState("");
  const [parsed, setParsed] = useState<SiapsParseResult | null>(null);
  const [competency, setCompetency] = useState("");
  const [duplicate, setDuplicate] = useState<Duplicate>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setResult(null); setDuplicate(null);
    try {
      const buffer = await file.arrayBuffer();
      const [nextParsed, nextHash] = await Promise.all([Promise.resolve(parseSiapsWorkbook(buffer, file.name)), sha256Hex(buffer)]);
      setFilename(file.name); setHash(nextHash); setParsed(nextParsed); setCompetency(nextParsed.competency ?? "");
      const response = await fetch("/api/importacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "check", filename: file.name, fileSha256: nextHash, competency: nextParsed.competency ?? "2000-01-01", rows: [] }) });
      if (response.ok) setDuplicate((await response.json()).duplicate ?? null);
    } catch (error) {
      setParsed({ competency: null, rows: [], errors: [error instanceof Error ? error.message : "Falha ao ler o arquivo."], warnings: [], headerRow: null });
    } finally { setBusy(false); }
  }

  async function publish() {
    if (!parsed || parsed.errors.length || !/^20\d{2}-(0[1-9]|1[0-2])-01$/.test(competency)) return;
    setBusy(true); setResult(null);
    try {
      const response = await fetch("/api/importacoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "publish", filename, fileSha256: hash, competency, rows: parsed.rows.map(compactSiapsRow) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Falha ao publicar.");
      setResult(`Importação publicada: ${body.rows} registros válidos.`);
    } catch (error) { setResult(error instanceof Error ? error.message : "Falha ao publicar."); }
    finally { setBusy(false); }
  }

  return <section className="panel space-y-5">
    <div className="panel-heading"><span className="eyebrow">Fluxo oficial</span><h2>Nova importação C3</h2><p>Leitura, validação e pré-visualização acontecem antes da confirmação.</p></div>
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/60 p-8 text-center hover:border-sky-400">
      {busy ? <LoaderCircle className="mb-3 size-9 animate-spin text-sky-700" /> : <UploadCloud className="mb-3 size-9 text-sky-700" />}
      <strong>Selecione a planilha XLSX do SIAPS</strong><span className="mt-1 text-sm text-slate-500">O arquivo é validado antes de qualquer gravação.</span>
      <input className="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void selectFile(event.target.files?.[0])} />
    </label>
    {parsed && <>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="metric-card"><FileSpreadsheet className="size-5 text-sky-700" /><span>Arquivo</span><strong className="text-base! break-all">{filename}</strong></div>
        <div className="metric-card"><span>Competência</span><input className="field mt-3 w-full" type="date" value={competency} onChange={(event) => setCompetency(event.target.value)} /></div>
        <div className="metric-card accent-green"><span>Registros válidos</span><strong>{parsed.rows.length}</strong></div>
        <div className="metric-card accent-orange"><span>Ocorrências</span><strong>{parsed.errors.length + parsed.warnings.length}</strong><small>{parsed.errors.length} erros · {parsed.warnings.length} advertências</small></div>
      </div>
      {duplicate && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900"><AlertCircle className="mr-2 inline size-5" /><strong>Arquivo duplicado:</strong> já consta como {duplicate.status} com {duplicate.rows_total} registros.</div>}
      {!!parsed.errors.length && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"><strong>Erros que impedem a importação</strong><ul className="mt-2 list-disc pl-5">{parsed.errors.slice(0, 20).map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {!!parsed.warnings.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900"><strong>Advertências</strong><ul className="mt-2 list-disc pl-5">{parsed.warnings.slice(0, 20).map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {!!parsed.rows.length && <div className="table-scroll"><table className="data-table"><thead><tr><th>Linha</th><th>CNES / UBS</th><th>INE / Equipe</th><th>A–K</th><th>Pontos</th><th>Denominador</th><th>Razão oficial</th></tr></thead><tbody>{parsed.rows.slice(0, 8).map((row) => <tr key={row.fileRow}><td>{row.fileRow}</td><td>{row.cnes}<br/><small>{row.establishmentName}</small></td><td>{row.ine}<br/><small>{row.teamName}</small></td><td>{Object.values(row.components).join(" · ")}</td><td>{row.pointsTotal}</td><td>{row.denominator}</td><td>{row.officialRatio ?? "—"}</td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-slate-500">SHA-256: <code>{hash}</code></span><button className="primary-button" disabled={busy || !!duplicate || !!parsed.errors.length || !competency} onClick={() => void publish()} type="button">Confirmar e publicar</button></div>
      {result && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 className="mr-2 inline size-5" />{result}</div>}
    </>}
  </section>;
}
