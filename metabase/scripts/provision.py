#!/usr/bin/env python3
"""Instala perguntas e layout nativos no Metabase MAE APS, sem inicializar credenciais.

O primeiro administrador e a fonte de dados sao cadastrados na interface pelo responsavel.
Nao usar este arquivo para criar usuario ou alterar credenciais.
"""
import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "questions.json"
SOURCE_NAME = "MAE APS - SIAPS C3"
COLLECTION_NAME = "MAE APS - C3"


def api(method, route, body=None):
    """Conecta somente com uma API key informada em canal seguro pelo operador."""
    base = os.environ.get("METABASE_URL", "http://127.0.0.1:3000").rstrip("/")
    token = os.environ["METABASE_API_KEY"]
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(base + "/api" + route, data=data,
                  headers={"X-API-Key": token, "Content-Type": "application/json"},
                  method=method)
    try:
        with urlopen(req, timeout=35) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise RuntimeError("Metabase retornou HTTP %s em %s" % (exc.code, route)) from exc
    except URLError as exc:
        raise RuntimeError("Metabase indisponivel no endereco configurado") from exc


def records(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("data"), list):
        return data["data"]
    raise ValueError("Lista inesperada retornada pelo Metabase")


def find(items, name, model=None):
    return next((item for item in items if item.get("name") == name
                 and (model is None or item.get("model") == model)), None)


def validate(package):
    """Garante layout de grid nativo com cards reais e sem SQL fora das views."""
    qs = package["questions"]
    ids = [q["id"] for q in qs]
    names = [q["name"] for q in qs]
    if len(ids) != len(set(ids)) or len(names) != len(set(names)):
        raise ValueError("Perguntas duplicadas")
    tabs = package["tabs"]
    tab_ids = [t["id"] for t in tabs]
    if len(tabs) != 4 or len(tab_ids) != len(set(tab_ids)):
        raise ValueError("Abas inconsistentes")

    for q in qs:
        sql = q["sql"].upper().strip()
        if q["display"] not in {"scalar", "bar", "line", "table"}:
            raise ValueError("Tipo de visualizacao nao suportado")
        if not (sql.startswith("SELECT ") or sql.startswith("WITH ")) or ";" in sql or "--" in sql:
            raise ValueError("Somente SELECT sem multiplas instrucoes")
        if "ANALYTICS.DASHBOARD_" not in sql:
            raise ValueError("Pergunta fora das views de indicadores")

    occupied = set()
    placed = []
    for slot in package["layout"]:
        if slot["id"] not in ids or slot["tab"] not in tab_ids:
            raise ValueError("Cartao ou aba nao existe no manifesto")
        x, y, w, h = (slot[k] for k in ("col", "row", "w", "h"))
        if min(x, y) < 0 or not (0 < w <= 24 and h > 0) or x + w > 24:
            raise ValueError("Posicao fora da grade 24-colunas")
        for dx in range(x, x + w):
            for dy in range(y, y + h):
                key = (slot["tab"], dx, dy)
                if key in occupied:
                    raise ValueError("Cards sobrepostos na aba " + slot["tab"])
                occupied.add(key)
        placed.append(slot["id"])
    if sorted(placed) != sorted(ids):
        raise ValueError("Cada pergunta deve aparecer uma vez no layout")
    return qs


def layout_payload(package, saved_cards):
    """Cria uma unica chamada PUT com tabs e dashcards, sem apagar itens preexistentes."""
    tab_int = {tab["id"]: -(n + 1) for n, tab in enumerate(package["tabs"])}
    dashcards = []
    for n, slot in enumerate(package["layout"]):
        dashcards.append({
            "id": -(n + 1),
            "card_id": saved_cards[slot["id"]],
            "dashboard_tab_id": tab_int[slot["tab"]],
            "row": slot["row"], "col": slot["col"],
            "size_x": slot["w"], "size_y": slot["h"],
        })
    tabs = [{"id": tab_int[t["id"]], "name": t["title"]} for t in package["tabs"]]
    return {"tabs": tabs, "dashcards": dashcards}


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="valida JSON sem rede ou acesso ao banco")
    group.add_argument("--apply", action="store_true", help="instala em instancia ja inicializada")
    args = parser.parse_args()

    package = json.loads(SOURCE.read_text(encoding="utf-8"))
    qs = validate(package)
    if args.dry_run:
        payload = layout_payload(package, {q["id"]: i + 101 for i, q in enumerate(qs)})
        print("MAE APS: %s perguntas, %s abas, %s posicoes validas; sem acesso a rede." %
              (len(qs), len(payload["tabs"]), len(payload["dashcards"])))
        print("Abas: " + ", ".join(tab["title"] for tab in package["tabs"]))
        return

    if not os.environ.get("METABASE_API_KEY"):
        raise RuntimeError("API key ausente; use um gerenciador de segredos, nao salve no Git.")

    dbs = records(api("GET", "/database"))
    db = find(dbs, SOURCE_NAME)
    if db is None:
        raise RuntimeError("Cadastre a fonte " + SOURCE_NAME + " pelo navegador antes deste script.")
    db_id = db["id"]
    collections = records(api("GET", "/collection"))
    collection = find(collections, COLLECTION_NAME)
    if collection is None:
        collection = api("POST", "/collection", {
            "name": COLLECTION_NAME,
            "description": "Analises C3 para gestao, sem indicadores individuais.",
        })
        print("Colecao criada.")
    cid = collection["id"]
    items = records(api("GET", "/collection/%s/items" % cid))

    dash = find(items, package["name"], "dashboard")
    if dash is None:
        dash = api("POST", "/dashboard", {
            "name": package["name"], "description": package["description"],
            "collection_id": cid,
        })
        print("Dashboard vazio criado.")

    saved = {}
    for q in qs:
        card = find(items, q["name"], "card")
        if card is None:
            card = api("POST", "/card", {
                "name": q["name"], "type": "question",
                "description": "Indicadores agregados — fonte MAE APS",
                "display": q["display"],
                "visualization_settings": {},
                "collection_id": cid,
                "dataset_query": {
                    "database": db_id, "type": "native",
                    "native": {"query": q["sql"]},
                },
            })
            print("Pergunta criada: " + q["name"])
        saved[q["id"]] = card["id"]

    current = api("GET", "/dashboard/%s" % dash["id"])
    if current.get("dashcards") or current.get("tabs"):
        print("Dashboard ja possui conteudo. Nada foi removido ou reposicionado.")
        print("Nao sobrescrever layout existente automaticamente.")
    else:
        api("PUT", "/dashboard/%s" % dash["id"], layout_payload(package, saved))
        print("Dashboard criado com %s abas e %s analises." % (len(package["tabs"]), len(qs)))
    print("Dashboard ID %s. Conferir SQL, filtros, permissao, periodo e visualizacao na UI." % dash["id"])


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, KeyError) as exc:
        raise SystemExit("ERRO: " + str(exc))
