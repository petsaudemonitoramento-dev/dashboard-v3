-- Snapshot estrutural local da arquitetura de Gestao do Supabase V3.
-- Gerado de metadados de catalogo em 2026-09-18; nao contem dados SIAPS nem a coorte piloto.
-- Nao aplicar automaticamente no projeto remoto: ele ja possui historico e dados posteriores.

create schema if not exists app;
create schema if not exists core;
create schema if not exists siaps;
create schema if not exists analytics;
create schema if not exists study;
create schema if not exists audit;
create type app.user_role as enum ('admin', 'gestao', 'leitura');

create table analytics.c3_practice_counts (
  fact_id bigint not null,
  practice_code character(1) not null,
  fulfilled integer not null
);

create table analytics.c3_team_monthly (
  id bigint generated always as identity not null,
  source_import_id uuid not null,
  competency date not null,
  team_id uuid not null,
  establishment_id uuid not null,
  district_id smallint,
  denominator integer not null,
  points_total numeric(14,2) not null,
  official_ratio numeric(10,4),
  is_current boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table app.profiles (
  user_id uuid not null,
  email text not null,
  role app.user_role default 'leitura'::app.user_role not null,
  active boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table audit.events (
  id bigint generated always as identity not null,
  actor_user_id uuid,
  event_type text not null,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb not null,
  occurred_at timestamp with time zone default now() not null
);

create table core.districts (
  id smallint not null,
  code text not null,
  name text not null,
  active boolean default true not null
);

create table core.establishment_district_history (
  id bigint generated always as identity not null,
  establishment_id uuid not null,
  district_id smallint not null,
  valid_from date not null,
  valid_to date,
  source text default 'manual'::text not null,
  notes text
);

create table core.establishments (
  id uuid default gen_random_uuid() not null,
  cnes text not null,
  name text not null,
  establishment_type text,
  active boolean default true not null,
  first_seen_competency date,
  last_seen_competency date,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table core.team_establishment_history (
  id bigint generated always as identity not null,
  team_id uuid not null,
  establishment_id uuid not null,
  valid_from date not null,
  valid_to date,
  source text default 'siaps'::text not null
);

create table core.teams (
  id uuid default gen_random_uuid() not null,
  ine text not null,
  name text,
  team_type text,
  active boolean default true not null,
  first_seen_competency date,
  last_seen_competency date,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table siaps.imports (
  id uuid default gen_random_uuid() not null,
  filename text not null,
  file_sha256 text not null,
  competency date not null,
  indicator_code text default 'C3'::text not null,
  indicator_name text default 'Cuidado na Gestação e Puerpério'::text not null,
  municipality_ibge text default '250400'::text not null,
  municipality_name text default 'CAMPINA GRANDE'::text not null,
  uf character(2) default 'PB'::bpchar not null,
  source_status text not null,
  generated_at timestamp with time zone,
  source_filters jsonb default '{}'::jsonb not null,
  parser_version text,
  status text default 'recebido'::text not null,
  rows_total integer default 0 not null,
  uploaded_by uuid,
  uploaded_at timestamp with time zone default now() not null,
  published_at timestamp with time zone
);

create table siaps.quality_rows (
  id bigint generated always as identity not null,
  import_id uuid not null,
  file_row integer not null,
  cnes text not null,
  establishment_name text not null,
  establishment_type text,
  ine text not null,
  team_name text,
  team_type text,
  practice_a integer,
  practice_b integer,
  practice_c integer,
  practice_d integer,
  practice_e integer,
  practice_f integer,
  practice_g integer,
  practice_h integer,
  practice_i integer,
  practice_j integer,
  practice_k integer,
  points_total numeric(14,2),
  denominator integer,
  official_ratio numeric(10,4),
  raw_payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null
);

create table study.cohort_members (
  cohort_id uuid not null,
  team_id uuid not null,
  district_id smallint,
  stratum text,
  notes text
);

create table study.cohorts (
  id uuid default gen_random_uuid() not null,
  code text not null,
  name text not null,
  description text,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

alter table analytics.c3_practice_counts add constraint c3_practice_counts_fulfilled_check CHECK ((fulfilled >= 0));
alter table analytics.c3_practice_counts add constraint c3_practice_counts_pkey PRIMARY KEY (fact_id, practice_code);
alter table analytics.c3_practice_counts add constraint c3_practice_counts_practice_code_check CHECK (((practice_code >= 'A'::bpchar) AND (practice_code <= 'K'::bpchar)));
alter table analytics.c3_team_monthly add constraint c3_team_monthly_competency_check CHECK ((competency = (date_trunc('month'::text, (competency)::timestamp with time zone))::date));
alter table analytics.c3_team_monthly add constraint c3_team_monthly_denominator_check CHECK ((denominator >= 0));
alter table analytics.c3_team_monthly add constraint c3_team_monthly_pkey PRIMARY KEY (id);
alter table analytics.c3_team_monthly add constraint c3_team_monthly_points_total_check CHECK ((points_total >= (0)::numeric));
alter table analytics.c3_team_monthly add constraint c3_team_monthly_source_import_id_team_id_key UNIQUE (source_import_id, team_id);
alter table app.profiles add constraint profiles_pkey PRIMARY KEY (user_id);
alter table audit.events add constraint events_pkey PRIMARY KEY (id);
alter table core.districts add constraint districts_code_key UNIQUE (code);
alter table core.districts add constraint districts_name_key UNIQUE (name);
alter table core.districts add constraint districts_pkey PRIMARY KEY (id);
alter table core.establishment_district_history add constraint establishment_district_history_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)));
alter table core.establishment_district_history add constraint establishment_district_history_pkey PRIMARY KEY (id);
alter table core.establishments add constraint establishments_cnes_check CHECK ((cnes ~ '^[0-9]{7}$'::text));
alter table core.establishments add constraint establishments_cnes_key UNIQUE (cnes);
alter table core.establishments add constraint establishments_pkey PRIMARY KEY (id);
alter table core.team_establishment_history add constraint team_establishment_history_check CHECK (((valid_to IS NULL) OR (valid_to >= valid_from)));
alter table core.team_establishment_history add constraint team_establishment_history_pkey PRIMARY KEY (id);
alter table core.teams add constraint teams_ine_check CHECK ((ine ~ '^[0-9]{10}$'::text));
alter table core.teams add constraint teams_ine_key UNIQUE (ine);
alter table core.teams add constraint teams_pkey PRIMARY KEY (id);
alter table siaps.imports add constraint imports_competency_check CHECK ((competency = (date_trunc('month'::text, (competency)::timestamp with time zone))::date));
alter table siaps.imports add constraint imports_file_sha256_check CHECK ((file_sha256 ~ '^[a-f0-9]{64}$'::text));
alter table siaps.imports add constraint imports_file_sha256_key UNIQUE (file_sha256);
alter table siaps.imports add constraint imports_pkey PRIMARY KEY (id);
alter table siaps.imports add constraint imports_rows_total_check CHECK ((rows_total >= 0));
alter table siaps.imports add constraint imports_source_status_check CHECK ((source_status = ANY (ARRAY['preliminar'::text, 'definitivo'::text])));
alter table siaps.imports add constraint imports_status_check CHECK ((status = ANY (ARRAY['recebido'::text, 'validado'::text, 'publicado'::text, 'rejeitado'::text])));
alter table siaps.quality_rows add constraint quality_rows_cnes_check CHECK ((cnes ~ '^[0-9]{7}$'::text));
alter table siaps.quality_rows add constraint quality_rows_denominator_check CHECK (((denominator IS NULL) OR (denominator >= 0)));
alter table siaps.quality_rows add constraint quality_rows_file_row_check CHECK ((file_row > 0));
alter table siaps.quality_rows add constraint quality_rows_import_id_file_row_key UNIQUE (import_id, file_row);
alter table siaps.quality_rows add constraint quality_rows_ine_check CHECK ((ine ~ '^[0-9]{10}$'::text));
alter table siaps.quality_rows add constraint quality_rows_pkey PRIMARY KEY (id);
alter table siaps.quality_rows add constraint quality_rows_points_total_check CHECK (((points_total IS NULL) OR (points_total >= (0)::numeric)));
alter table siaps.quality_rows add constraint quality_rows_practice_a_check CHECK (((practice_a IS NULL) OR (practice_a >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_b_check CHECK (((practice_b IS NULL) OR (practice_b >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_c_check CHECK (((practice_c IS NULL) OR (practice_c >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_d_check CHECK (((practice_d IS NULL) OR (practice_d >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_e_check CHECK (((practice_e IS NULL) OR (practice_e >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_f_check CHECK (((practice_f IS NULL) OR (practice_f >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_g_check CHECK (((practice_g IS NULL) OR (practice_g >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_h_check CHECK (((practice_h IS NULL) OR (practice_h >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_i_check CHECK (((practice_i IS NULL) OR (practice_i >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_j_check CHECK (((practice_j IS NULL) OR (practice_j >= 0)));
alter table siaps.quality_rows add constraint quality_rows_practice_k_check CHECK (((practice_k IS NULL) OR (practice_k >= 0)));
alter table study.cohort_members add constraint cohort_members_pkey PRIMARY KEY (cohort_id, team_id);
alter table study.cohorts add constraint cohorts_code_key UNIQUE (code);
alter table study.cohorts add constraint cohorts_pkey PRIMARY KEY (id);
alter table analytics.c3_practice_counts add constraint c3_practice_counts_fact_id_fkey FOREIGN KEY (fact_id) REFERENCES analytics.c3_team_monthly(id) ON DELETE CASCADE;
alter table analytics.c3_team_monthly add constraint c3_team_monthly_district_id_fkey FOREIGN KEY (district_id) REFERENCES core.districts(id);
alter table analytics.c3_team_monthly add constraint c3_team_monthly_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES core.establishments(id);
alter table analytics.c3_team_monthly add constraint c3_team_monthly_source_import_id_fkey FOREIGN KEY (source_import_id) REFERENCES siaps.imports(id) ON DELETE RESTRICT;
alter table analytics.c3_team_monthly add constraint c3_team_monthly_team_id_fkey FOREIGN KEY (team_id) REFERENCES core.teams(id);
alter table app.profiles add constraint profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table audit.events add constraint events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id);
alter table core.establishment_district_history add constraint establishment_district_history_district_id_fkey FOREIGN KEY (district_id) REFERENCES core.districts(id);
alter table core.establishment_district_history add constraint establishment_district_history_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES core.establishments(id) ON DELETE CASCADE;
alter table core.team_establishment_history add constraint team_establishment_history_establishment_id_fkey FOREIGN KEY (establishment_id) REFERENCES core.establishments(id) ON DELETE CASCADE;
alter table core.team_establishment_history add constraint team_establishment_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES core.teams(id) ON DELETE CASCADE;
alter table siaps.imports add constraint imports_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);
alter table siaps.quality_rows add constraint quality_rows_import_id_fkey FOREIGN KEY (import_id) REFERENCES siaps.imports(id) ON DELETE CASCADE;
alter table study.cohort_members add constraint cohort_members_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES study.cohorts(id) ON DELETE CASCADE;
alter table study.cohort_members add constraint cohort_members_district_id_fkey FOREIGN KEY (district_id) REFERENCES core.districts(id);
alter table study.cohort_members add constraint cohort_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES core.teams(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX ux_c3_current_team_competency ON analytics.c3_team_monthly USING btree (team_id, competency) WHERE is_current;
CREATE INDEX ix_c3_competency ON analytics.c3_team_monthly USING btree (competency DESC);
CREATE INDEX ix_c3_district_competency ON analytics.c3_team_monthly USING btree (district_id, competency DESC);
CREATE INDEX ix_c3_establishment_competency ON analytics.c3_team_monthly USING btree (establishment_id, competency DESC);
CREATE INDEX ix_audit_events_occurred ON audit.events USING btree (occurred_at DESC);
CREATE INDEX ix_audit_actor ON audit.events USING btree (actor_user_id);
CREATE UNIQUE INDEX ux_establishment_district_current ON core.establishment_district_history USING btree (establishment_id) WHERE (valid_to IS NULL);
CREATE INDEX ix_establishment_district_district ON core.establishment_district_history USING btree (district_id);
CREATE UNIQUE INDEX ux_team_establishment_current ON core.team_establishment_history USING btree (team_id) WHERE (valid_to IS NULL);
CREATE INDEX ix_team_establishment_establishment ON core.team_establishment_history USING btree (establishment_id);
CREATE INDEX ix_siaps_imports_competency ON siaps.imports USING btree (competency DESC);
CREATE INDEX ix_imports_uploaded_by ON siaps.imports USING btree (uploaded_by);
CREATE INDEX ix_quality_rows_import ON siaps.quality_rows USING btree (import_id);
CREATE INDEX ix_quality_rows_ine ON siaps.quality_rows USING btree (ine);
CREATE INDEX ix_quality_rows_cnes ON siaps.quality_rows USING btree (cnes);
CREATE INDEX ix_cohort_members_team ON study.cohort_members USING btree (team_id);
CREATE INDEX ix_cohort_members_district ON study.cohort_members USING btree (district_id);

CREATE OR REPLACE FUNCTION app.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ingest_siaps_c3(p_metadata jsonb, p_rows jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'app', 'core', 'siaps', 'analytics', 'audit'
AS $function$
declare
  v_import_id uuid;
  v_competency date;
  v_uploaded_by uuid;
  v_rows integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows deve ser um array JSON';
  end if;

  v_competency := (p_metadata->>'competency')::date;
  v_uploaded_by := nullif(p_metadata->>'uploaded_by','')::uuid;
  v_rows := jsonb_array_length(p_rows);

  if v_competency is null
     or v_competency <> date_trunc('month',v_competency)::date then
    raise exception 'Competência inválida: %', p_metadata->>'competency';
  end if;

  insert into siaps.imports(
    filename,file_sha256,competency,indicator_code,indicator_name,
    municipality_ibge,municipality_name,uf,source_status,generated_at,
    source_filters,parser_version,status,rows_total,uploaded_by
  )
  values(
    p_metadata->>'filename',
    p_metadata->>'file_sha256',
    v_competency,
    coalesce(nullif(p_metadata->>'indicator_code',''),'C3'),
    coalesce(nullif(p_metadata->>'indicator_name',''),'Cuidado na Gestação e Puerpério'),
    coalesce(nullif(p_metadata->>'municipality_ibge',''),'250400'),
    coalesce(nullif(p_metadata->>'municipality_name',''),'CAMPINA GRANDE'),
    coalesce(nullif(p_metadata->>'uf',''),'PB'),
    coalesce(nullif(p_metadata->>'source_status',''),'preliminar'),
    nullif(p_metadata->>'generated_at','')::timestamptz,
    coalesce(p_metadata->'source_filters','{}'::jsonb),
    p_metadata->>'parser_version',
    'validado',
    v_rows,
    v_uploaded_by
  )
  returning id into v_import_id;

  create temporary table tmp_siaps_c3_rows (
    file_row integer,
    cnes text,
    establishment_name text,
    establishment_type text,
    ine text,
    team_name text,
    team_type text,
    practice_a integer,
    practice_b integer,
    practice_c integer,
    practice_d integer,
    practice_e integer,
    practice_f integer,
    practice_g integer,
    practice_h integer,
    practice_i integer,
    practice_j integer,
    practice_k integer,
    points_total numeric,
    denominator integer,
    official_ratio numeric
  ) on commit drop;

  insert into tmp_siaps_c3_rows
  select *
  from jsonb_to_recordset(p_rows) as x(
    file_row integer,
    cnes text,
    establishment_name text,
    establishment_type text,
    ine text,
    team_name text,
    team_type text,
    practice_a integer,
    practice_b integer,
    practice_c integer,
    practice_d integer,
    practice_e integer,
    practice_f integer,
    practice_g integer,
    practice_h integer,
    practice_i integer,
    practice_j integer,
    practice_k integer,
    points_total numeric,
    denominator integer,
    official_ratio numeric
  );

  if exists (
    select 1 from tmp_siaps_c3_rows
    where cnes !~ '^[0-9]{7}$'
       or ine !~ '^[0-9]{10}$'
       or denominator is null
       or denominator < 0
  ) then
    raise exception 'Arquivo contém CNES/INE/denominador inválido';
  end if;

  insert into core.establishments(
    cnes,name,establishment_type,first_seen_competency,last_seen_competency
  )
  select
    cnes,
    max(establishment_name),
    max(establishment_type),
    v_competency,
    v_competency
  from tmp_siaps_c3_rows
  group by cnes
  on conflict (cnes) do update
  set name=excluded.name,
      establishment_type=coalesce(excluded.establishment_type,core.establishments.establishment_type),
      first_seen_competency=least(coalesce(core.establishments.first_seen_competency,excluded.first_seen_competency),excluded.first_seen_competency),
      last_seen_competency=greatest(coalesce(core.establishments.last_seen_competency,excluded.last_seen_competency),excluded.last_seen_competency);

  insert into core.teams(
    ine,name,team_type,first_seen_competency,last_seen_competency
  )
  select
    ine,
    max(team_name),
    max(team_type),
    v_competency,
    v_competency
  from tmp_siaps_c3_rows
  group by ine
  on conflict (ine) do update
  set name=excluded.name,
      team_type=coalesce(excluded.team_type,core.teams.team_type),
      first_seen_competency=least(coalesce(core.teams.first_seen_competency,excluded.first_seen_competency),excluded.first_seen_competency),
      last_seen_competency=greatest(coalesce(core.teams.last_seen_competency,excluded.last_seen_competency),excluded.last_seen_competency);

  -- Fecha vínculo corrente se o mesmo INE aparecer em outro CNES.
  update core.team_establishment_history h
  set valid_to = v_competency - 1
  from core.teams t,
       core.establishments e,
       tmp_siaps_c3_rows r
  where h.team_id=t.id
    and h.valid_to is null
    and t.ine=r.ine
    and e.cnes=r.cnes
    and h.establishment_id<>e.id
    and h.valid_from < v_competency;

  insert into core.team_establishment_history(
    team_id,establishment_id,valid_from,source
  )
  select distinct
    t.id,e.id,v_competency,'siaps'
  from tmp_siaps_c3_rows r
  join core.teams t on t.ine=r.ine
  join core.establishments e on e.cnes=r.cnes
  where not exists (
    select 1
    from core.team_establishment_history h
    where h.team_id=t.id
      and h.establishment_id=e.id
      and h.valid_to is null
  );

  insert into siaps.quality_rows(
    import_id,file_row,cnes,establishment_name,establishment_type,
    ine,team_name,team_type,
    practice_a,practice_b,practice_c,practice_d,practice_e,practice_f,
    practice_g,practice_h,practice_i,practice_j,practice_k,
    points_total,denominator,official_ratio,raw_payload
  )
  select
    v_import_id,file_row,cnes,establishment_name,establishment_type,
    ine,team_name,team_type,
    practice_a,practice_b,practice_c,practice_d,practice_e,practice_f,
    practice_g,practice_h,practice_i,practice_j,practice_k,
    points_total,denominator,official_ratio,
    jsonb_build_object(
      'cnes',cnes,'ine',ine,
      'establishment_name',establishment_name,
      'team_name',team_name
    )
  from tmp_siaps_c3_rows;

  -- Uma nova versão da competência substitui apenas a versão analítica corrente,
  -- preservando toda a proveniência em siaps.imports/quality_rows.
  update analytics.c3_team_monthly f
  set is_current=false
  where f.competency=v_competency
    and f.is_current
    and exists (
      select 1
      from tmp_siaps_c3_rows r
      join core.teams t on t.ine=r.ine
      where t.id=f.team_id
    );

  insert into analytics.c3_team_monthly(
    source_import_id,competency,team_id,establishment_id,district_id,
    denominator,points_total,official_ratio,is_current
  )
  select
    v_import_id,
    v_competency,
    t.id,
    e.id,
    dh.district_id,
    r.denominator,
    coalesce(r.points_total,0),
    r.official_ratio,
    true
  from tmp_siaps_c3_rows r
  join core.teams t on t.ine=r.ine
  join core.establishments e on e.cnes=r.cnes
  left join lateral (
    select h.district_id
    from core.establishment_district_history h
    where h.establishment_id=e.id
      and h.valid_from <= v_competency
      and (h.valid_to is null or h.valid_to >= v_competency)
    order by h.valid_from desc
    limit 1
  ) dh on true;

  insert into analytics.c3_practice_counts(fact_id,practice_code,fulfilled)
  select
    f.id,
    p.code,
    p.fulfilled
  from tmp_siaps_c3_rows r
  join core.teams t on t.ine=r.ine
  join analytics.c3_team_monthly f
    on f.source_import_id=v_import_id
   and f.team_id=t.id
  cross join lateral (
    values
      ('A'::char(1),coalesce(r.practice_a,0)),
      ('B'::char(1),coalesce(r.practice_b,0)),
      ('C'::char(1),coalesce(r.practice_c,0)),
      ('D'::char(1),coalesce(r.practice_d,0)),
      ('E'::char(1),coalesce(r.practice_e,0)),
      ('F'::char(1),coalesce(r.practice_f,0)),
      ('G'::char(1),coalesce(r.practice_g,0)),
      ('H'::char(1),coalesce(r.practice_h,0)),
      ('I'::char(1),coalesce(r.practice_i,0)),
      ('J'::char(1),coalesce(r.practice_j,0)),
      ('K'::char(1),coalesce(r.practice_k,0))
  ) p(code,fulfilled);

  update siaps.imports
  set status='publicado',
      published_at=now()
  where id=v_import_id;

  insert into audit.events(actor_user_id,event_type,entity_type,entity_id,metadata)
  values(
    v_uploaded_by,
    'siaps_c3_import_published',
    'siaps.imports',
    v_import_id::text,
    jsonb_build_object('competency',v_competency,'rows',v_rows)
  );

  return v_import_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.stage_siaps_c3_compact(p_metadata jsonb, p_rows jsonb, p_finalize boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'app', 'core', 'siaps', 'analytics', 'audit'
AS $function$
declare
  v_import_id uuid;
  v_competency date;
  v_uploaded_by uuid;
  v_expected_rows integer;
  v_actual_rows integer;
  v_sha text;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows deve ser um array JSON';
  end if;

  v_sha := p_metadata->>'file_sha256';
  v_competency := (p_metadata->>'competency')::date;
  v_uploaded_by := nullif(p_metadata->>'uploaded_by','')::uuid;
  v_expected_rows := coalesce(nullif(p_metadata->>'rows_total','')::integer, 0);

  if v_sha is null or v_sha !~ '^[a-f0-9]{64}$' then
    raise exception 'SHA256 inválido';
  end if;

  if v_competency is null
     or v_competency <> date_trunc('month',v_competency)::date then
    raise exception 'Competência inválida: %', p_metadata->>'competency';
  end if;

  select id into v_import_id
  from siaps.imports
  where file_sha256=v_sha;

  if v_import_id is null then
    insert into siaps.imports(
      filename,file_sha256,competency,indicator_code,indicator_name,
      municipality_ibge,municipality_name,uf,source_status,generated_at,
      source_filters,parser_version,status,rows_total,uploaded_by
    )
    values(
      p_metadata->>'filename',
      v_sha,
      v_competency,
      coalesce(nullif(p_metadata->>'indicator_code',''),'C3'),
      coalesce(nullif(p_metadata->>'indicator_name',''),'Cuidado na Gestação e Puerpério'),
      coalesce(nullif(p_metadata->>'municipality_ibge',''),'250400'),
      coalesce(nullif(p_metadata->>'municipality_name',''),'CAMPINA GRANDE'),
      coalesce(nullif(p_metadata->>'uf',''),'PB'),
      coalesce(nullif(p_metadata->>'source_status',''),'preliminar'),
      nullif(p_metadata->>'generated_at','')::timestamptz,
      coalesce(p_metadata->'source_filters','{}'::jsonb),
      p_metadata->>'parser_version',
      'recebido',
      v_expected_rows,
      v_uploaded_by
    )
    returning id into v_import_id;
  else
    if exists (
      select 1 from siaps.imports
      where id=v_import_id and status='publicado'
    ) then
      return v_import_id;
    end if;
  end if;

  create temporary table tmp_stage_rows (
    file_row integer,
    cnes text,
    establishment_name text,
    establishment_type text,
    ine text,
    team_name text,
    team_type text,
    practice_a integer,
    practice_b integer,
    practice_c integer,
    practice_d integer,
    practice_e integer,
    practice_f integer,
    practice_g integer,
    practice_h integer,
    practice_i integer,
    practice_j integer,
    practice_k integer,
    points_total numeric,
    denominator integer,
    official_ratio numeric
  ) on commit drop;

  insert into tmp_stage_rows
  select
    (r->>0)::integer,
    r->>1, r->>2, r->>3, r->>4, r->>5, r->>6,
    nullif(r->>7,'')::integer,
    nullif(r->>8,'')::integer,
    nullif(r->>9,'')::integer,
    nullif(r->>10,'')::integer,
    nullif(r->>11,'')::integer,
    nullif(r->>12,'')::integer,
    nullif(r->>13,'')::integer,
    nullif(r->>14,'')::integer,
    nullif(r->>15,'')::integer,
    nullif(r->>16,'')::integer,
    nullif(r->>17,'')::integer,
    nullif(r->>18,'')::numeric,
    nullif(r->>19,'')::integer,
    nullif(r->>20,'')::numeric
  from jsonb_array_elements(p_rows) r;

  if exists (
    select 1 from tmp_stage_rows
    where cnes !~ '^[0-9]{7}$'
       or ine !~ '^[0-9]{10}$'
       or denominator is null
       or denominator < 0
       or file_row is null
       or file_row < 19
  ) then
    raise exception 'Bloco contém CNES/INE/denominador/linha inválido';
  end if;

  insert into core.establishments(
    cnes,name,establishment_type,first_seen_competency,last_seen_competency
  )
  select
    cnes,
    max(establishment_name),
    max(establishment_type),
    v_competency,
    v_competency
  from tmp_stage_rows
  group by cnes
  on conflict (cnes) do update
  set name=excluded.name,
      establishment_type=coalesce(excluded.establishment_type,core.establishments.establishment_type),
      first_seen_competency=least(coalesce(core.establishments.first_seen_competency,excluded.first_seen_competency),excluded.first_seen_competency),
      last_seen_competency=greatest(coalesce(core.establishments.last_seen_competency,excluded.last_seen_competency),excluded.last_seen_competency);

  insert into core.teams(
    ine,name,team_type,first_seen_competency,last_seen_competency
  )
  select
    ine,
    max(team_name),
    max(team_type),
    v_competency,
    v_competency
  from tmp_stage_rows
  group by ine
  on conflict (ine) do update
  set name=excluded.name,
      team_type=coalesce(excluded.team_type,core.teams.team_type),
      first_seen_competency=least(coalesce(core.teams.first_seen_competency,excluded.first_seen_competency),excluded.first_seen_competency),
      last_seen_competency=greatest(coalesce(core.teams.last_seen_competency,excluded.last_seen_competency),excluded.last_seen_competency);

  update core.team_establishment_history h
  set valid_to = v_competency - 1
  from core.teams t,
       core.establishments e,
       tmp_stage_rows r
  where h.team_id=t.id
    and h.valid_to is null
    and t.ine=r.ine
    and e.cnes=r.cnes
    and h.establishment_id<>e.id
    and h.valid_from < v_competency;

  insert into core.team_establishment_history(
    team_id,establishment_id,valid_from,source
  )
  select distinct
    t.id,e.id,v_competency,'siaps'
  from tmp_stage_rows r
  join core.teams t on t.ine=r.ine
  join core.establishments e on e.cnes=r.cnes
  where not exists (
    select 1
    from core.team_establishment_history h
    where h.team_id=t.id
      and h.establishment_id=e.id
      and h.valid_to is null
  );

  insert into siaps.quality_rows(
    import_id,file_row,cnes,establishment_name,establishment_type,
    ine,team_name,team_type,
    practice_a,practice_b,practice_c,practice_d,practice_e,practice_f,
    practice_g,practice_h,practice_i,practice_j,practice_k,
    points_total,denominator,official_ratio,raw_payload
  )
  select
    v_import_id,file_row,cnes,establishment_name,establishment_type,
    ine,team_name,team_type,
    practice_a,practice_b,practice_c,practice_d,practice_e,practice_f,
    practice_g,practice_h,practice_i,practice_j,practice_k,
    points_total,denominator,official_ratio,
    jsonb_build_object(
      'cnes',cnes,'ine',ine,
      'establishment_name',establishment_name,
      'team_name',team_name
    )
  from tmp_stage_rows
  on conflict (import_id,file_row) do update
  set cnes=excluded.cnes,
      establishment_name=excluded.establishment_name,
      establishment_type=excluded.establishment_type,
      ine=excluded.ine,
      team_name=excluded.team_name,
      team_type=excluded.team_type,
      practice_a=excluded.practice_a,
      practice_b=excluded.practice_b,
      practice_c=excluded.practice_c,
      practice_d=excluded.practice_d,
      practice_e=excluded.practice_e,
      practice_f=excluded.practice_f,
      practice_g=excluded.practice_g,
      practice_h=excluded.practice_h,
      practice_i=excluded.practice_i,
      practice_j=excluded.practice_j,
      practice_k=excluded.practice_k,
      points_total=excluded.points_total,
      denominator=excluded.denominator,
      official_ratio=excluded.official_ratio,
      raw_payload=excluded.raw_payload;

  if p_finalize then
    select count(*) into v_actual_rows
    from siaps.quality_rows
    where import_id=v_import_id;

    if v_expected_rows <= 0 then
      select rows_total into v_expected_rows
      from siaps.imports
      where id=v_import_id;
    end if;

    if v_actual_rows <> v_expected_rows then
      raise exception 'Importação incompleta: esperado %, recebido %', v_expected_rows, v_actual_rows;
    end if;

    delete from analytics.c3_practice_counts p
    using analytics.c3_team_monthly f
    where p.fact_id=f.id
      and f.source_import_id=v_import_id;

    delete from analytics.c3_team_monthly
    where source_import_id=v_import_id;

    update analytics.c3_team_monthly f
    set is_current=false
    where f.competency=v_competency
      and f.is_current
      and exists (
        select 1
        from siaps.quality_rows r
        join core.teams t on t.ine=r.ine
        where r.import_id=v_import_id
          and t.id=f.team_id
      );

    insert into analytics.c3_team_monthly(
      source_import_id,competency,team_id,establishment_id,district_id,
      denominator,points_total,official_ratio,is_current
    )
    select
      v_import_id,
      v_competency,
      t.id,
      e.id,
      dh.district_id,
      r.denominator,
      coalesce(r.points_total,0),
      r.official_ratio,
      true
    from siaps.quality_rows r
    join core.teams t on t.ine=r.ine
    join core.establishments e on e.cnes=r.cnes
    left join lateral (
      select h.district_id
      from core.establishment_district_history h
      where h.establishment_id=e.id
        and h.valid_from <= v_competency
        and (h.valid_to is null or h.valid_to >= v_competency)
      order by h.valid_from desc
      limit 1
    ) dh on true
    where r.import_id=v_import_id;

    insert into analytics.c3_practice_counts(fact_id,practice_code,fulfilled)
    select
      f.id,
      p.code,
      p.fulfilled
    from siaps.quality_rows r
    join core.teams t on t.ine=r.ine
    join analytics.c3_team_monthly f
      on f.source_import_id=v_import_id
     and f.team_id=t.id
    cross join lateral (
      values
        ('A'::char(1),coalesce(r.practice_a,0)),
        ('B'::char(1),coalesce(r.practice_b,0)),
        ('C'::char(1),coalesce(r.practice_c,0)),
        ('D'::char(1),coalesce(r.practice_d,0)),
        ('E'::char(1),coalesce(r.practice_e,0)),
        ('F'::char(1),coalesce(r.practice_f,0)),
        ('G'::char(1),coalesce(r.practice_g,0)),
        ('H'::char(1),coalesce(r.practice_h,0)),
        ('I'::char(1),coalesce(r.practice_i,0)),
        ('J'::char(1),coalesce(r.practice_j,0)),
        ('K'::char(1),coalesce(r.practice_k,0))
    ) p(code,fulfilled)
    where r.import_id=v_import_id;

    update siaps.imports
    set status='publicado',
        rows_total=v_actual_rows,
        published_at=now()
    where id=v_import_id;

    insert into audit.events(actor_user_id,event_type,entity_type,entity_id,metadata)
    values(
      v_uploaded_by,
      'siaps_c3_import_published',
      'siaps.imports',
      v_import_id::text,
      jsonb_build_object('competency',v_competency,'rows',v_actual_rows)
    );
  end if;

  return v_import_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.ingest_siaps_c3_compact(p_metadata jsonb, p_rows jsonb)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select public.ingest_siaps_c3(
    p_metadata,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'file_row', (r->>0)::integer,
          'cnes', r->>1,
          'establishment_name', r->>2,
          'establishment_type', r->>3,
          'ine', r->>4,
          'team_name', r->>5,
          'team_type', r->>6,
          'practice_a', nullif(r->>7,'')::integer,
          'practice_b', nullif(r->>8,'')::integer,
          'practice_c', nullif(r->>9,'')::integer,
          'practice_d', nullif(r->>10,'')::integer,
          'practice_e', nullif(r->>11,'')::integer,
          'practice_f', nullif(r->>12,'')::integer,
          'practice_g', nullif(r->>13,'')::integer,
          'practice_h', nullif(r->>14,'')::integer,
          'practice_i', nullif(r->>15,'')::integer,
          'practice_j', nullif(r->>16,'')::integer,
          'practice_k', nullif(r->>17,'')::integer,
          'points_total', nullif(r->>18,'')::numeric,
          'denominator', nullif(r->>19,'')::integer,
          'official_ratio', nullif(r->>20,'')::numeric
        )
      )
      from jsonb_array_elements(p_rows) r
    ), '[]'::jsonb)
  );
$function$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON app.profiles FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_establishments_updated_at BEFORE UPDATE ON core.establishments FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON core.teams FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

alter table analytics.c3_practice_counts enable row level security;
alter table analytics.c3_team_monthly enable row level security;
alter table app.profiles enable row level security;
alter table audit.events enable row level security;
alter table core.districts enable row level security;
alter table core.establishment_district_history enable row level security;
alter table core.establishments enable row level security;
alter table core.team_establishment_history enable row level security;
alter table core.teams enable row level security;
alter table siaps.imports enable row level security;
alter table siaps.quality_rows enable row level security;
alter table study.cohort_members enable row level security;
alter table study.cohorts enable row level security;

create policy c3_practices_active_users_read on analytics.c3_practice_counts for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy c3_monthly_active_users_read on analytics.c3_team_monthly for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy profiles_self_read on app.profiles for select to authenticated using ((( SELECT auth.uid() AS uid) = user_id));
create policy districts_active_users_read on core.districts for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy establishment_district_active_users_read on core.establishment_district_history for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy establishments_active_users_read on core.establishments for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy team_establishment_active_users_read on core.team_establishment_history for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy teams_active_users_read on core.teams for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy imports_active_users_read on siaps.imports for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy cohort_members_active_users_read on study.cohort_members for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));
create policy cohorts_active_users_read on study.cohorts for select to authenticated using ((EXISTS ( SELECT 1
   FROM app.profiles p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND p.active))));

revoke all on schema app from public, anon, authenticated;
revoke all on schema core from public, anon, authenticated;
revoke all on schema siaps from public, anon, authenticated;
revoke all on schema analytics from public, anon, authenticated;
revoke all on schema study from public, anon, authenticated;
revoke all on schema audit from public, anon, authenticated;
grant usage on schema app to authenticated;
grant usage on schema core to authenticated;
grant usage on schema siaps to authenticated;
grant usage on schema analytics to authenticated;
grant usage on schema study to authenticated;

grant select on analytics.c3_practice_counts to authenticated;
grant select on analytics.c3_team_monthly to authenticated;
grant select on app.profiles to authenticated;
grant select on core.districts to authenticated;
grant select on core.establishment_district_history to authenticated;
grant select on core.establishments to authenticated;
grant select on core.team_establishment_history to authenticated;
grant select on core.teams to authenticated;
grant select on siaps.imports to authenticated;
grant select on study.cohort_members to authenticated;
grant select on study.cohorts to authenticated;

revoke execute on function public.ingest_siaps_c3(p_metadata jsonb, p_rows jsonb) from public, anon, authenticated;
grant execute on function public.ingest_siaps_c3(p_metadata jsonb, p_rows jsonb) to service_role;
revoke execute on function public.stage_siaps_c3_compact(p_metadata jsonb, p_rows jsonb, p_finalize boolean) from public, anon, authenticated;
grant execute on function public.stage_siaps_c3_compact(p_metadata jsonb, p_rows jsonb, p_finalize boolean) to service_role;
revoke execute on function public.ingest_siaps_c3_compact(p_metadata jsonb, p_rows jsonb) from public, anon, authenticated;
grant execute on function public.ingest_siaps_c3_compact(p_metadata jsonb, p_rows jsonb) to service_role;

-- Somente fontes institucionais privadas; o bucket legado do modulo externo
-- nao faz parte desta cadeia local.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('siaps-source', 'siaps-source', false, 26214400,
   array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('territorio-source', 'territorio-source', false, 26214400,
   array['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']);
