/**
 * Resolução de destino pós-autenticação restrita à própria aplicação.
 *
 * Validar por prefixo de string não basta. A normalização WHATWG converte `\`
 * em `/` para esquemas especiais, então `/\evil.com` vira `//evil.com` e
 * escapa do domínio — foi assim que o `safeNext` anterior era contornado.
 * A única checagem confiável é resolver a URL contra a origem canônica e
 * comparar a origem resultante.
 */

export const DEFAULT_DESTINATION = "/sistema";

export function safeNext(value: string | null | undefined, origin: string) {
  if (!value) {
    return DEFAULT_DESTINATION;
  }

  // Barra invertida e byte nulo não têm uso legítimo em um caminho interno e
  // são os vetores conhecidos de contorno da normalização.
  if (value.includes("\\") || value.includes("\0")) {
    return DEFAULT_DESTINATION;
  }

  let resolved: URL;
  try {
    resolved = new URL(value, origin);
  } catch {
    return DEFAULT_DESTINATION;
  }

  if (resolved.origin !== origin) {
    return DEFAULT_DESTINATION;
  }

  return resolved.pathname + resolved.search + resolved.hash;
}
