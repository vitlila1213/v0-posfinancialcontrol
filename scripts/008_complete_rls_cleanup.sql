-- Script completo para limpar todas as policies e funções que causam recursão infinita
-- e criar policies simples que não causam recursão

-- 1. REMOVER TODAS AS POLICIES EXISTENTES
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON profiles;

-- 2. REMOVER FUNÇÃO is_admin() SE EXISTIR (causa recursão)
DROP FUNCTION IF EXISTS is_admin();

-- 3. DESABILITAR RLS TEMPORARIAMENTE
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. HABILITAR RLS NOVAMENTE
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. CRIAR POLICIES SIMPLES SEM RECURSÃO
-- Usuários podem ver apenas seu próprio perfil
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Usuários podem inserir apenas seu próprio perfil
CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- NOTA: Para operações de admin (buscar role de outros usuários, etc),
-- o código deve usar o service_role_key que ignora RLS completamente
