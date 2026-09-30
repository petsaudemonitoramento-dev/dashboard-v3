import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

import { E2E_PASSWORD, E2E_USERS } from "./support/auth";
import { assertSafeE2EEnvironment } from "./support/environment";

type Role = keyof typeof E2E_USERS;
type AuthAdminClient = { auth: ReturnType<typeof createClient>["auth"] };

const SEED_HASH = "e".repeat(64);
const DISTRICTS = [
  { id: 31_001, code: "E2E-NORTE", name: "E2E Distrito Norte" },
  { id: 31_002, code: "E2E-SUL", name: "E2E Distrito Sul" },
] as const;

const ROWS = [
  [19, "9990001", "E2E UBS Alfa", "UBS", "9990000001", "E2E Equipe Alfa 1", "eSF", 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 110, 3, 36.67],
  [20, "9990001", "E2E UBS Alfa", "UBS", "9990000002", "E2E Equipe Alfa 2", "eSF", 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100, 3, 33.33],
  [21, "9990002", "E2E UBS Beta", "UBS", "9990000003", "E2E Equipe Beta", "eSF", 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 119, 3, 39.67],
  [22, "9990003", "E2E UBS Sem Distrito", "UBS", "9990000004", "E2E Equipe Sem Distrito", "eSF", 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100, 3, 33.33],
] as const;

async function findUser(
  admin: AuthAdminClient,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (result.error) throw result.error;
    const found = result.data.users.find((user) => user.email === email);
    if (found) return found;
    if (result.data.users.length < 100) return null;
  }
  throw new Error("A busca de usuários E2E excedeu o limite esperado.");
}

async function ensureUser(
  admin: AuthAdminClient,
  sql: postgres.Sql,
  role: Role,
) {
  const email = E2E_USERS[role];
  const existing = await findUser(admin, email);
  const result = existing
    ? await admin.auth.admin.updateUserById(existing.id, {
        email_confirm: true,
        password: E2E_PASSWORD,
      })
    : await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: E2E_PASSWORD,
      });

  if (result.error || !result.data.user) {
    throw result.error ?? new Error(`Não foi possível preparar ${email}.`);
  }

  const userId = result.data.user.id;
  await sql`
    insert into app.profiles (user_id, email, role, active)
    values (${userId}, ${email}, ${role}::app.user_role, true)
    on conflict (user_id) do update
      set email = excluded.email,
          role = excluded.role,
          active = true,
          updated_at = now()
  `;
  return userId;
}

export default async function globalSetup() {
  const { databaseUrl, supabaseUrl } = assertSafeE2EEnvironment();
  const serviceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const userIds = {
      admin: await ensureUser(admin, sql, "admin"),
      gestao: await ensureUser(admin, sql, "gestao"),
      leitura: await ensureUser(admin, sql, "leitura"),
    };

    await sql.begin(async (transaction) => {
      await transaction`
        delete from analytics.c3_team_monthly
        where source_import_id in (
          select id from siaps.imports where filename like 'e2e-%'
        )
      `;
      await transaction`
        delete from siaps.quality_rows
        where import_id in (
          select id from siaps.imports where filename like 'e2e-%'
        )
      `;
      await transaction`delete from siaps.imports where filename like 'e2e-%'`;

      for (const district of DISTRICTS) {
        await transaction`
          insert into core.districts (id, code, name, active)
          values (${district.id}, ${district.code}, ${district.name}, true)
          on conflict (id) do update
            set code = excluded.code, name = excluded.name, active = true
        `;
      }

      for (const row of ROWS) {
        await transaction`
          insert into core.establishments
            (cnes, name, establishment_type, active, first_seen_competency, last_seen_competency)
          values (${row[1]}, ${row[2]}, ${row[3]}, true, '2099-01-01', '2099-01-01')
          on conflict (cnes) do update
            set name = excluded.name,
                establishment_type = excluded.establishment_type,
                active = true
        `;
        await transaction`
          insert into core.teams
            (ine, name, team_type, active, first_seen_competency, last_seen_competency)
          values (${row[4]}, ${row[5]}, ${row[6]}, true, '2099-01-01', '2099-01-01')
          on conflict (ine) do update
            set name = excluded.name,
                team_type = excluded.team_type,
                active = true
        `;
      }

      await transaction`
        delete from core.establishment_district_history
        where establishment_id in (
          select id from core.establishments where cnes in ('9990001', '9990002', '9990003')
        )
      `;
      await transaction`
        insert into core.establishment_district_history
          (establishment_id, district_id, valid_from, source, notes)
        select id, 31001, '2099-01-01', 'e2e', 'Fixture Playwright local'
        from core.establishments where cnes = '9990001'
      `;
      await transaction`
        insert into core.establishment_district_history
          (establishment_id, district_id, valid_from, source, notes)
        select id, 31002, '2099-01-01', 'e2e', 'Fixture Playwright local'
        from core.establishments where cnes = '9990002'
      `;
    });

    const metadata = {
      filename: "e2e-dashboard-seed.xlsx",
      file_sha256: SEED_HASH,
      competency: "2099-01-01",
      indicator_code: "C3",
      indicator_name: "Cuidado na Gestação e Puerpério",
      municipality_ibge: "250400",
      municipality_name: "CAMPINA GRANDE",
      uf: "PB",
      source_status: "preliminar",
      parser_version: "mae-aps-e2e/1.0.0",
      rows_total: ROWS.length,
      uploaded_by: userIds.gestao,
    };
    const published = await admin.rpc("publish_siaps_c3_v1", {
      p_metadata: metadata,
      p_rows: ROWS,
    });
    if (published.error) throw published.error;
  } finally {
    await sql.end({ timeout: 5 });
  }
}
