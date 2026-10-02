export function isPreviewEnvironment(
  environment: { VERCEL_ENV?: string } = process.env,
) {
  return environment.VERCEL_ENV === "preview";
}
