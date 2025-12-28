-- ============================================
-- Adicionar Saque por Boleto
-- ============================================

-- Adicionar colunas para dados do boleto na tabela withdrawals
ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS withdrawal_method TEXT CHECK (withdrawal_method IN ('pix', 'bank', 'boleto')),
ADD COLUMN IF NOT EXISTS boleto_name TEXT,
ADD COLUMN IF NOT EXISTS boleto_beneficiary_name TEXT,
ADD COLUMN IF NOT EXISTS boleto_number TEXT,
ADD COLUMN IF NOT EXISTS boleto_value NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS boleto_origin TEXT;

-- Atualizar registros existentes para ter o método definido
UPDATE public.withdrawals 
SET withdrawal_method = CASE 
    WHEN pix_key IS NOT NULL THEN 'pix'
    WHEN bank_name IS NOT NULL THEN 'bank'
    ELSE 'pix'
END
WHERE withdrawal_method IS NULL;

-- Adicionar índice para busca por método
CREATE INDEX IF NOT EXISTS idx_withdrawals_method ON public.withdrawals(withdrawal_method);

-- Comentários para documentação
COMMENT ON COLUMN public.withdrawals.withdrawal_method IS 'Método de saque: pix, bank ou boleto';
COMMENT ON COLUMN public.withdrawals.boleto_name IS 'Nome do boleto (para pagamento)';
COMMENT ON COLUMN public.withdrawals.boleto_beneficiary_name IS 'Nome do beneficiário do boleto';
COMMENT ON COLUMN public.withdrawals.boleto_number IS 'Número do código de barras do boleto';
COMMENT ON COLUMN public.withdrawals.boleto_value IS 'Valor do boleto a ser pago';
COMMENT ON COLUMN public.withdrawals.boleto_origin IS 'Origem do boleto (ex: conta de luz, conta pessoal)';

SELECT 'Boleto withdrawal columns added successfully!' AS status;
