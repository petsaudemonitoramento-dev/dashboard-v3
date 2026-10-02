import { describe, expect, it } from "vitest";

import { readJsonRequestBody, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { utf8ByteLength } from "@/lib/siaps/limits";

function request(body: string, contentLength?: string) {
  return new Request("http://localhost/api/importacoes", {
    method: "POST",
    headers: contentLength === undefined ? undefined : { "content-length": contentLength },
    body,
  });
}

describe("limite real do corpo da importação", () => {
  it("aceita JSON dentro do limite", async () => {
    await expect(readJsonRequestBody(request('{"mode":"check"}'), 64)).resolves.toEqual({ mode: "check" });
  });

  it("rejeita cedo quando Content-Length declarado excede o limite", async () => {
    await expect(readJsonRequestBody(request("{}", "65"), 64)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("mede o corpo real quando Content-Length está ausente ou subestimado", async () => {
    const body = JSON.stringify({ value: "á".repeat(20) });
    expect(utf8ByteLength(body)).toBeGreaterThan(body.length);

    await expect(readJsonRequestBody(request(body), 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    await expect(readJsonRequestBody(request(body, "1"), 32)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("mantém JSON malformado como erro de entrada", async () => {
    await expect(readJsonRequestBody(request("{"), 64)).rejects.toBeInstanceOf(SyntaxError);
  });
});
