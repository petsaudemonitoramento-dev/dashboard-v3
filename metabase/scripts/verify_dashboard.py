#!/usr/bin/env python3
"""Verificacao somente leitura de colecao/dashboard Metabase apos setup humano.

Requer METABASE_API_KEY em ambiente seguro e METABASE_URL configurado.
Nao tenta fazer bootstrap de conta, fonte de dados nem guest embed.
"""
import json
from pathlib import Path

from provision import api, find, records, COLLECTION_NAME, SOURCE_NAME


def main():
    manifest = json.loads((Path(__file__).resolve().parents[1] / "questions.json").read_text("utf-8"))
    db = find(records(api("GET", "/database")), SOURCE_NAME)
    if not db:
        raise SystemExit("FALHA: fonte MAE APS - SIAPS C3 nao cadastrada.")
    collection = find(records(api("GET", "/collection")), COLLECTION_NAME)
    if not collection:
        raise SystemExit("FALHA: colecao nao existe.")
    items = records(api("GET", "/collection/%s/items" % collection["id"]))
    dashboard = find(items, manifest["name"], "dashboard")
    if not dashboard:
        raise SystemExit("FALHA: dashboard de inteligencia nao existe.")
    expected_names = {q["name"] for q in manifest["questions"]}
    card_names = {item["name"] for item in items if item.get("model") == "card" and item.get("name") in expected_names}
    missing = expected_names - card_names
    if missing:
        raise SystemExit("FALHA: faltam %d perguntas previstas." % len(missing))
    complete = api("GET", "/dashboard/%s" % dashboard["id"])
    tabs = complete.get("tabs", [])
    cards = complete.get("dashcards", [])
    if len(tabs) != len(manifest["tabs"]):
        raise SystemExit("FALHA: numero de abas diverge do manifesto.")
    if len(cards) != len(manifest["questions"]):
        raise SystemExit("FALHA: numero de cards difere do manifesto.")
    if {t["name"] for t in tabs} != {t["title"] for t in manifest["tabs"]}:
        raise SystemExit("FALHA: nomes de abas diferentes do projeto.")
    print("OK — Metabase possui %d perguntas e %d abas." % (len(cards), len(tabs)))
    print("Dashboard ID: %s (usar no segredo METABASE_DASHBOARD_ID da Vercel)." % dashboard["id"])
    print("ATENCAO: isso nao valida numeros, guest embed publicado, TLS ou autorizacao do MAE APS.")


if __name__ == "__main__":
    main()
