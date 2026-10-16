-- Anotações gerenciais privadas, escopadas a auth.uid() e ao período consultado.
-- Não se deve gravar identificação de pacientes neste campo.
CREATE TABLE app.management_private_notes (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  body text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT management_private_notes_pk PRIMARY KEY (user_id, period_start, period_end),
  CONSTRAINT management_private_notes_period CHECK (period_end >= period_start),
  CONSTRAINT management_private_notes_length CHECK (char_length(body) <= 2000)
);
ALTER TABLE app.management_private_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.management_private_notes FORCE ROW LEVEL SECURITY;

REVOKE ALL ON app.management_private_notes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.management_private_notes TO authenticated;

CREATE POLICY "management_private_notes_select_own"
  ON app.management_private_notes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "management_private_notes_insert_own"
  ON app.management_private_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "management_private_notes_update_own"
  ON app.management_private_notes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "management_private_notes_delete_own"
  ON app.management_private_notes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
COMMENT ON TABLE app.management_private_notes IS 'Diário de observações do usuário autenticado, por intervalo mensal, com RLS por UID.';
