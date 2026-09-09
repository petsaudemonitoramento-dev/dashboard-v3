export const USER_ROLES = [
  "administrador",
  "gestao_municipal",
  "profissional",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const REQUESTABLE_USER_ROLES = [
  "gestao_municipal",
  "profissional",
] as const;

export type RequestableUserRole = (typeof REQUESTABLE_USER_ROLES)[number];

export const APPROVAL_STATUSES = [
  "pendente",
  "aprovado",
  "rejeitado",
] as const;

export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type Profile = {
  userId: string;
  role: UserRole;
  fullName: string | null;
  phone: string | null;
  professionalRegistration: string | null;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  completedAt: string | null;
  blockedAt: string | null;
  deletedAt: string | null;
};

export type ActiveProfileContext = {
  user: AuthenticatedUser;
  profile: Profile;
};

export type AccessErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_MISSING"
  | "PROFILE_INCOMPLETE"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "INACTIVE"
  | "BLOCKED"
  | "DELETED"
  | "FORBIDDEN";

export class AccessDeniedError extends Error {
  constructor(
    public readonly code: AccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AccessDeniedError";
  }
}
