-- Operações incrementais da V1.0 do MAE APS.
-- Não altera nem recria dados SIAPS existentes.

create or replace function public.update_establishment_territory(
  p_establishment_id uuid,
  p_district_id smallint,
  p_valid_from date
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, app, core, analytics, audit
as $function$
declare
  v_actor uuid := auth.uid();
  v_role app.user_role;
  v_previous core.establishment_district_history%rowtype;
  v_history_id bigint;
  v_latest_valid_from date;
begin
  select role into v_role
  from app.profiles
  where user_id = v_actor and active
  for share;

  if v_role is null or v_role <> 'admin'::app.user_role then
    raise exception 'Apenas administradores ativos podem alterar território' using errcode = '42501';
  end if;
  if p_valid_from is null then
    raise exception 'Data inicial de validade obrigatória';
  end if;
  if not exists (select 1 from core.establishments where id = p_establishment_id) then
    raise exception 'Estabelecimento não encontrado';
  end if;
  if p_district_id is not null and not exists (
    select 1 from core.districts where id = p_district_id and active
  ) then
    raise exception 'Distrito ativo não encontrado';
  end if;

  select * into v_previous
  from core.establishment_district_history
  where establishment_id = p_establishment_id and valid_to is null
  order by valid_from desc
  limit 1
  for update;

  select max(valid_from) into v_latest_valid_from
  from core.establishment_district_history
  where establishment_id = p_establishment_id;

  if v_latest_valid_from is not null and v_latest_valid_from >= p_valid_from then
    raise exception 'A nova vigência deve começar depois de %', v_latest_valid_from;
  end if;
  if v_previous.id is null and exists (
    select 1 from core.establishment_district_history
    where establishment_id = p_establishment_id
      and valid_to is not null
      and valid_to >= p_valid_from
  ) then
    raise exception 'A nova vigência não pode sobrepor período territorial existente';
  end if;

  if v_previous.id is not null and v_previous.district_id is not distinct from p_district_id then
    return v_previous.id;
  end if;

  if v_previous.id is not null then
    update core.establishment_district_history
    set valid_to = p_valid_from - 1
    where id = v_previous.id;
  end if;

  if p_district_id is not null then
    insert into core.establishment_district_history(
      establishment_id, district_id, valid_from, source, notes
    ) values (
      p_establishment_id, p_district_id, p_valid_from, 'manual',
      'Atualização realizada pela Gestão no MAE APS'
    ) returning id into v_history_id;
  end if;

  -- O fato guarda o recorte territorial da competência. Só competências dentro
  -- da nova vigência são atualizadas; meses anteriores permanecem intactos.
  update analytics.c3_team_monthly
  set district_id = p_district_id
  where establishment_id = p_establishment_id
    and competency >= date_trunc('month', p_valid_from)::date;

  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'territory_assignment_changed',
    'core.establishments',
    p_establishment_id::text,
    jsonb_build_object(
      'previous_district_id', v_previous.district_id,
      'district_id', p_district_id,
      'valid_from', p_valid_from,
      'history_id', v_history_id
    )
  );

  return coalesce(v_history_id, v_previous.id);
end;
$function$;

create or replace function public.manage_profile(
  p_user_id uuid,
  p_role app.user_role,
  p_active boolean
)
returns app.profiles
language plpgsql
security definer
set search_path = pg_catalog, public, auth, app, audit
as $function$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_previous app.profiles%rowtype;
  v_result app.profiles%rowtype;
begin
  if not exists (
    select 1 from app.profiles
    where user_id = v_actor and active and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem gerenciar perfis' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'Usuário autenticado não encontrado';
  end if;

  select * into v_previous from app.profiles where user_id = p_user_id;
  insert into app.profiles(user_id, email, role, active)
  values (p_user_id, v_email, p_role, p_active)
  on conflict (user_id) do update
  set email = excluded.email,
      role = excluded.role,
      active = excluded.active,
      updated_at = now()
  returning * into v_result;

  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'profile_access_changed',
    'app.profiles',
    p_user_id::text,
    jsonb_build_object(
      'previous_role', v_previous.role,
      'previous_active', v_previous.active,
      'role', v_result.role,
      'active', v_result.active
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.update_establishment_territory(uuid, smallint, date) from public, anon;
grant execute on function public.update_establishment_territory(uuid, smallint, date) to authenticated;

revoke all on function public.manage_profile(uuid, app.user_role, boolean) from public, anon;
grant execute on function public.manage_profile(uuid, app.user_role, boolean) to authenticated;

-- O cliente privilegiado server-side da Administração precisa consultar
-- app.profiles para cruzar usuários do Auth com papéis do MAE APS.
grant usage on schema app to service_role;
grant select on table app.profiles to service_role;
