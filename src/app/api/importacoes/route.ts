import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

import { requireDataManager } from "@/lib/auth/guards";
import { importErrorResponse } from "@/lib/http/import-errors";
import { readJsonRequestBody } from "@/lib/http/request-body";
import { compactRowsSchema, validateCompactSiapsRows } from "@/lib/siaps/compact";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Não existe modo replaceExisting: publicar dados idênticos é idempotente;
// valores diferentes exigem conciliação, sem sobrescrita silenciosa.
const payloadSchema = z.object({
  mode: z.enum(["check", "publish"]),
  filename: z.string().trim().min(1).max(255)
    .refine(v => /^[^\\/\0]+\.xlsx$/i.test(v), "Nome de arquivo inválido."),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  competency: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-01$/),
  rows: compactRowsSchema.min(1),
  schemaSignature: z.string().max(4000).optional().default(""),
  previewId: z.string().uuid().optional(),
}).strict();

type ReconciliationResult = {
  previewId?: string | null;
  new?: number;
  identical?: number;
  conflicts?: number;
  unauthorized?: number;
  details?: { fileRow: number; ine: string; cnes: string; status: string }[];
  status?: "publicado" | "sem_alteracoes";
  importId?: string | null;
};

function rpcFailure(error: { code?: string; message?: string }): NextResponse {
  // O banco é o limite final de confiança. Não há fallback para v1/v2.
  if (error.code === "PGRST202" || /function.*not found|schema cache/i.test(error.message ?? "")) {
    return NextResponse.json({ error: "Importador V2 ainda não ativado no banco. Nenhuma alteração foi realizada.", code: "import_v2_not_ready" }, { status: 503 });
  }
  if (error.code === "42501") {
    return NextResponse.json({ error: "Você não tem permissão de importação para estas equipes. Solicite a atribuição de escopo.", code: "no_import_scope" }, { status: 403 });
  }
  if (error.code === "40001") {
    return NextResponse.json({ error: "Os dados mudaram desde a análise. Atualize a prévia antes de publicar.", code: "stale_preview" }, { status: 409 });
  }
  if (error.code === "23514" || error.code === "23505") {
    return NextResponse.json({ error: "Importação contém conflitos, dados já publicados ou equipes fora da permissão. Nenhum registro foi sobrescrito.", code: "reconciliation_conflict" }, { status: 409 });
  }
  if (error.code === "22023") {
    return NextResponse.json({ error: "Prévia inválida, vencida ou planilha inconsistente. Refaça a análise.", code: "invalid_preview" }, { status: 400 });
  }
  return NextResponse.json({ error: "A conciliação segura falhou; nenhuma alteração foi confirmada.", code: "database_error" }, { status: 503 });
}

export async function POST(request: Request) {
  try {
    const context = await requireDataManager();
    const payload = payloadSchema.parse(await readJsonRequestBody(request));
    validateCompactSiapsRows(payload.rows);
    const privileged = createPrivilegedClient();
    // Competência, ID do editor e permissões são conferidos outra vez no Postgres.
    const args = {
      p_actor: context.user.id,
      p_competency: payload.competency,
      p_filename: payload.filename,
      p_file_sha256: payload.fileSha256,
      p_rows: payload.rows,
      p_schema_signature: payload.schemaSignature,
    };

    if (payload.mode === "check") {
      const result = await privileged.rpc("preview_siaps_c3_v3", { ...args, p_store: true });
      if (result.error) return rpcFailure(result.error);
      const preflight = result.data as ReconciliationResult;
      const userClient = await createClient();
      const previous = await userClient.schema("siaps").from("imports")
        .select("id, filename, competency, status, rows_total, uploaded_at")
        .eq("file_sha256", payload.fileSha256).maybeSingle();
      if (previous.error) throw new Error("Falha na consulta do histórico de importações.");
      const latest = await userClient.schema("siaps").from("imports")
        .select("source_filters")
        .eq("indicator_code", "C3")
        .eq("municipality_ibge", "250400")
        .eq("status", "publicado")
        .order("uploaded_at", { ascending: false })
        .limit(1).maybeSingle();
      if (latest.error) throw new Error("Falha ao comparar versões do cabeçalho.");
      const filters = latest.data?.source_filters as { schema_signature?: unknown } | null | undefined;
      const prior = typeof filters?.schema_signature === "string" ? filters.schema_signature : null;
      const headers = (s: string) => new Set(s.split("|").filter(Boolean));
      const beforeHeaders = headers(prior ?? "");
      const nowHeaders = headers(payload.schemaSignature);
      const schemaChanges = prior && prior !== payload.schemaSignature
        ? {
          added: [...nowHeaders].filter(x => !beforeHeaders.has(x)).slice(0, 30),
          removed: [...beforeHeaders].filter(x => !nowHeaders.has(x)).slice(0, 30),
        } : null;
      return NextResponse.json({
        preview: preflight,
        schemaChanges,
        duplicate: previous.data,
        // Informativo; a RPC não substitui uma competência integralmente.
        publicationRequiresReview: Boolean((preflight.conflicts ?? 0) || (preflight.unauthorized ?? 0)),
      });
    }

    if (!payload.previewId) return NextResponse.json({
      error: "Analise a planilha antes de publicar.", code: "preview_required",
    }, { status: 400 });

    const result = await privileged.rpc("publish_siaps_c3_v3", {
      ...args,
      p_preview_id: payload.previewId,
    });
    if (result.error) return rpcFailure(result.error);
    const outcome = result.data as ReconciliationResult;
    return NextResponse.json({
      status: outcome.status,
      importId: outcome.importId ?? null,
      added: outcome.new ?? 0,
      unchanged: outcome.identical ?? 0,
      conflicts: 0,
      unauthorized: 0,
    });
  } catch (error) {
    const response = importErrorResponse(error);
    if (response.status === 500) {
      console.error(JSON.stringify({ area: "siaps_import_v2", level: "error", message: "Falha interna de importação." }));
      Sentry.captureException(error, { tags: { area: "siaps_import_v2" } });
    }
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
