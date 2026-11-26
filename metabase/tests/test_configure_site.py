"""Testes offline do ajustador HTTPS — nenhum segredo real e utilizado."""
import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "configure_site.py"
spec = importlib.util.spec_from_file_location("configure_site", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ConfigTests(unittest.TestCase):
    def test_hostname_sanitizado(self):
        self.assertEqual(module.validated_domain("BI.EXEMPLO.ORG"), "bi.exemplo.org")

    def test_hostname_inseguro_rejeitado(self):
        for value in ["http://bi.exemplo.org", "bi.exemplo.org:3000",
                      "bi.exemplo.org/path", "bi.exemplo.invalid", "-a.org",
                      "a.local", "bi.exemplo.org\nMB_SESSION_SECRET_KEY=roubo"]:
            with self.assertRaises(ValueError):
                module.validated_domain(value)

    def test_substitui_site_sem_alterar_segredos(self):
        sample = "MB_SITE_URL=http://localhost:3000\nMB_ENCRYPTION_SECRET_KEY=exemplo\nMB_SESSION_SECRET_KEY=exemplo2\n"
        out = module.update_settings(sample, "bi.exemplo.org")
        self.assertIn("MB_ENCRYPTION_SECRET_KEY=exemplo\n", out)
        self.assertIn("MB_SESSION_SECRET_KEY=exemplo2\n", out)
        self.assertIn("MB_SITE_URL=https://bi.exemplo.org\n", out)
        self.assertIn("METABASE_DOMAIN=bi.exemplo.org\n", out)


if __name__ == "__main__":
    unittest.main()
