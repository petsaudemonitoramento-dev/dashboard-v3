import { describe, expect, it } from "vitest";

import {
  CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "@/config/security-headers";

function header(name: string) {
  return SECURITY_HEADERS.find(
    (candidate) => candidate.key.toLowerCase() === name.toLowerCase(),
  )?.value;
}

describe("headers HTTP", () => {
  it("mantém as proteções obrigatórias da aplicação", () => {
    expect(header("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("X-Frame-Options")).toBe("DENY");
    expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=()",
    );
  });

  it("protege enquadramento, base, formulários e plugins na CSP incremental", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
  });

  it("não antecipa diretivas que dependem de nonces e allow-lists testadas", () => {
    expect(CONTENT_SECURITY_POLICY).not.toMatch(
      /(?:^|;\s*)(?:default|script|style|connect|img|font)-src\b/,
    );
  });

  it("não publica headers duplicados", () => {
    const names = SECURITY_HEADERS.map(({ key }) => key.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});
