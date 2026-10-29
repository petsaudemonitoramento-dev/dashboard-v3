#!/usr/bin/env python3
"""Configurar dominio HTTPS no .env local sem imprimir chaves ou alterar outros valores."""
import argparse
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT / ".env"


def validated_domain(value: str) -> str:
    domain = value.strip().lower()
    if len(domain) > 253 or not re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)+", domain):
        raise ValueError("Digite apenas o hostname DNS, sem http://, porta ou caminho.")
    if any(label.startswith("-") or label.endswith("-") for label in domain.split(".")):
        raise ValueError("Hostname tem label invalido.")
    if domain.endswith(".invalid") or domain.endswith(".local") or domain.endswith(".test"):
        raise ValueError("Nao usar hostname ficticio ou local para TLS publico.")
    return domain


def update_settings(content: str, domain: str) -> str:
    lines = content.splitlines()
    settings = {
        "MB_SITE_URL": "https://" + domain,
        "METABASE_DOMAIN": domain,
    }
    output = []
    for line in lines:
        key = line.split("=", 1)[0].strip()
        if key in settings:
            continue
        output.append(line)
    output.extend("%s=%s" % (key, value) for key, value in settings.items())
    return "\n".join(output) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("hostname", help="DNS aprovado pela TI, sem esquema: bi.exemplo.org")
    args = parser.parse_args()
    domain = validated_domain(args.hostname)
    if not ENV_FILE.exists():
        raise SystemExit("ERRO: execute bash scripts/prepare.sh primeiro.")
    old = ENV_FILE.read_text("utf-8")
    for name in ("MB_ENCRYPTION_SECRET_KEY", "MB_SESSION_SECRET_KEY"):
        if not re.search(r"(?m)^" + name + r"=.+$", old):
            raise SystemExit("ERRO: .env sem chave preexistente; interrompendo sem alterar arquivo.")
    new = update_settings(old, domain)
    tmp = ENV_FILE.with_name(".env.tmp")
    fd = os.open(str(tmp), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            file.write(new)
        os.replace(tmp, ENV_FILE)
    finally:
        if tmp.exists():
            tmp.unlink()
    os.chmod(ENV_FILE, 0o600)
    print("Dominio HTTPS registrado no .env; segredos preservados.")
    print("Checar DNS e portas 80/443 antes de rodar o overlay HTTPS.")


if __name__ == "__main__":
    main()
