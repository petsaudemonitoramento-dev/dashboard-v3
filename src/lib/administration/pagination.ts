export const ADMIN_USERS_PAGE_SIZE = 50;

export type AdministrationStatus =
  | "admin-protegido"
  | "erro"
  | "excluido"
  | "salvo";

export function parseAdministrationPage(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return { page: 1, needsRedirect: false };
  }
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return { page: 1, needsRedirect: true };
  }
  const page = Number(value);
  if (!Number.isSafeInteger(page)) {
    return { page: 1, needsRedirect: true };
  }
  return { page, needsRedirect: page === 1 };
}

export function parseAdministrationStatus(value: unknown): AdministrationStatus | undefined {
  return value === "salvo"
    || value === "erro"
    || value === "excluido"
    || value === "admin-protegido"
    ? value
    : undefined;
}

export function administrationHref({
  page = 1,
  status,
}: {
  page?: number;
  status?: AdministrationStatus;
}) {
  const query = new URLSearchParams();
  if (page > 1) query.set("page", String(page));
  if (status) query.set("status", status);
  const suffix = query.toString();
  return suffix ? `/sistema/administracao?${suffix}` : "/sistema/administracao";
}

export function administrationActionHref(pageValue: unknown, status: AdministrationStatus) {
  return administrationHref({
    page: parseAdministrationPage(pageValue).page,
    status,
  });
}
