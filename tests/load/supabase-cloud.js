/* global __ENV */

import http from "k6/http";
import { check, group, sleep } from "k6";

const EXPECTED_PROJECT_HOST = "nyexakdyxtstcyycmlng.supabase.co";

const PROFILES = Object.freeze({
  "10": { duration: "1m", vus: 10 },
  "50": { duration: "2m", vus: 50 },
});

function required(name) {
  const value = String(__ENV[name] || "").trim();
  if (!value) throw new Error(`${name} é obrigatório.`);
  return value;
}

function validateCloudTarget() {
  if (__ENV.K6_ALLOW_CLOUD !== "READ_ONLY_AUTHORIZED") {
    throw new Error(
      "O teste cloud exige K6_ALLOW_CLOUD=READ_ONLY_AUTHORIZED.",
    );
  }

  const raw = required("K6_SUPABASE_URL").replace(/\/$/, "");
  const expectedOrigin = `https://${EXPECTED_PROJECT_HOST}`;

  if (raw !== expectedOrigin) {
    throw new Error(
      `K6_SUPABASE_URL deve ser exatamente ${expectedOrigin}.`,
    );
  }

  return expectedOrigin;
}

const baseUrl = validateCloudTarget();
const profileName = String(__ENV.K6_PROFILE || "10");
const profile = PROFILES[profileName];
if (!profile) {
  throw new Error("K6_PROFILE deve ser 10 ou 50 para o teste cloud.");
}

const publishableKey = required("K6_SUPABASE_ANON_KEY");
const testEmail = required("K6_TEST_EMAIL");
const testPassword = required("K6_TEST_PASSWORD");

export const options = {
  scenarios: {
    [`gestores_cloud_${profileName}`]: {
      executor: "constant-vus",
      vus: profile.vus,
      duration: profile.duration,
      gracefulStop: "10s",
    },
  },
  thresholds: {
    checks: ["rate>0.99"],
    http_req_failed: ["rate<0.01"],
  },
};

export function setup() {
  const login = http.post(
    `${baseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
    {
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      responseCallback: http.expectedStatuses(200),
      tags: { endpoint: "auth-setup" },
    },
  );

  if (login.status !== 200) {
    throw new Error(
      `Falha ao autenticar a conta sintética de Gestão: HTTP ${login.status}.`,
    );
  }

  const body = login.json();
  if (!body?.access_token) {
    throw new Error("O Supabase não retornou access_token para a conta de teste.");
  }

  return { accessToken: body.access_token };
}

function headers(accessToken) {
  return {
    apikey: publishableKey,
    Authorization: `Bearer ${accessToken}`,
    "Accept-Profile": "analytics",
  };
}

function read(path, accessToken, endpoint) {
  return http.get(`${baseUrl}/rest/v1/${path}`, {
    headers: headers(accessToken),
    responseCallback: http.expectedStatuses(200),
    tags: { endpoint },
  });
}

export default function cloudReadScenario(data) {
  group("dashboard C3 somente leitura", () => {
    const competencies = read(
      "dashboard_competencies?select=competency,points_total,denominator,c3&order=competency.desc&limit=12",
      data.accessToken,
      "competencies",
    );
    check(competencies, {
      "competências respondem 200": (response) => response.status === 200,
      "competências retornam JSON": (response) => {
        try {
          return Array.isArray(response.json());
        } catch {
          return false;
        }
      },
    });

    const districts = read(
      "dashboard_c3_district_monthly?select=competency,district_id,district_name,points_total,denominator,c3,establishments,teams&order=competency.desc&limit=100",
      data.accessToken,
      "districts",
    );
    check(districts, {
      "distritos respondem 200": (response) => response.status === 200,
    });

    const teams = read(
      "dashboard_c3_team_monthly?select=competency,district_id,establishment_id,team_id,denominator,points_total,c3,classification&order=competency.desc&limit=250",
      data.accessToken,
      "teams",
    );
    check(teams, {
      "equipes respondem 200": (response) => response.status === 200,
    });
  });

  sleep(1);
}
