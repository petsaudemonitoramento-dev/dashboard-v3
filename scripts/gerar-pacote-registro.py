#!/usr/bin/env python3
"""
Gera o pacote de registro do programa "Cuidado na Gestação na APS".

O pacote precisa ser *reprodutível*: gerar duas vezes o mesmo commit tem de
produzir bytes idênticos, e portanto o mesmo resumo SHA-256. Sem isso o resumo
declarado no registro não prova coisa alguma — qualquer diferença de horário de
arquivo mudaria o valor.

Para conseguir isso o script:
  · usa `git ls-files` como fonte da lista, e não o disco. Arquivo não
    versionado não entra, por construção;
  · lê o conteúdo com `git show`, e não do diretório de trabalho, de modo que
    modificações não commitadas não vazem para o pacote;
  · grava toda entrada do ZIP com data fixa e ordem estável;
  · não usa compressão dependente de versão da biblioteca (deflate nível fixo).

Uso:
    python3 scripts/gerar-pacote-registro.py [--saida DIR]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Data fixa para toda entrada do ZIP. Não é a data do commit de propósito:
# precisa ser constante para que o pacote seja idêntico byte a byte em
# qualquer máquina e em qualquer fuso.
DATA_FIXA = (1980, 1, 1, 0, 0, 0)

# Nada que corresponda a estes padrões entra no pacote, mesmo que por algum
# engano tenha sido versionado. A lista é uma segunda barreira: a primeira é o
# .gitignore. Segredo que vaza uma vez vaza para sempre.
PROIBIDOS = [
    r"(^|/)\.env($|\.)",            # .env, .env.local, .env.production...
    r"(^|/)\.env[^/]*$",
    r"(^|/)node_modules(/|$)",
    r"(^|/)\.next(/|$)",
    r"(^|/)\.vitest(/|$)",
    r"(^|/)coverage(/|$)",
    r"(^|/)\.supabase-test(/|$)",
    r"(^|/)supabase/\.(branches|temp)(/|$)",
    r"\.tsbuildinfo$",
    r"(^|/)\.DS_Store$",
    r"\.log$",
    r"(^|/)(secrets?|credenciais?)(/|$)",
    r"\.(pem|key|p12|pfx|keystore)$",
    r"(^|/)id_(rsa|ed25519)",
    # Dado real: planilhas do SIAPS e do PEC nunca acompanham o código.
    r"\.(xlsx|xls|xlsm|csv)$",
    r"(^|/)(dados|data)-reais?(/|$)",
]
PROIBIDOS_RX = [re.compile(p, re.IGNORECASE) for p in PROIBIDOS]

# Um arquivo versionado que contenha um destes marcadores derruba a geração.
# É uma verificação de conteúdo, não só de nome: um segredo colado dentro de um
# arquivo legítimo não seria pego pela lista acima.
MARCADORES_SEGREDO = [
    re.compile(rb"service_role"),
    re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(rb"\bsb_secret_[A-Za-z0-9_\-]{10,}"),
    re.compile(rb"\bsbp_[A-Za-z0-9]{30,}"),          # token de acesso Supabase
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{30,}"),    # token GitHub
    re.compile(rb"\bAIza[0-9A-Za-z_\-]{30,}"),       # chave Google
    re.compile(rb"GOCSPX-[A-Za-z0-9_\-]{10,}"),      # client secret Google
    re.compile(rb"\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\."),  # JWT
]

# Arquivos onde a palavra aparece legitimamente, por estar sendo *proibida*
# no código ou explicada na documentação.
ISENTOS_MARCADOR = {
    "src/config/env.ts",
    "tests/config/env.test.ts",
    "docs/registro/PRIVACIDADE_E_SEGURANCA.md",
    "docs/registro/TECNOLOGIAS.md",
    "docs/SECURITY_DEBT.md",
    "docs/IMPLEMENTATION_CONTRACT.md",
    "docs/VERIFICACAO_V3.md",
    "README.md",
    "scripts/gerar-pacote-registro.py",
}


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=RAIZ, check=True, capture_output=True, text=True
    ).stdout.strip()


def git_bytes(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args], cwd=RAIZ, check=True, capture_output=True
    ).stdout


def proibido(caminho: str) -> str | None:
    for rx in PROIBIDOS_RX:
        if rx.search(caminho):
            return rx.pattern
    return None


def contem_segredo(caminho: str, conteudo: bytes) -> str | None:
    if caminho in ISENTOS_MARCADOR:
        return None
    for rx in MARCADORES_SEGREDO:
        if rx.search(conteudo):
            return rx.pattern
    return None


def versoes_principais() -> dict[str, str]:
    pkg = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
    todas = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
    interesse = [
        "next", "react", "react-dom", "typescript", "zod",
        "@supabase/ssr", "@supabase/supabase-js", "tailwindcss",
        "vitest", "eslint", "xlsx",
    ]
    return {nome: todas[nome] for nome in interesse if nome in todas}


def main() -> int:
    ap = argparse.ArgumentParser(description="Gera o pacote de registro.")
    ap.add_argument("--saida", default="dist-registro",
                    help="diretório de saída (padrão: dist-registro)")
    args = ap.parse_args()

    if git("status", "--porcelain"):
        print("ERRO: há mudanças não commitadas. O pacote precisa corresponder\n"
              "      exatamente a um commit, senão o resumo não identifica nada.",
              file=sys.stderr)
        return 1

    commit = git("rev-parse", "HEAD")
    commit_curto = commit[:12]
    ramo = git("rev-parse", "--abbrev-ref", "HEAD")
    data_commit = git("show", "-s", "--format=%cI", "HEAD")
    gerado_em = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    arquivos = sorted(
        c for c in git("ls-files", "-z").split("\0") if c
    )

    incluidos: list[tuple[str, bytes, str]] = []
    excluidos: list[tuple[str, str]] = []

    for caminho in arquivos:
        motivo = proibido(caminho)
        if motivo:
            excluidos.append((caminho, motivo))
            continue
        conteudo = git_bytes("show", f"HEAD:{caminho}")
        achado = contem_segredo(caminho, conteudo)
        if achado:
            print(f"ERRO: possível segredo em {caminho} (padrão {achado!r}).\n"
                  "      A geração foi interrompida. Remova o segredo antes de\n"
                  "      empacotar — um pacote de registro é distribuído.",
                  file=sys.stderr)
            return 1
        incluidos.append((caminho, conteudo, hashlib.sha256(conteudo).hexdigest()))

    destino = RAIZ / args.saida
    destino.mkdir(parents=True, exist_ok=True)
    nome_base = f"cuidado-gestacao-aps-v3.0-{commit_curto}"
    caminho_zip = destino / f"{nome_base}.zip"

    with zipfile.ZipFile(caminho_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for caminho, conteudo, _ in incluidos:
            info = zipfile.ZipInfo(f"{nome_base}/{caminho}", date_time=DATA_FIXA)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            info.create_system = 3
            z.writestr(info, conteudo)

    sha_zip = hashlib.sha256(caminho_zip.read_bytes()).hexdigest()
    versoes = versoes_principais()

    linhas: list[str] = []
    a = linhas.append
    a("# Manifesto do pacote de registro")
    a("")
    a("Documento **gerado** por `scripts/gerar-pacote-registro.py`. Não editar à")
    a("mão: o valor deste manifesto está em ser derivado do conteúdo empacotado,")
    a("e não em concordar com ele.")
    a("")
    a("## Programa")
    a("")
    a("| Campo | Conteúdo |")
    a("|---|---|")
    a("| Nome | Cuidado na Gestação na APS |")
    a("| Versão | 3.0 |")
    a("| Desenvolvido por | Lucca Araújo |")
    a("| Programa institucional | PET-Saúde |")
    a("| Instituição | Universidade Federal de Campina Grande — UFCG |")
    a("| Localidade | Campina Grande — Paraíba, Brasil |")
    a("")
    a("## Identificação desta geração")
    a("")
    a("| Campo | Conteúdo |")
    a("|---|---|")
    a(f"| Commit | `{commit}` |")
    a(f"| Ramo | `{ramo}` |")
    a(f"| Data do commit | {data_commit} |")
    a(f"| Data da geração | {gerado_em} |")
    a(f"| Arquivo | `{caminho_zip.name}` |")
    a(f"| Tamanho | {caminho_zip.stat().st_size} bytes |")
    a(f"| **SHA-256 do pacote** | `{sha_zip}` |")
    a(f"| Arquivos incluídos | {len(incluidos)} |")
    a("")
    a("O pacote é reprodutível: gerar novamente a partir do mesmo commit produz")
    a("bytes idênticos e, portanto, o mesmo SHA-256. Toda entrada do ZIP tem data")
    a("fixa e ordem estável, e o conteúdo é lido do commit, não do diretório de")
    a("trabalho.")
    a("")
    a("Conferência:")
    a("")
    a("```")
    a(f"sha256sum {caminho_zip.name}")
    a(f"{sha_zip}  {caminho_zip.name}")
    a("```")
    a("")
    a("## Versões principais")
    a("")
    a("| Pacote | Versão |")
    a("|---|---|")
    for nome, versao in versoes.items():
        a(f"| `{nome}` | {versao} |")
    a("")
    a("## Exclusões aplicadas")
    a("")
    a("Segredos, dado real e artefatos de construção não acompanham o pacote. A")
    a("lista de arquivos vem de `git ls-files`, então nada não versionado entra;")
    a("os padrões abaixo são uma segunda barreira, aplicada por cima disso.")
    a("")
    a("```")
    for p in PROIBIDOS:
        a(p)
    a("```")
    a("")
    if excluidos:
        a("Arquivos versionados que casaram com algum padrão e ficaram de fora:")
        a("")
        for caminho, motivo in excluidos:
            a(f"- `{caminho}` — `{motivo}`")
    else:
        a("Nenhum arquivo versionado casou com os padrões de exclusão.")
    a("")
    a("Além disso, todo arquivo incluído é lido e verificado contra marcadores de")
    a("segredo — chave privada, token de provedor, JWT, chave `service_role`. Um")
    a("achado interrompe a geração em vez de produzir um pacote comprometido.")
    a("")
    a("## Arquivos e resumos")
    a("")
    a(f"{len(incluidos)} arquivos, em ordem estável. O resumo é do conteúdo do")
    a("arquivo no commit indicado.")
    a("")
    a("| # | Arquivo | SHA-256 |")
    a("|---|---|---|")
    for i, (caminho, _, sha) in enumerate(incluidos, start=1):
        a(f"| {i} | `{caminho}` | `{sha}` |")
    a("")

    corpo = "\n".join(linhas)
    sha_manifesto = hashlib.sha256(corpo.encode("utf-8")).hexdigest()
    corpo += (
        "## Resumo deste manifesto\n\n"
        "Resumo SHA-256 do conteúdo acima, calculado antes desta seção ser\n"
        "acrescentada — de modo que o manifesto possa declarar o próprio resumo\n"
        "sem circularidade:\n\n"
        f"```\n{sha_manifesto}\n```\n"
    )

    manifesto_pacote = destino / f"{nome_base}.MANIFESTO.md"
    manifesto_pacote.write_text(corpo, encoding="utf-8")
    (RAIZ / "docs" / "registro" / "MANIFESTO_REGISTRO.md").write_text(corpo, encoding="utf-8")

    print(f"pacote            {caminho_zip}")
    print(f"sha256            {sha_zip}")
    print(f"arquivos          {len(incluidos)}")
    print(f"excluidos         {len(excluidos)}")
    print(f"manifesto         {manifesto_pacote}")
    print(f"sha256 manifesto  {sha_manifesto}")
    print("")
    print("docs/registro/MANIFESTO_REGISTRO.md foi atualizado. Ele descreve o")
    print("commit anterior a si mesmo; commitá-lo muda o HEAD, e a próxima")
    print("geração passa a descrever esse novo commit. É o comportamento")
    print("esperado: o manifesto acompanha o pacote, e o pacote acompanha um")
    print("commit determinado.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
