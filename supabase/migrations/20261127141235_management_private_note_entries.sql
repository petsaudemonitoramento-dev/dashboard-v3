-- Diário privado: múltiplos registros por usuário e intervalo, preservando a tabela anterior.
CREATE TABLE app.management_private_note_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start)
);
ALTER TABLE app.management_private_note_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.management_private_note_entries FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.management_private_note_entries FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.management_private_note_entries TO authenticated;
CREATE POLICY management_note_entries_select_own ON app.management_private_note_entries FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY management_note_entries_insert_own ON app.management_private_note_entries FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY management_note_entries_update_own ON app.management_private_note_entries FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY management_note_entries_delete_own ON app.management_private_note_entries FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE INDEX management_note_entries_scope ON app.management_private_note_entries (user_id, period_start, period_end, created_at DESC);
INSERT INTO app.management_private_note_entries (user_id, period_start, period_end, body, created_at, updated_at)
SELECT user_id, period_start, period_end, body, updated_at, updated_at
FROM app.management_private_notes WHERE length(trim(body)) > 0;
COMMENT ON TABLE app.management_private_note_entries IS 'Anotações pessoais por usuário e período; registros antigos preservados na tabela original.';
