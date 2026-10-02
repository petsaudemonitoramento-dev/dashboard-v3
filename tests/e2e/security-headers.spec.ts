import { expect, test } from "@playwright/test";

test("entrega os headers de segurança nas páginas públicas", async ({ page }) => {
  const response = await page.goto("/entrar");

  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()",
  );
  expect(headers["strict-transport-security"]).toBe(
    "max-age=31536000; includeSubDomains",
  );
});
