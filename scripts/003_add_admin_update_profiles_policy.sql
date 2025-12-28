-- Script para permitir que admins atualizem qualquer perfil (incluindo atribuir planos)
-- Execute este script no Supabase

-- Primeiro, verifica se a política já existe e remove se necessário
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Cria política para permitir que admins atualizem qualquer perfil
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Também precisamos garantir que admins possam ver todos os clientes
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT
  USING (
    -- Admin pode ver todos os perfis
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
    OR
    -- Usuário pode ver seu próprio perfil
    auth.uid() = id
  );
