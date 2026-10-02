export function isPreviewEnvironment(
  environment: Record<string, string | undefined> = process.env,
) {
  return environment.VERCEL_ENV === "preview";
}
