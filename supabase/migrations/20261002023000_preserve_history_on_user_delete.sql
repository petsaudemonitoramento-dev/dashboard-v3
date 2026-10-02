-- Permite remover contas de acesso preservando o histórico institucional.
-- app.profiles já usa ON DELETE CASCADE a partir de auth.users.
-- Auditoria e importações preservam seus registros e apenas soltam a referência ao usuário excluído.

alter table audit.events
  drop constraint if exists events_actor_user_id_fkey;

alter table audit.events
  add constraint events_actor_user_id_fkey
  foreign key (actor_user_id)
  references auth.users(id)
  on delete set null;

alter table siaps.imports
  drop constraint if exists imports_uploaded_by_fkey;

alter table siaps.imports
  add constraint imports_uploaded_by_fkey
  foreign key (uploaded_by)
  references auth.users(id)
  on delete set null;
