-- Adicionar campos para transações sem comprovante e estornos
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS no_receipt_reason TEXT,
ADD COLUMN IF NOT EXISTS is_chargeback BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS chargeback_reason TEXT,
ADD COLUMN IF NOT EXISTS chargeback_at TIMESTAMPTZ;

-- Criar tabela de ajustes de saldo
CREATE TABLE IF NOT EXISTS balance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('add', 'remove')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user_id ON balance_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_adjustments_admin_id ON balance_adjustments(admin_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_chargeback ON transactions(is_chargeback);

-- RLS Policies para balance_adjustments
ALTER TABLE balance_adjustments ENABLE ROW LEVEL SECURITY;

-- Clientes podem ver seus próprios ajustes
CREATE POLICY "balance_adjustments_select_own" ON balance_adjustments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins podem ver todos os ajustes
CREATE POLICY "balance_adjustments_select_admin" ON balance_adjustments
  FOR SELECT
  USING (is_admin());

-- Admins podem inserir ajustes
CREATE POLICY "balance_adjustments_insert_admin" ON balance_adjustments
  FOR INSERT
  WITH CHECK (is_admin() AND auth.uid() = admin_id);
