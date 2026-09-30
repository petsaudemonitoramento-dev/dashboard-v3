import { MAX_SIAPS_REQUEST_BYTES, utf8ByteLength } from "@/lib/siaps/limits";

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the configured byte limit.");
    this.name = "RequestBodyTooLargeError";
  }
}

/**
 * Reads and measures the actual UTF-8 body. Content-Length is only an early
 * rejection optimization because it can be absent or inaccurate.
 */
export async function readJsonRequestBody(
  request: Request,
  maxBytes = MAX_SIAPS_REQUEST_BYTES,
): Promise<unknown> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      throw new RequestBodyTooLargeError();
    }
  }

  const text = await request.text();
  if (utf8ByteLength(text) > maxBytes) throw new RequestBodyTooLargeError();
  return JSON.parse(text);
}
