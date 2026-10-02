-- Fecha a V1 de importações SIAPS com trilha de auditoria e substituição segura.
-- Mantém histórico: uma correção de competência nunca apaga a publicação anterior.

alter table siaps.imports
  add column if not exists uploaded_by_email_snapshot text,
  add column if not exists supersedes_import_id uuid,
  add column if not exists superseded_by_import_id uuid;

alter table siaps.imports
  drop constraint if exists imports_status_check;

alter table siaps.imports
  add constraint imports_status_check
  check (status = any (array['recebido'::text, 'validado'::text, 'publicado'::text, 'rejeitado'::text, 'substituido'::text]));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'imports_supersedes_import_id_fkey'
      and conrelid = 'siaps.imports'::regclass
  ) then
    alter table siaps.imports
      add constraint imports_supersedes_import_id_fkey
      foreign key (supersedes_import_id)
      references siaps.imports(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'imports_superseded_by_import_id_fkey'
      and conrelid = 'siaps.imports'::regclass
  ) then
    alter table siaps.imports
      add constraint imports_superseded_by_import_id_fkey
      foreign key (superseded_by_import_id)
      references siaps.imports(id)
      on delete set null;
  end if;
end
$$;

update siaps.imports i
set uploaded_by_email_snapshot = u.email
from auth.users u
where i.uploaded_by = u.id
  and i.uploaded_by_email_snapshot is null;

create or replace function public.publish_siaps_c3_v2(
  p_metadata jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, siaps, analytics, audit, auth
as $function$
declare
  v_actor uuid;
  v_actor_email text;
  v_competency date;
  v_previous_import_id uuid;
  v_import_id uuid;
  v_replace_existing boolean;
begin
  begin
    v_actor := nullif(p_metadata->>'uploaded_by', '')::uuid;
  exception when invalid_text_representation then
    raise exception 'Usuário de importação inválido' using errcode = '22023';
  end;

  begin
    v_competency := nullif(p_metadata->>'competency', '')::date;
  exception when invalid_datetime_format then
    raise exception 'Competência inválida' using errcode = '22023';
  end;

  if v_competency is null
     or to_char(v_competency, 'YYYY-MM-DD') !~ '^20[0-9]{2}-(0[1-9]|1[0-2])-01$' then
    raise exception 'Competência inválida' using errcode = '22023';
  end if;

  v_replace_existing := lower(coalesce(p_metadata->>'replace_existing', 'false'))
    in ('true', '1', 'yes');

  -- Serializa publicações da mesma competência, inclusive quando ainda não
  -- existe linha para bloquear.
  perform pg_advisory_xact_lock(hashtext('mae-aps-siaps-c3:' || v_competency::text));

  select i.id
  into v_previous_import_id
  from siaps.imports i
  where i.competency = v_competency
    and i.status = 'publicado'
  order by i.published_at desc nulls last, i.uploaded_at desc
  limit 1
  for update;

  if v_previous_import_id is not null and not v_replace_existing then
    raise exception 'Competência já possui publicação; confirmação de substituição obrigatória'
      using errcode = '23505';
  end if;

  select u.email
  into v_actor_email
  from auth.users u
  where u.id = v_actor;

  -- Reutiliza todas as validações de domínio já consolidadas na V1.
  v_import_id := public.publish_siaps_c3_v1(p_metadata, p_rows);

  update siaps.imports
  set uploaded_by_email_snapshot = v_actor_email
  where id = v_import_id;

  if v_previous_import_id is not null then
    -- A V1 desativava apenas equipes presentes no arquivo novo. Aqui toda a
    -- competência anterior deixa de ser corrente para impedir sobras analíticas.
    update analytics.c3_team_monthly
    set is_current = false
    where competency = v_competency
      and source_import_id <> v_import_id
      and is_current;

    update siaps.imports
    set status = 'substituido',
        superseded_by_import_id = v_import_id
    where competency = v_competency
      and id <> v_import_id
      and status = 'publicado';

    update siaps.imports
    set supersedes_import_id = v_previous_import_id
    where id = v_import_id;

    insert into audit.events(
      actor_user_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    )
    values (
      v_actor,
      'siaps_c3_import_replaced',
      'siaps.imports',
      v_import_id::text,
      jsonb_build_object(
        'competency', v_competency,
        'previous_import_id', v_previous_import_id,
        'new_import_id', v_import_id,
        'rows', jsonb_array_length(p_rows)
      )
    );
  end if;

  return v_import_id;
end;
$function$;

revoke all on function public.publish_siaps_c3_v2(jsonb, jsonb)
from public, anon, authenticated;
grant execute on function public.publish_siaps_c3_v2(jsonb, jsonb)
to service_role;
