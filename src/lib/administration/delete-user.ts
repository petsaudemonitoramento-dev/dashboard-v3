export type AdministrationRole = "admin" | "gestao" | "leitura";

export type AdministrationDeletionGateway = {
  getRole(userId: string): Promise<AdministrationRole | null>;
  deleteUser(userId: string): Promise<void>;
  recordDeletion(input: {
    actorUserId: string;
    targetUserId: string;
    role: AdministrationRole | null;
  }): Promise<void>;
};

export async function deleteAdministrationUser(
  gateway: AdministrationDeletionGateway,
  actorUserId: string,
  targetUserId: string,
): Promise<"admin_protected" | "deleted"> {
  const role = await gateway.getRole(targetUserId);

  if (role === "admin") {
    return "admin_protected";
  }

  await gateway.deleteUser(targetUserId);

  try {
    await gateway.recordDeletion({ actorUserId, targetUserId, role });
  } catch {
    console.error("Falha ao registrar auditoria da exclusão de perfil.");
  }

  return "deleted";
}
