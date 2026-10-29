#!/usr/bin/env python3
"""Provisionamento inicial MAE APS no Metabase, depois da configuracao MANUAL do admin e do banco.

Uso sem rede: python3 scripts/provision.py --dry-run
Uso conectado: METABASE_API_KEY=<chave-do-gerenciador> python3 scripts/provision.py --apply

Nenhuma senha, token ou conexao de banco e criada pelo script. Nao substitui autorizacao,
firewall, TLS, RLS ou revisao de permissao no Metabase.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


def api(method, route, body=None):
    base = os.environ.get("METABASE_URL", "http://localhost:3000").rstrip("/")
    secret = os.environ["METABASE_API_KEY"]
    headers = {"X-API-Key": secret, "Content-Type": "application/json"}
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(base + "/api" + route, data=payload, headers=headers, method=method)
    try:
        with urlopen(request, timeout=35) as reply:
            return json.loads(reply.read().decode("utf-8"))
    except HTTPError as exc:
        # Evitar devolver texto de SQL, credenciais ou detalhes sensiveis do servidor nos logs.
        raise RuntimeError("Metabase retornou HTTP %s em %s" % (exc.code, route)) from exc
    except URLError as exc:
        raise RuntimeError("Metabase indisponivel em %s" % base) from exc


def records(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return data["data"]
    raise RuntimeError("Formato de listagem inesperado na API Metabase")


def find(items, name, model=None):
    return next((item for item in items if item.get("name") == name
                 and (model is None or item.get("model") == model)), None)


def main():
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="validacao sem API e sem dados")
    mode.add_argument("--apply", action="store_true", help="cria dashboard e perguntas quando nao existem")
    args = parser.parse_args()

    package = json.loads((Path(__file__).resolve().parents[1] / "questions.json").read_text("utf-8"))
    questions = package["questions"]
    assert len(questions) == 6 and len({q["name"] for q in questions}) == 6
    for q in questions:
        if q["display"] not in ("line", "bar", "table"):
            raise RuntimeError("Tipo de visualizacao inesperado: " + q["id"])
        if "analytics." not in q["sql"] or ";" in q["sql"]:
            raise RuntimeError("SQL inicial fora do escopo analytics: " + q["id"])
    if args.dry_run:
        print("Pacote MAE APS valido: 6 perguntas; nenhum acesso ao Metabase realizado.")
        for q in questions:
            print(" - " + q["name"])
        return

    if not os.environ.get("METABASE_API_KEY"):
        raise RuntimeError("Configure METABASE_API_KEY em seu shell seguro; nao salve no Git.")

    dbs = records(api("GET", "/database"))
    db = find(dbs, "MAE APS - SIAPS C3")
    if not db:
        raise RuntimeError("Cadastre antes, manualmente, o banco MAE APS - SIAPS C3 com mae_metabase_reader.")
    dbid = db["id"]

    collections = records(api("GET", "/collection"))
    collection = find(collections, "MAE APS - C3")
    if collection is None:
        collection = api("POST", "/collection", {
            "name": "MAE APS - C3",
            "description": "Indicadores agregados C3; acesso restrito a equipe gestora.",
        })
        print("Colecao criada.")
    cid = collection["id"]
    existing = records(api("GET", "/collection/" + str(cid) + "/items"))

    dashboard = find(existing, package["name"], "dashboard")
    if dashboard is None:
        dashboard = api("POST", "/dashboard", {
            "name": package["name"],
            "description": package["description"],
            "collection_id": cid,
        })
        print("Dashboard criado.")

    card_ids = []
    for question in questions:
        card = find(existing, question["name"], "card")
        if card is None:
            card = api("POST", "/card", {
                "name": question["name"],
                "type": "question",
                "description": "Dados SIAPS agregados do MAE APS",
                "display": question["display"],
                "visualization_settings": {},
                "collection_id": cid,
                "dataset_query": {
                    "database": dbid,
                    "type": "native",
                    "native": {"query": question["sql"]},
                },
            })
            print("Pergunta criada: " + question["name"])
        card_ids.append(card["id"])

    dash_id = dashboard["id"]
    loaded = api("GET", "/dashboard/" + str(dash_id))
    if loaded.get("dashcards"):
        print("Dashboard ja possui itens. Layout existente mantido; nenhuma remocao automatica.")
    else:
        layout = [
            {"id": -(n + 1), "card_id": card_id, "row": (n // 2) * 6,
             "col": (n % 2) * 12, "size_x": 12, "size_y": 6}
            for n, card_id in enumerate(card_ids)
        ]
        api("PUT", "/dashboard/" + str(dash_id), {"dashcards": layout})
        print("Seis graficos adicionados ao dashboard.")

    print("Pacote provisionado. Dashboard ID: %s. Revisar filtros, acesso e numeros antes de uso." % dash_id)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError, AssertionError) as exc:
        raise SystemExit("ERRO: " + str(exc))
