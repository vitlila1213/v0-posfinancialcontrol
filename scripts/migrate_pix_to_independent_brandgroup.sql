-- ==========================================
-- Migração: PIX como Brand Group Independente
-- ==========================================
-- PIX não é uma transação de cartão, então não deve estar vinculado a bandeiras
-- Vamos criar um brand_group "PIX" separado para as taxas de PIX

-- 1. Adicionar "PIX" como um brand_group válido no check constraint
ALTER TABLE custom_plan_rates DROP CONSTRAINT IF EXISTS custom_plan_rates_brand_group_check;
ALTER TABLE custom_plan_rates ADD CONSTRAINT custom_plan_rates_brand_group_check 
    CHECK (brand_group IN ('VISA_MASTER', 'ELO_AMEX', 'PIX'));

-- Verificar se já existem taxas PIX vinculadas a bandeiras
SELECT 
    cp.name as plano,
    cpr.brand_group,
    cpr.payment_type,
    cpr.rate
FROM custom_plan_rates cpr
JOIN custom_plans cp ON cp.id = cpr.plan_id
WHERE cpr.payment_type IN ('pix_conta', 'pix_qrcode')
ORDER BY cp.name, cpr.brand_group, cpr.payment_type;

-- 2. Para cada plano, criar taxas PIX no brand_group "PIX" usando as taxas de VISA_MASTER
-- (assumindo que as taxas de PIX são iguais para todas as bandeiras)
INSERT INTO custom_plan_rates (plan_id, brand_group, payment_type, installments, rate)
SELECT DISTINCT
    cpr.plan_id,
    'PIX' as brand_group,
    cpr.payment_type,
    NULL::integer as installments,
    cpr.rate
FROM custom_plan_rates cpr
WHERE cpr.payment_type IN ('pix_conta', 'pix_qrcode')
    AND cpr.brand_group = 'VISA_MASTER'
    AND NOT EXISTS (
        SELECT 1 
        FROM custom_plan_rates cpr2 
        WHERE cpr2.plan_id = cpr.plan_id 
            AND cpr2.brand_group = 'PIX' 
            AND cpr2.payment_type = cpr.payment_type
    );

-- 3. Remover as taxas de PIX das bandeiras VISA_MASTER e ELO_AMEX
-- (PIX não deve mais estar vinculado a bandeiras de cartão)
DELETE FROM custom_plan_rates
WHERE payment_type IN ('pix_conta', 'pix_qrcode')
    AND brand_group IN ('VISA_MASTER', 'ELO_AMEX');

-- 4. Verificar o resultado final
SELECT 
    cp.name as plano,
    cpr.brand_group,
    cpr.payment_type,
    cpr.rate
FROM custom_plan_rates cpr
JOIN custom_plans cp ON cp.id = cpr.plan_id
WHERE cpr.payment_type IN ('pix_conta', 'pix_qrcode')
    OR cpr.brand_group = 'PIX'
ORDER BY cp.name, cpr.brand_group, cpr.payment_type;

-- 5. Atualizar o tipo BrandGroup para incluir "PIX"
-- Isso é feito no código TypeScript, não no SQL

COMMENT ON TABLE custom_plan_rates IS 'Taxas personalizadas por plano. PIX possui brand_group próprio "PIX", separado das bandeiras de cartão.';
