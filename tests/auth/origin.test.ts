import { describe, expect, it } from "vitest";

import { resolveAuthOrigin } from "@/lib/auth/origin";

describe("origem confiável da autenticação", () => {
  it("mantém a origem configurada fora do Preview", () => {
    expect(resolveAuthOrigin({
      VERCEL_ENV: "production",
      VERCEL_BRANCH_URL: "maeaps-git-feature-example.vercel.app",
    })).toBe(process.env.NEXT_PUBLIC_APP_URL);
  });

  it("usa a URL estável da branch no Preview", () => {
    expect(resolveAuthOrigin({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "maeaps-git-feature-example.vercel.app",
      VERCEL_URL: "maeaps-random-hash.vercel.app",
    })).toBe("https://maeaps-git-feature-example.vercel.app");
  });

  it("usa VERCEL_URL como fallback no Preview", () => {
    expect(resolveAuthOrigin({
      VERCEL_ENV: "preview",
      VERCEL_URL: "maeaps-random-hash.vercel.app",
    })).toBe("https://maeaps-random-hash.vercel.app");
  });

  it("recusa host Vercel malformado e volta à origem configurada", () => {
    expect(resolveAuthOrigin({
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL: "evil.example.com",
      VERCEL_URL: "maeaps.vercel.app@evil.example.com",
    })).toBe(process.env.NEXT_PUBLIC_APP_URL);
  });
});
