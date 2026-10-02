import { describe, expect, it } from "vitest";

import { isPreviewEnvironment } from "@/lib/observability/environment";

describe("diagnóstico do Sentry", () => {
  it("fica habilitado somente no Preview da Vercel", () => {
    expect(isPreviewEnvironment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isPreviewEnvironment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isPreviewEnvironment({ VERCEL_ENV: "development" })).toBe(false);
    expect(isPreviewEnvironment({ VERCEL_ENV: undefined })).toBe(false);
  });
});
