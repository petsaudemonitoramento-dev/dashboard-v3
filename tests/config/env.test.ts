import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env";

describe("validação de ambiente", () => {
  it("aceita somente URL HTTPS e chave publicável", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "sb_publishable_abcdefghijklmnopqrstuvwxyz",
      }),
    ).toBeTruthy();
  });

  it("rejeita chave service-role no ambiente público", () => {
    expect(() =>
      parsePublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
          "service_role_never_expose_this_value",
      }),
    ).toThrow();
  });
});
