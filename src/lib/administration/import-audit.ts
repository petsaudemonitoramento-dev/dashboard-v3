import "server-only";

import { createPrivilegedClient } from "@/lib/supabase/privileged";
import { createClient } from "@/lib/supabase/server";

type ImportRow = {
  id: string;
  filename: string;
  file_sha256: string;
  competency: string;
  status: string;
  rows_total: number;
  uploaded_by: string | null;
  uploaded_at: string;
  published_at: string | null;
  uploaded_by_email_snapshot?: string | null;
  supersedes_import_id?: string | null;
  superseded_by_import_id?: string | null;
};

export type AdministrationImportAuditRow = {
  id: string;
  filename: string;
  fileSha256: string;
  competency: string;
  status: string;
  rowsTotal: number;
  actor: string;
  uploadedAt: string;
  publishedAt: string | null;
  supersedesImportId: string | null;
  supersededByImportId: string | null;
};

function versioningColumnsUnavailable(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST204"
    || error?.message?.includes("uploaded_by_email_snapshot") === true
    || error?.message?.includes("supersedes_import_id") === true;
}

export async function loadAdministrationImportAudit(limit = 25) {
  const supabase = await createClient();
  const privileged = createPrivilegedClient();
  const baseColumns = "id, filename, file_sha256, competency, status, rows_total, uploaded_by, uploaded_at, published_at";
  const versionedColumns = `${baseColumns}, uploaded_by_email_snapshot, supersedes_import_id, superseded_by_import_id`;

  const versionedResult = await supabase
    .schema("siaps")
    .from("imports")
    .select(versionedColumns)
    .order("uploaded_at", { ascending: false })
    .limit(limit);

  let data: unknown[] | null = versionedResult.data;
  let error = versionedResult.error;

  if (error) {
    const fallbackResult = await supabase
      .schema("siaps")
      .from("imports")
      .select(baseColumns)
      .order("uploaded_at", { ascending: false })
      .limit(limit);

    if (versioningColumnsUnavailable(error) || !fallbackResult.error) {
      data = fallbackResult.data;
      error = fallbackResult.error;
    }
  }

  if (error) {
    throw new Error("Não foi possível carregar a auditoria de importações.");
  }

  const rows = (data ?? []) as ImportRow[];
  const userIds = [...new Set(rows.map((row) => row.uploaded_by).filter((value): value is string => Boolean(value)))];
  const actorEmails = new Map<string, string>();

  await Promise.all(userIds.map(async (userId) => {
    try {
      const userResult = await privileged.auth.admin.getUserById(userId);
      const email = userResult.data.user?.email;
      if (!userResult.error && email) actorEmails.set(userId, email);
    } catch {
      // A conta pode ter sido removida; o snapshot persistente é usado quando disponível.
    }
  }));

  return rows.map((row): AdministrationImportAuditRow => ({
    id: row.id,
    filename: row.filename,
    fileSha256: row.file_sha256,
    competency: row.competency,
    status: row.status,
    rowsTotal: row.rows_total,
    actor: row.uploaded_by_email_snapshot
      || (row.uploaded_by ? actorEmails.get(row.uploaded_by) : undefined)
      || "Conta removida ou indisponível",
    uploadedAt: row.uploaded_at,
    publishedAt: row.published_at,
    supersedesImportId: row.supersedes_import_id ?? null,
    supersededByImportId: row.superseded_by_import_id ?? null,
  }));
}
