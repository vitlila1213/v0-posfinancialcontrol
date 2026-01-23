-- Habilitar Realtime na tabela transactions
-- Isso permite que o Supabase envie eventos em tempo real quando há INSERT, UPDATE ou DELETE

-- 1. Habilitar publicação de mudanças para a tabela transactions
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- 2. Verificar se está habilitado
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'transactions';

-- Nota: As políticas RLS já existem na tabela transactions.
-- O Realtime respeitará essas políticas automaticamente.
-- Admins verão todas as transações, clientes verão apenas as suas.

-- Configuração adicional: garantir que a replica identity está configurada
-- Isso é necessário para que o Realtime funcione corretamente com UPDATEs
ALTER TABLE transactions REPLICA IDENTITY FULL;

-- Verificar a configuração
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'transactions';
