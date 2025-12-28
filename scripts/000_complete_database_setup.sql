-- ============================================
-- PagNextLevel - Script SQL Completo
-- Replicação do Banco de Dados
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PASSO 1: CRIAR TODAS AS TABELAS
-- ============================================

-- TABELA: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('client', 'admin')),
    plan TEXT CHECK (plan IN ('basico', 'intermediario', 'top')),
    pix_key TEXT,
    bank_name TEXT,
    bank_agency TEXT,
    bank_account TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    gross_value NUMERIC(10, 2) NOT NULL,
    net_value NUMERIC(10, 2) NOT NULL,
    fee_value NUMERIC(10, 2) NOT NULL,
    fee_percentage NUMERIC(5, 2) NOT NULL,
    brand TEXT NOT NULL CHECK (brand IN ('visa_master', 'elo_amex')),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('debit', 'credit')),
    installments INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending_receipt' CHECK (status IN ('pending_receipt', 'pending_verification', 'verified', 'rejected', 'paid')),
    receipt_url TEXT,
    rejection_reason TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: withdrawals
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
    pix_key TEXT,
    bank_name TEXT,
    bank_agency TEXT,
    bank_account TEXT,
    admin_proof_url TEXT,
    paid_by UUID REFERENCES public.profiles(id),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('receipt_uploaded', 'receipt_verified', 'receipt_rejected', 'withdrawal_requested', 'withdrawal_paid', 'plan_assigned')),
    related_id UUID,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASSO 2: CRIAR ÍNDICES
-- ============================================

-- Índices para profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

-- Índices para transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_brand ON public.transactions(brand);

-- Índices para withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================
-- PASSO 3: CRIAR FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_transactions ON public.transactions;
CREATE TRIGGER set_updated_at_transactions
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_withdrawals ON public.withdrawals;
CREATE TRIGGER set_updated_at_withdrawals
    BEFORE UPDATE ON public.withdrawals
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- PASSO 4: HABILITAR RLS (SEM POLÍTICAS AINDA)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 5: CRIAR FUNÇÃO is_admin COM SECURITY DEFINER
-- ============================================

-- Função is_admin usando SECURITY DEFINER para evitar recursão RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Busca o role do usuário atual ignorando RLS
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    RETURN COALESCE(user_role = 'admin', FALSE);
END;
$$;

-- ============================================
-- PASSO 6: CRIAR POLÍTICAS RLS
-- ============================================

-- POLÍTICAS: profiles

DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
CREATE POLICY profiles_select_policy ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
CREATE POLICY profiles_update_policy ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- POLÍTICAS: transactions

DROP POLICY IF EXISTS transactions_select_own ON public.transactions;
CREATE POLICY transactions_select_own ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_select_admin ON public.transactions;
CREATE POLICY transactions_select_admin ON public.transactions
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS transactions_insert_own ON public.transactions;
CREATE POLICY transactions_insert_own ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_update_own ON public.transactions;
CREATE POLICY transactions_update_own ON public.transactions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS transactions_update_admin ON public.transactions;
CREATE POLICY transactions_update_admin ON public.transactions
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- POLÍTICAS: withdrawals

DROP POLICY IF EXISTS withdrawals_select_own ON public.withdrawals;
CREATE POLICY withdrawals_select_own ON public.withdrawals
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS withdrawals_select_admin ON public.withdrawals;
CREATE POLICY withdrawals_select_admin ON public.withdrawals
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS withdrawals_insert_own ON public.withdrawals;
CREATE POLICY withdrawals_insert_own ON public.withdrawals
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS withdrawals_update_admin ON public.withdrawals;
CREATE POLICY withdrawals_update_admin ON public.withdrawals
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- POLÍTICAS: notifications

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_select_admin ON public.notifications;
CREATE POLICY notifications_select_admin ON public.notifications
    FOR SELECT
    USING (public.is_admin());

DROP POLICY IF EXISTS notifications_insert_authenticated ON public.notifications;
CREATE POLICY notifications_insert_authenticated ON public.notifications
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PASSO 7: COMENTÁRIOS (Documentação)
-- ============================================

COMMENT ON TABLE public.profiles IS 'Perfis de usuários com dados bancários e planos';
COMMENT ON TABLE public.transactions IS 'Transações com cálculo de taxas por plano';
COMMENT ON TABLE public.withdrawals IS 'Solicitações de saque dos clientes';
COMMENT ON TABLE public.notifications IS 'Sistema de notificações';

-- ============================================
-- CONCLUÍDO
-- ============================================

SELECT 'Database setup completed successfully!' AS status;
