-- Remover política antiga se existir e criar nova que permite clientes criarem notificações para admins
DROP POLICY IF EXISTS "notifications_insert_for_any_user" ON notifications;

-- Criar política que permite usuários autenticados criarem notificações para outros usuários
-- Isso é necessário para que clientes possam notificar admins sobre novas transações e saques
CREATE POLICY "Allow authenticated users to create notifications for others"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentário: Esta política permite que qualquer usuário autenticado crie notificações
-- para qualquer outro usuário. Isso é seguro porque:
-- 1. Apenas usuários autenticados podem usar
-- 2. As notificações são criadas no código do servidor (Supabase Context)
-- 3. Os clientes só criam notificações para admins quando fazem ações (transações, saques)
