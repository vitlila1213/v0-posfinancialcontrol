-- Permitir que clientes marquem suas próprias transações como estornadas
-- independente do status
DROP POLICY IF EXISTS transactions_chargeback_own ON transactions;

CREATE POLICY transactions_chargeback_own
ON transactions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comentário: Esta política permite que o cliente atualize is_chargeback, 
-- chargeback_reason e chargeback_at em suas próprias transações
