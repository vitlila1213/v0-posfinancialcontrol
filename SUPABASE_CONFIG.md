# Configuração do Supabase para Autenticação

## URLs de Redirecionamento

### Problema Identificado
As URLs estavam duplicando o caminho, resultando em:
- ❌ `https://v0-posfinancialcontrol-aq.vercel.app/auth/login/auth/client/login`
- ❌ `https://v0-posfinancialcontrol-aq.vercel.app/auth/login/auth/client/update-password`

Isso acontecia porque o Supabase usava o `Referer` header como base para construir as URLs.

### Solução Aplicada
O código agora usa URLs absolutas hardcoded para produção:
- ✅ `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback`
- ✅ `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback?type=recovery`

## Configuração no Painel do Supabase

Acesse o painel do Supabase: https://supabase.com/dashboard/project/dskkafxnppyyxzeizvln

### 1. Authentication > URL Configuration

#### Site URL
```
https://v0-posfinancialcontrol-aq.vercel.app
```
⚠️ **Sem barra `/` no final!**

#### Redirect URLs
Adicione estas URLs (uma por linha):

```
https://v0-posfinancialcontrol-aq.vercel.app/**
https://v0-posfinancialcontrol-aq.vercel.app/auth/callback
https://v0-posfinancialcontrol-aq.vercel.app/auth/client/update-password
http://localhost:3000/**
http://localhost:3000/auth/callback
```

**Clique em "Save" e aguarde 2-3 minutos para propagação.**

### 2. Email Templates (Verificação)

Em **Authentication > Email Templates**, verifique os templates:

#### Confirm signup
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
```

#### Reset Password
```
{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery
```

## Fluxos de Autenticação

### 1. Cadastro de Conta
1. Cliente/Admin preenche formulário de cadastro
2. Supabase envia email de confirmação
3. Link redireciona para: `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback?token_hash=...&type=signup`
4. Callback valida token e redireciona para `/cliente` ou `/admin`

### 2. Recuperação de Senha
1. Usuário clica em "Esqueci minha senha"
2. Supabase envia email de recuperação
3. Link redireciona para: `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback?token_hash=...&type=recovery`
4. Callback detecta `type=recovery` e redireciona para `/auth/client/update-password`
5. Usuário define nova senha
6. Sistema faz logout e redireciona para login

### 3. Login Normal
1. Usuário entra com email/senha
2. Sistema verifica role no banco
3. Redireciona para `/cliente` (client) ou `/admin` (admin)

## Testando em Produção

### Teste de Cadastro
1. Acesse: https://v0-posfinancialcontrol-aq.vercel.app/auth/client/signup
2. Preencha o formulário
3. Verifique seu email
4. **O link deve começar com `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback`**
5. Clique no link e confirme que foi redirecionado corretamente

### Teste de Recuperação de Senha
1. Acesse: https://v0-posfinancialcontrol-aq.vercel.app/auth/client/login
2. Clique em "Esqueci minha senha"
3. Digite seu email
4. Verifique seu email
5. **O link deve começar com `https://v0-posfinancialcontrol-aq.vercel.app/auth/callback`**
6. Clique no link e confirme que abriu a página de redefinição
7. Digite nova senha e confirme

## Desenvolvimento Local

Para testar localmente, o sistema automaticamente detecta `localhost` e usa as URLs corretas.

Certifique-se de ter nas Redirect URLs do Supabase:
```
http://localhost:3000/**
http://localhost:3000/auth/callback
```

## Troubleshooting

### Link ainda aponta para localhost em produção
- ✅ Solução: Já corrigido no código com URLs absolutas
- Faça redeploy da aplicação na Vercel

### Página redireciona para login após clicar no link
- Verifique se o token não expirou (1 hora de validade)
- Confirme que `/auth/callback` está nas Redirect URLs
- Abra o console (F12) e procure logs `[v0]`

### "One-time token not found"
- O link já foi usado ou expirou
- Solicite um novo link
- Verifique se o callback está configurado corretamente

### Erro "Email link is invalid"
- Confirme que a Site URL está configurada corretamente
- Verifique se todas as Redirect URLs foram salvas
- Aguarde 5 minutos e tente novamente

## Logs de Debug

O sistema inclui logs detalhados no console do navegador:

```javascript
[v0] Signing up with redirect: https://...
[v0] Callback triggered: { code: "present", type: "recovery", ... }
[v0] Session established for user: abc123...
[v0] Recovery flow detected, redirecting to update-password
[v0] Checking recovery session...
[v0] Valid session found
[v0] Updating password...
[v0] Password updated successfully
```

Abra o console (F12) durante o processo para diagnosticar problemas.

## Variáveis de Ambiente

Confirme que estas variáveis estão configuradas na Vercel:

```
NEXT_PUBLIC_SUPABASE_URL=https://dskkafxnppyyxzeizvln.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Após qualquer mudança, faça redeploy do projeto.

## Checklist de Configuração

- [ ] Site URL configurada: `https://v0-posfinancialcontrol-aq.vercel.app`
- [ ] Redirect URLs adicionadas (todas as 5 URLs)
- [ ] Configurações salvas no Supabase
- [ ] Aguardado 2-3 minutos para propagação
- [ ] Redeploy feito na Vercel
- [ ] Teste de cadastro realizado
- [ ] Teste de recuperação de senha realizado
- [ ] Links de email verificados (devem começar com URL de produção)
