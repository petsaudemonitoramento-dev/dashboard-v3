"use client";

import { useActionState, useRef, useState } from "react";

import {
  confirmPecImportAction,
  previewPecImportAction,
  type PecImportState,
} from "../actions";

const INITIAL: PecImportState = { status: "idle", message: "" };

export function PecImportForm() {
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const [previewState, previewAction, previewPending] = useActionState(
    previewPecImportAction,
    INITIAL,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmPecImportAction,
    INITIAL,
  );

  const preview = previewState.preview;
  const concluida = confirmState.status === "imported";

  return (
    <div className="grid gap-4">
      <form
        action={previewAction}
        className="rounded-2xl border border-slate-200 bg-white p-6"
        ref={formRef}
      >
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Planilha exportada do PEC (.csv, .xlsx ou .xls, até 10 MB)
          <input
            accept=".csv,.xlsx,.xls"
            className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
            name="arquivo"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
            required
            type="file"
          />
        </label>
        <button
          className="mt-4 rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={previewPending}
          type="submit"
        >
          {previewPending ? "Analisando…" : "Analisar arquivo"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          O arquivo é lido no servidor. Nada é gravado antes da sua confirmação.
        </p>
      </form>

      {previewState.status === "error" ? (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900" role="status">
          {previewState.message}
        </p>
      ) : null}

      {preview && !concluida ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Conferência antes de gravar
          </h2>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Stat label="Gestantes na planilha" value={preview.totalRows} />
            <Stat
              label="Duplicadas no arquivo"
              value={preview.duplicatesInFile}
              warn={preview.duplicatesInFile > 0}
            />
            <Stat
              label="Linhas com aviso"
              value={preview.issues.length}
              warn={preview.issues.length > 0}
            />
          </dl>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Colunas reconhecidas
              </h3>
              <ul className="mt-2 grid gap-1 text-sm text-slate-700">
                {preview.recognizedFields.map((item) => (
                  <li key={item.field}>✓ {item.label}</li>
                ))}
              </ul>
            </div>
            {preview.unmappedHeaders.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Colunas ignoradas
                </h3>
                <ul className="mt-2 grid gap-1 text-sm text-slate-600">
                  {preview.unmappedHeaders.map((header) => (
                    <li key={header}>— {header}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {preview.issues.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Avisos
              </h3>
              <ul className="mt-2 grid max-h-56 gap-1 overflow-y-auto text-sm text-amber-900">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.rowNumber}-${index}`}>
                    Linha {issue.rowNumber}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.sample.length > 0 ? (
            <div className="mt-5 overflow-x-auto">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Amostra
              </h3>
              <table className="mt-2 w-full min-w-[34rem] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Nome</th>
                    <th className="py-2">Nascimento</th>
                    <th className="py-2">Risco</th>
                    <th className="py-2">Consultas</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.map((row) => (
                    <tr className="border-t border-slate-100" key={row.rowNumber}>
                      <td className="py-2">{row.displayName}</td>
                      <td className="py-2">{row.birthDate ?? "—"}</td>
                      <td className="py-2">{row.riskLevel ?? "—"}</td>
                      <td className="py-2">{row.prenatalVisits ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <form
            action={confirmAction}
            className="mt-6 border-t border-slate-100 pt-5"
          >
            {/* O arquivo é reenviado: o servidor reprocessa em vez de confiar
                nas linhas devolvidas ao navegador. */}
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Reenvie o mesmo arquivo para confirmar
              <input
                accept=".csv,.xlsx,.xls"
                className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
                name="arquivo"
                required
                type="file"
              />
            </label>
            <button
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={confirmPending}
              type="submit"
            >
              {confirmPending
                ? "Importando…"
                : `Confirmar importação de ${preview.totalRows} gestante(s)`}
            </button>
            {fileName ? (
              <p className="mt-2 text-xs text-slate-500">
                Arquivo analisado: {fileName}
              </p>
            ) : null}
          </form>
        </section>
      ) : null}

      {confirmState.message ? (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            concluida ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"
          }`}
          role="status"
        >
          {confirmState.message}
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        warn ? "border-amber-300 bg-amber-50" : "border-slate-200"
      }`}
    >
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-semibold text-[#071d35]">{value}</dd>
    </div>
  );
}
