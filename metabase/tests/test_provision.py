#!/usr/bin/env python3
"""Testes offline do instalador Metabase. Sem API, rede, credenciais nem banco."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "provision.py"
SPEC = importlib.util.spec_from_file_location("mae_provision", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
PACKAGE = json.loads((SCRIPT.parents[1] / "questions.json").read_text("utf8"))


class ManifestTests(unittest.TestCase):
    def test_json_integrity_and_layout(self):
        questions = MODULE.validate(PACKAGE)
        self.assertEqual(len(questions), 13)
        self.assertEqual(len(PACKAGE["tabs"]), 4)
        layout = MODULE.layout_payload(PACKAGE, {q["id"]: i + 20 for i, q in enumerate(questions)})
        self.assertEqual(len(layout["dashcards"]), 13)
        self.assertEqual({t["name"] for t in layout["tabs"]},
                         {"Tendências", "Investigação territorial", "Práticas A–K", "Qualidade dos dados"})

    def test_duplicate_cards_rejected(self):
        broken = copy.deepcopy(PACKAGE)
        broken["questions"].append(copy.deepcopy(broken["questions"][0]))
        with self.assertRaises(ValueError):
            MODULE.validate(broken)

    def test_overlapping_cards_rejected(self):
        broken = copy.deepcopy(PACKAGE)
        broken["layout"][1]["col"] = broken["layout"][0]["col"]
        with self.assertRaises(ValueError):
            MODULE.validate(broken)

    def test_non_select_query_rejected(self):
        broken = copy.deepcopy(PACKAGE)
        broken["questions"][0]["sql"] = "DELETE FROM analytics.dashboard_competencies"
        with self.assertRaises(ValueError):
            MODULE.validate(broken)


class ProvisionTests(unittest.TestCase):
    def test_fresh_install_and_repeat_do_not_replace_existing_dashboard(self):
        db_id, collection_id, dashboard_id = 1, 7, 29
        items = []
        dashcards = []
        tabs = []
        writes = []

        def fake_api(method, route, body=None):
            writes.append((method, route))
            if method == "GET" and route == "/database":
                return [{"id": db_id, "name": MODULE.SOURCE_NAME}]
            if method == "GET" and route == "/collection":
                return [{"id": collection_id, "name": MODULE.COLLECTION_NAME}]
            if method == "GET" and route == "/collection/7/items":
                return items[:]
            if method == "POST" and route == "/dashboard":
                item = {"id": dashboard_id, "name": body["name"], "model": "dashboard"}
                items.append(item)
                return item
            if method == "POST" and route == "/card":
                item = {"id": 100 + len([x for x in items if x.get("model") == "card"]),
                        "name": body["name"], "model": "card"}
                items.append(item)
                return item
            if method == "GET" and route == "/dashboard/29":
                return {"dashcards": dashcards[:], "tabs": tabs[:]}
            if method == "PUT" and route == "/dashboard/29":
                dashcards.extend(body["dashcards"])
                tabs.extend(body["tabs"])
                return {"id": dashboard_id}
            raise AssertionError("API inesperada: %s %s" % (method, route))

        with patch.object(MODULE, "api", side_effect=fake_api), \
             patch.dict(os.environ, {"METABASE_API_KEY": "test-only"}, clear=False), \
             patch.object(sys, "argv", ["provision.py", "--apply"]):
            MODULE.main()
            first_writes = len([x for x in writes if x[0] in ("POST", "PUT")])
            self.assertEqual(first_writes, 15)  # 1 dashboard, 13 perguntas, 1 layout
            self.assertEqual(len(dashcards), 13)
            self.assertEqual(len(tabs), 4)
            MODULE.main()
            self.assertEqual(len([x for x in writes if x[0] in ("POST", "PUT")]), first_writes)
            self.assertEqual(len(dashcards), 13)


if __name__ == "__main__":
    unittest.main()
