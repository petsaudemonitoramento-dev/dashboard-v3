import { NextResponse } from "next/server";
import { z } from "zod";

import { requireDataManager } from "@/lib/auth/guards";
import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const payloadSchema = z.object({
  mode: z.enum(["check", "publish"]),
  filename: z.string().min(1).max(255),
  fileSha256: z.string().regex(/^[a-f0-9]{64}$/),
  competency: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])-01$/),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()])).length(21)).max(10000).default([]),
});

export async function POST(request: Request) {
  try {
    const context = await requireDataManager();
    const payload = payloadSchema.parse(await request.json());
    const userClient = await createClient();
    const duplicate = await userClient.schema("siaps").from("imports")
      .select("id, filename, competency, status, rows_total, uploaded_at")
      .eq("file_sha256", payload.fileSha256).maybeSingle();
    if (duplicate.error) throw new Error("Não foi possível verificar duplicidade.");
    if (payload.mode === "check") return NextResponse.json({ duplicate: duplicate.data });
    if (duplicate.data) return NextResponse.json({ error: "Arquivo já importado.", duplicate: duplicate.data }, { status: 409 });
    if (!payload.rows.length) return NextResponse.json({ error: "Nenhum registro válido para publicar." }, { status: 400 });

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
    let importId: string | null = null;
    for (let index = 0; index < payload.rows.length; index += 250) {
      const isLast = index + 250 >= payload.rows.length;
      const result = await privileged.rpc("stage_siaps_c3_compact", {
        p_metadata: metadata,
        p_rows: payload.rows.slice(index, index + 250),
        p_finalize: isLast,
      });
      if (result.error) throw new Error(`Falha ao publicar o bloco SIAPS: ${result.error.message}`);
      importId = result.data as string;
    }
    return NextResponse.json({ importId, status: "publicado", rows: payload.rows.length });
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 403;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha na importação." }, { status });
  }
}
