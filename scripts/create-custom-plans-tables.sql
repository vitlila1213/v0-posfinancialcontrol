-- Criar tabela de planos personalizados
CREATE TABLE IF NOT EXISTS public.custom_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Criar tabela de taxas do plano personalizado
CREATE TABLE IF NOT EXISTS public.custom_plan_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.custom_plans(id) ON DELETE CASCADE,
  brand_group TEXT NOT NULL CHECK (brand_group IN ('VISA_MASTER', 'ELO_AMEX')),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('debit', 'credit', 'pix_conta', 'pix_qrcode')),
  installments INTEGER CHECK (installments >= 1 AND installments <= 18),
  rate NUMERIC(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(plan_id, brand_group, payment_type, installments)
);

-- Habilitar RLS
ALTER TABLE public.custom_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_plan_rates ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_plans
CREATE POLICY "Admins can view all custom plans"
  ON public.custom_plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create custom plans"
  ON public.custom_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update custom plans"
  ON public.custom_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete custom plans"
  ON public.custom_plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Políticas para custom_plan_rates
CREATE POLICY "Admins can view all rates"
  ON public.custom_plan_rates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create rates"
  ON public.custom_plan_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update rates"
  ON public.custom_plan_rates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete rates"
  ON public.custom_plan_rates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_custom_plans_created_by ON public.custom_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_custom_plans_is_active ON public.custom_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_custom_plan_rates_plan_id ON public.custom_plan_rates(plan_id);
CREATE INDEX IF NOT EXISTS idx_custom_plan_rates_lookup ON public.custom_plan_rates(plan_id, brand_group, payment_type, installments);

-- Modificar a coluna 'plan' na tabela profiles para aceitar UUIDs
-- A coluna 'plan' continuará aceitando 'basico', 'intermediario', 'top' ou um UUID de custom_plan
COMMENT ON COLUMN public.profiles.plan IS 'Plan type: basico, intermediario, top, or UUID of custom_plan';
