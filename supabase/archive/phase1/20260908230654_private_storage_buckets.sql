-- Private source buckets. SIAPS and territory remain server-endpoint only.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'siaps-source',
    'siaps-source',
    false,
    26214400,
    array[
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  ),
  (
    'territorio-source',
    'territorio-source',
    false,
    26214400,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
  ),
  (
    'professional-source',
    'professional-source',
    false,
    15728640,
    array[
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
  )
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists professional_source_select_owner on storage.objects;
create policy professional_source_select_owner
on storage.objects for select
to authenticated
using (
  bucket_id = 'professional-source'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select security.is_active_role('profissional'))
);

drop policy if exists professional_source_insert_owner on storage.objects;
create policy professional_source_insert_owner
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'professional-source'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select security.is_active_role('profissional'))
);

drop policy if exists professional_source_update_owner on storage.objects;
create policy professional_source_update_owner
on storage.objects for update
to authenticated
using (
  bucket_id = 'professional-source'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select security.is_active_role('profissional'))
)
with check (
  bucket_id = 'professional-source'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select security.is_active_role('profissional'))
);

drop policy if exists professional_source_delete_owner on storage.objects;
create policy professional_source_delete_owner
on storage.objects for delete
to authenticated
using (
  bucket_id = 'professional-source'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select security.is_active_role('profissional'))
);
