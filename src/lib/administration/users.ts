import { ADMIN_USERS_PAGE_SIZE } from "@/lib/administration/pagination";

export type AdministrationProfile = {
  user_id: string;
  email: string;
  role: "admin" | "gestao" | "leitura";
  active: boolean;
};

export type AdministrationAuthUser = {
  id: string;
  email?: string;
  created_at: string;
};

export type AdministrationUserSource = {
  listUsers(input: { page: number; perPage: number }): Promise<{
    users: AdministrationAuthUser[];
    total: number;
  }>;
  listProfiles(userIds: string[]): Promise<AdministrationProfile[]>;
};

export async function loadAdministrationUsers(
  source: AdministrationUserSource,
  requestedPage: number,
) {
  const result = await source.listUsers({
    page: requestedPage,
    perPage: ADMIN_USERS_PAGE_SIZE,
  });
  if (!Number.isSafeInteger(result.total) || result.total < 0) {
    throw new Error("A contagem de usuários retornada é inválida.");
  }

  const lastPage = Math.max(1, Math.ceil(result.total / ADMIN_USERS_PAGE_SIZE));
  if (requestedPage > lastPage) {
    return {
      currentPage: requestedPage,
      lastPage,
      redirectPage: lastPage,
      rows: [],
      total: result.total,
    };
  }

  const userIds = result.users.map((user) => user.id);
  const profileRows = userIds.length ? await source.listProfiles(userIds) : [];
  const profiles = new Map(profileRows.map((profile) => [profile.user_id, profile]));

  return {
    currentPage: requestedPage,
    lastPage,
    redirectPage: null,
    rows: result.users.map((user) => ({
      id: user.id,
      email: user.email ?? "Sem e-mail",
      createdAt: user.created_at,
      profile: profiles.get(user.id) ?? null,
    })),
    total: result.total,
  };
}
