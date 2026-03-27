-- Script para corrigir o trigger de saldo para transações rejeitadas
-- Garante que transações rejeitadas NUNCA sejam adicionadas ao saldo disponível

CREATE OR REPLACE FUNCTION public.manage_central_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    -- A. VENDA APROVADA (Soma Dinheiro)
    -- Apenas adiciona ao saldo se mudar para 'paid' ou 'verified' e NÃO vir de 'rejected'
    IF (TG_TABLE_NAME = 'transactions' AND TG_OP = 'UPDATE') THEN
        IF (NEW.status IN ('paid', 'verified') AND OLD.status NOT IN ('paid', 'verified', 'rejected')) THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) + NEW.net_value 
            WHERE id = NEW.user_id;
        END IF;

        -- LÓGICA DO ESTORNO
        -- Remove do saldo se estava aprovada e foi para chargeback
        IF (NEW.status = 'chargeback' AND OLD.status IN ('paid', 'verified')) THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) - NEW.net_value 
            WHERE id = NEW.user_id;
        END IF;
        
        -- LÓGICA DE REJEIÇÃO
        -- Se estava aprovada ('paid' ou 'verified') e foi rejeitada, remove do saldo
        IF (NEW.status = 'rejected' AND OLD.status IN ('paid', 'verified')) THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) - NEW.net_value 
            WHERE id = NEW.user_id;
        END IF;
        
        -- IMPORTANTE: Transações que vão de 'pending' para 'rejected' não fazem nada
        -- porque nunca foram adicionadas ao saldo
    END IF;

    -- B. SAQUE SOLICITADO (Subtrai na hora)
    IF (TG_TABLE_NAME = 'withdrawals' AND TG_OP = 'INSERT') THEN
        UPDATE public.profiles 
        SET balance = COALESCE(balance, 0) - NEW.amount 
        WHERE id = NEW.user_id;
    END IF;

    -- C. SAQUE CANCELADO (Devolve o dinheiro)
    IF (TG_TABLE_NAME = 'withdrawals' AND TG_OP = 'UPDATE') THEN
        IF (NEW.status = 'cancelled' AND OLD.status <> 'cancelled') THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) + NEW.amount 
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    -- D. AJUSTES DO ADMIN (Manual)
    IF (TG_TABLE_NAME = 'balance_adjustments' AND TG_OP = 'INSERT') THEN
        IF (NEW.type = 'add') THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) + NEW.amount 
            WHERE id = NEW.user_id;
        ELSIF (NEW.type = 'remove') THEN
            UPDATE public.profiles 
            SET balance = COALESCE(balance, 0) - NEW.amount 
            WHERE id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;

-- Verificar se o trigger está ativo
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trg_calc_transactions'
  AND trigger_schema = 'public';
