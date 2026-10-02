-- Ajuste fino de identificação cadastral de UBS.
-- A operação é exclusiva de administradores ativos, exige duas confirmações
-- explícitas e registra os valores anterior/novo na auditoria.

create or replace function public.update_establishment_identity(
  p_establishment_id uuid,
  p_cnes text,
  p_name text,
  p_confirm_official boolean,
  p_confirm_impact boolean
)
returns core.establishments
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_current core.establishments%rowtype;
  v_result core.establishments%rowtype;
  v_cnes text := btrim(p_cnes);
  v_name text := regexp_replace(btrim(p_name), '\\s+', ' ', 'g');
begin
  if not exists (
    select 1
    from app.profiles
    where user_id = v_actor
      and active
      and role = 'admin'::app.user_role
  ) then
    raise exception 'Apenas administradores ativos podem ajustar nome e CNES'
      using errcode = '42501';
  end if;

  if p_confirm_official is distinct from true or p_confirm_impact is distinct from true then
    raise exception 'As duas confirmações de segurança são obrigatórias'
      using errcode = '22023';
  end if;

  if v_cnes !~ '^[0-9]{7}$' then
    raise exception 'CNES deve conter exatamente 7 dígitos'
      using errcode = '22023';
  end if;

  if char_length(v_name) < 3 or char_length(v_name) > 200 then
    raise exception 'Nome da UBS deve conter entre 3 e 200 caracteres'
      using errcode = '22023';
  end if;

  select *
  into v_current
  from core.establishments
  where id = p_establishment_id
  for update;

  if v_current.id is null then
    raise exception 'Estabelecimento não encontrado';
  end if;

  if exists (
    select 1
    from core.establishments
    where cnes = v_cnes
      and id <> p_establishment_id
  ) then
    raise exception 'CNES já vinculado a outro estabelecimento'
      using errcode = '23505';
  end if;

  if v_current.cnes = v_cnes and v_current.name = v_name then
    return v_current;
  end if;

  update core.establishments
  set cnes = v_cnes,
      name = v_name,
      updated_at = now()
  where id = p_establishment_id
  returning * into v_result;

  insert into audit.events(actor_user_id, event_type, entity_type, entity_id, metadata)
  values (
    v_actor,
    'establishment_identity_changed',
    'core.establishments',
    p_establishment_id::text,
    jsonb_build_object(
      'previous_name', v_current.name,
      'name', v_result.name,
      'previous_cnes', v_current.cnes,
      'cnes', v_result.cnes,
      'risk_confirmed', true,
      'official_source_confirmed', true
    )
  );

  return v_result;
end;
$function$;

revoke all on function public.update_establishment_identity(uuid, text, text, boolean, boolean) from public, anon;
grant execute on function public.update_establishment_identity(uuid, text, text, boolean, boolean) to authenticated;
