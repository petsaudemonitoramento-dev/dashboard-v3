/* global __ENV */

import http from "k6/http";
import { check, group, sleep } from "k6";

import { resolveLoadProfile, validateLoadTarget } from "./safety.js";

const baseUrl = validateLoadTarget(__ENV);
const profile = resolveLoadProfile(__ENV.K6_PROFILE);
const authCookie = String(__ENV.K6_AUTH_COOKIE || "").trim();

export const options = {
  scenarios: {
    [`usuarios_${profile.name}`]: {
      duration: profile.duration,
      executor: "constant-vus",
      gracefulStop: "10s",
      vus: profile.vus,
    },
  },
  thresholds: {
    checks: ["rate>0.95"],
    http_req_failed: ["rate<0.05"],
  },
};

const loginStatus = http.expectedStatuses(200);
const redirectStatus = http.expectedStatuses(302, 303, 307, 308);
const unauthorizedStatus = http.expectedStatuses(401);
const dashboardStatus = http.expectedStatuses(200);

export default function loadScenario() {
  group("superficies publicas e protecao", () => {
    const login = http.get(`${baseUrl}/entrar`, {
      responseCallback: loginStatus,
      tags: { endpoint: "login" },
    });
    check(login, {
      "login responde 200": (response) => response.status === 200,
      "login contém o formulário": (response) => String(response.body).includes("Boas-vindas"),
    });

    const protectedRoute = http.get(`${baseUrl}/sistema/gestao`, {
      redirects: 0,
      responseCallback: redirectStatus,
      tags: { endpoint: "protected-route" },
    });
    check(protectedRoute, {
      "rota protegida redireciona": (response) => [302, 303, 307, 308].includes(response.status),
      "redirecionamento aponta para login": (response) => String(response.headers.Location || "").includes("/entrar"),
    });

    const importApi = http.post(`${baseUrl}/api/importacoes`, JSON.stringify({
      competency: "2099-01-01",
      fileSha256: "0".repeat(64),
      filename: "k6-check.xlsx",
      mode: "check",
      rows: [],
    }), {
      headers: { "Content-Type": "application/json" },
      responseCallback: unauthorizedStatus,
      tags: { endpoint: "import-api-unauthenticated" },
    });
    check(importApi, {
      "API recusa sessão ausente": (response) => response.status === 401,
    });
  });

  if (authCookie) {
    group("dashboard autenticado", () => {
      const dashboard = http.get(`${baseUrl}/sistema/gestao`, {
        headers: { Cookie: authCookie },
        responseCallback: dashboardStatus,
        tags: { endpoint: "dashboard-authenticated" },
      });
      check(dashboard, {
        "dashboard responde 200": (response) => response.status === 200,
        "dashboard contém o título": (response) => String(response.body).includes("Olá, Gestão de Saúde"),
      });
    });
  }

  sleep(1);
}
