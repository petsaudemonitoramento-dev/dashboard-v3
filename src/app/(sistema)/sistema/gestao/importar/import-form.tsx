"use client";

import { useActionState } from "react";

import {
  ingestSiapsAction,
  previewSiapsAction,
  publishImportAction,
  type PublishState,
  type SiapsImportState,
} from "../actions";

const INITIAL: SiapsImportState = { status: "idle", message: "" };
const PUBLISH_INITIAL: PublishState = { ok: false, message: "" };

export function SiapsImportForm() {
  const [previewState, previewAction, previewPending] = useActionState(
    previewSiapsAction,
    INITIAL,
  );
  const [ingestState, ingestAction, ingestPending] = useActionState(
    ingestSiapsAction,
    INITIAL,
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishImportAction,
    PUBLISH_INITIAL,
  );

  const preview = previewState.preview;
  const ingest = ingestState.ingest;

  return (
    <div className="grid gap-4">
      <form
        action={previewAction}
        className="rounded-2xl border border-slate-200 bg-white p-6"
      >
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Relatório Qualidade — Visão por Competência (.xlsx, até 25 MB)
          <input
            accept=".xlsx"
            className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
            name="arquivo"
            required
            type="file"
          />
        </label>
        <button
          className="mt-4 rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          disabled={previewPending}
          type="submit"
        >
          {previewPending ? "Analisando…" : "Analisar relatório"}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Visão por Equipe e Visão por Indicador não são fontes de ingestão: as
          séries por equipe são reconstruídas a partir das competências.
        </p>
      </form>

      {previewState.status === "error" ? (
        <Alert tone="error">{previewState.message}</Alert>
      ) : null}

      {preview ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Reconhecimento da fonte
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Competência" value={preview.competencyLabel} />
            <Info label="Município" value={preview.municipality} />
            <Info
              label="Situação do dado"
              value={preview.sourceStatus ?? "não informada"}
            />
            <Info
              label="Gerado no SIAPS"
              value={
                preview.generatedAt
                  ? new Date(preview.generatedAt).toLocaleString("pt-BR")
                  : "—"
              }
            />
            <Info label="Filtro de equipes" value={preview.teamTypeFilter ?? "—"} />
            <Info label="Equipes no arquivo" value={String(preview.teamsTotal)} />
          </dl>

          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <Info label="Denominador" value={preview.denominator.toLocaleString("pt-BR")} />
            <Info label="Pontos" value={preview.pointsTotal.toLocaleString("pt-BR")} />
            <Info
              label="C3 recomposto (prévia)"
              value={
                preview.recomposedC3 === null
                  ? "—"
                  : preview.recomposedC3.toFixed(2)
              }
            />
          </dl>

          {preview.checksumFailures > 0 ? (
            <Alert tone="error">
              {preview.checksumFailures} linha(s) não reproduzem a soma ponderada
              das boas práticas. O arquivo pode ter sido alterado ou a
              metodologia mudou.
            </Alert>
          ) : (
            <Alert tone="ok">
              Checksum conferido: 10×A + 9×(B..K) reproduz os pontos declarados
              em todas as linhas.
            </Alert>
          )}

          {preview.issues.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Avisos
              </h3>
              <ul className="mt-2 grid max-h-48 gap-1 overflow-y-auto text-sm text-amber-900">
                {preview.issues.map((issue, index) => (
                  <li key={`${issue.fileRow}-${index}`}>
                    Linha {issue.fileRow}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <form action={ingestAction} className="mt-6 border-t border-slate-100 pt-5">
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Reenvie o mesmo arquivo para gravar
              <input
                accept=".xlsx"
                className="rounded-lg border border-slate-300 p-2 text-sm font-normal"
                name="arquivo"
                required
                type="file"
              />
            </label>
            <button
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              disabled={ingestPending}
              type="submit"
            >
              {ingestPending ? "Gravando…" : "Gravar competência"}
            </button>
          </form>
        </section>
      ) : null}

      {ingestState.message ? (
        <Alert tone={ingestState.status === "ingested" ? "ok" : "error"}>
          {ingestState.message}
        </Alert>
      ) : null}

      {ingest ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071d35]">
            Resultado da gravação
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-4">
            <Info label="Linhas" value={String(ingest.rowsTotal)} />
            <Info label="Elegíveis" value={String(ingest.rowsEligible)} />
            <Info label="Excluídas" value={String(ingest.rowsExcluded)} />
            <Info
              label="Sem classificação"
              value={String(ingest.rowsUnclassified)}
            />
          </dl>

          {ingest.publicationBlock ? (
            <Alert tone="error">{ingest.publicationBlock}</Alert>
          ) : (
            <form action={publishAction} className="mt-5">
              <input name="importId" type="hidden" value={ingest.importId} />
              <button
                className="rounded-lg bg-[#0d4d80] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                disabled={publishPending}
                type="submit"
              >
                {publishPending ? "Publicando…" : "Publicar no painel"}
              </button>
              <p className="mt-2 text-xs text-slate-500">
                Importar e publicar são passos separados. A competência só entra
                no painel após esta confirmação.
              </p>
            </form>
          )}
        </section>
      ) : null}

      {publishState.message ? (
        <Alert tone={publishState.ok ? "ok" : "error"}>{publishState.message}</Alert>
      ) : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "ok" | "error";
  children: React.ReactNode;
}) {
  return (
    <p
      className={`mt-4 rounded-lg px-3 py-2 text-sm ${
        tone === "ok"
          ? "bg-emerald-50 text-emerald-900"
          : "bg-rose-50 text-rose-900"
      }`}
      role="status"
    >
      {children}
    </p>
  );
}
