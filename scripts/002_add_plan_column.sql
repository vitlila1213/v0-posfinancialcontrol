-- Adicionar coluna de plano na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT NULL 
CHECK (plan IN ('basico', 'intermediario', 'top', NULL));

-- Atualizar a função de criação de perfil para incluir o campo plan
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    NULL -- Plano começa como NULL, admin precisa atribuir
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar notificação de tipo plan_assigned
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('receipt_uploaded', 'receipt_verified', 'receipt_rejected', 'withdrawal_requested', 'withdrawal_paid', 'plan_assigned'));
