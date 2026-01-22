-- Remover todas as políticas RLS antigas da tabela notifications
DROP POLICY IF EXISTS "Allow authenticated users to create notifications" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_for_any_user" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

-- Criar política para INSERT - permitir que qualquer usuário autenticado crie notificações
CREATE POLICY "notifications_insert_policy" ON notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Criar política para SELECT - permitir que usuários vejam apenas suas próprias notificações
CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Criar política para UPDATE - permitir que usuários atualizem apenas suas próprias notificações
CREATE POLICY "notifications_update_policy" ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Criar política para DELETE - permitir que usuários deletem apenas suas próprias notificações
CREATE POLICY "notifications_delete_policy" ON notifications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
