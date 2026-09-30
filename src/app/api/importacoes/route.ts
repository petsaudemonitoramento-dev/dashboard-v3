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

const payloadSchema = z.object({
  mode: z.enum(["check", "publish"]),
  filename: z.string().trim().min(1).max(255).refine((value) => /^[^\\/\0]+\.xlsx$/i.test(value), "Nome de arquivo inválido."),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  competency: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-01$/),
  rows: compactRowsSchema.optional().default([]),
});

export async function POST(request: Request) {
  try {
    const context = await requireDataManager();
    const payload = payloadSchema.parse(await readJsonRequestBody(request));
    const userClient = await createClient();
    const duplicate = await userClient.schema("siaps").from("imports")
      .select("id, filename, competency, status, rows_total, uploaded_at")
      .eq("file_sha256", payload.fileSha256).maybeSingle();
    if (duplicate.error) throw new Error("Não foi possível verificar duplicidade.");
    if (payload.mode === "check") return NextResponse.json({ duplicate: duplicate.data });
    if (duplicate.data) return NextResponse.json({ error: "Arquivo já importado.", duplicate: duplicate.data }, { status: 409 });
    if (!payload.rows.length) return NextResponse.json({ error: "Nenhum registro válido para publicar." }, { status: 400 });
    validateCompactSiapsRows(payload.rows);

    const privileged = createPrivilegedClient();
    const metadata = {
      filename: payload.filename,
      file_sha256: payload.fileSha256,
      competency: payload.competency,
      indicator_code: "C3",
      indicator_name: "Cuidado na Gestação e Puerpério",
      municipality_ibge: "250400",
      municipality_name: "CAMPINA GRANDE",
      uf: "PB",
      source_status: "preliminar",
      parser_version: "mae-aps-c3/1.0.0",
      rows_total: payload.rows.length,
      uploaded_by: context.user.id,
    };
    const result = await privileged.rpc("publish_siaps_c3_v1", { p_metadata: metadata, p_rows: payload.rows });
    if (result.error) throw new Error("A publicação atômica da importação falhou.");
    const importId = result.data as string;
    return NextResponse.json({ importId, status: "publicado", rows: payload.rows.length });
  } catch (error) {
    const response = importErrorResponse(error);
    if (response.status === 500) {
      console.error(JSON.stringify({
        area: "siaps_import",
        level: "error",
        message: "Falha interna na importação SIAPS.",
      }));
      Sentry.captureException(error, { tags: { area: "siaps_import" } });
    }
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
}
