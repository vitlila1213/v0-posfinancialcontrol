-- Script para criar trigger automático de criação de perfil
-- Este trigger cria automaticamente um perfil quando um novo usuário é registrado

-- Criar função que será executada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Extrair o role do metadata, default para 'client'
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  
  -- Log para debug
  RAISE NOTICE 'Creating profile for user %, role: %', NEW.id, v_role;
  
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    plan,
    balance,
    pending_balance
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role,
    NULL,  -- Plano começa como NULL
    0.00,  -- Balance inicial
    0.00   -- Pending balance inicial
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    role = COALESCE(EXCLUDED.role, profiles.role),
    updated_at = NOW();
    
  RAISE NOTICE 'Profile created successfully for user %', NEW.id;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha o signup
    RAISE WARNING 'Error creating profile for user %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger que executa após a criação de um novo usuário
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Comentário
COMMENT ON FUNCTION public.handle_new_user() IS 'Automaticamente cria um perfil quando um novo usuário se registra via Supabase Auth';
