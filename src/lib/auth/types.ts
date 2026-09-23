export const USER_ROLES = ["admin", "gestao", "leitura"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type Profile = {
  userId: string;
  email: string;
  role: UserRole;
  isActive: boolean;
};

export type ActiveProfileContext = {
  user: AuthenticatedUser;
  profile: Profile;
};

export type AccessErrorCode =
  | "UNAUTHENTICATED"
  | "PROFILE_MISSING"
  | "INACTIVE"
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
