export function isPreviewEnvironment(
  environment: Pick<NodeJS.ProcessEnv, "VERCEL_ENV"> = process.env,
) {
  return environment.VERCEL_ENV === "preview";
}
