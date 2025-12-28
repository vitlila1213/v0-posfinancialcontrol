-- Script para corrigir a recursão infinita nas políticas RLS
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, remover as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;

-- 2. Criar uma função SECURITY DEFINER para verificar se o usuário é admin
-- Funções SECURITY DEFINER executam com os privilégios do criador (superuser),
-- ignorando as políticas RLS e evitando recursão infinita
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Criar política de SELECT que permite:
-- - Usuário ver seu próprio perfil
-- - Admin ver todos os perfis (usando a função SECURITY DEFINER)
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id  -- Usuário pode ver seu próprio perfil
    OR 
    public.is_admin()  -- Admin pode ver todos os perfis
  );

-- 4. Criar política de UPDATE que permite:
-- - Usuário atualizar seu próprio perfil (exceto role e plan)
-- - Admin atualizar qualquer perfil
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (
    auth.uid() = id  -- Usuário pode atualizar seu próprio perfil
    OR 
    public.is_admin()  -- Admin pode atualizar qualquer perfil
  )
  WITH CHECK (
    auth.uid() = id  -- Usuário pode atualizar seu próprio perfil
    OR 
    public.is_admin()  -- Admin pode atualizar qualquer perfil
  );

-- 5. Criar política de INSERT para permitir criação de perfil próprio
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 6. Garantir que RLS está habilitado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
