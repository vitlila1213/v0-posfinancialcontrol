-- Criar tabela de estornos (chargebacks) com workflow de aprovação
CREATE TABLE IF NOT EXISTS public.chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS chargebacks_transaction_id_idx ON public.chargebacks(transaction_id);
CREATE INDEX IF NOT EXISTS chargebacks_user_id_idx ON public.chargebacks(user_id);
CREATE INDEX IF NOT EXISTS chargebacks_status_idx ON public.chargebacks(status);

-- RLS (Row Level Security)
ALTER TABLE public.chargebacks ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios estornos
CREATE POLICY "Users can view own chargebacks"
  ON public.chargebacks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem criar estornos para suas próprias transações
CREATE POLICY "Users can create chargebacks for own transactions"
  ON public.chargebacks
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.transactions
      WHERE id = transaction_id AND user_id = auth.uid()
    )
  );

-- Política: Admins podem ver todos os estornos
CREATE POLICY "Admins can view all chargebacks"
  ON public.chargebacks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política: Admins podem atualizar estornos
CREATE POLICY "Admins can update chargebacks"
  ON public.chargebacks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_chargebacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_chargebacks_updated_at ON public.chargebacks;
CREATE TRIGGER update_chargebacks_updated_at
  BEFORE UPDATE ON public.chargebacks
  FOR EACH ROW
  EXECUTE FUNCTION update_chargebacks_updated_at();

COMMIT;
