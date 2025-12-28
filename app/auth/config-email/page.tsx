import Link from "next/link"
import { ArrowLeft, Mail, Settings, CheckCircle, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function ConfigEmailPage() {
  return (
    <div className="flex min-h-screen w-full bg-slate-950 p-4">
      <div className="mx-auto w-full max-w-4xl py-8">
        <Link href="/auth/sucesso">
          <Button variant="ghost" className="mb-6 text-slate-400 hover:text-white">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Configuração de Emails no Supabase</h1>
          <p className="text-slate-400">Guia completo para configurar o envio de emails de confirmação em produção</p>
        </div>

        <div className="space-y-6">
          {/* Alert sobre desenvolvimento */}
          <Alert className="bg-amber-500/10 border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <AlertTitle className="text-amber-400 font-semibold">Ambiente de Desenvolvimento</AlertTitle>
            <AlertDescription className="text-slate-300">
              Em desenvolvimento, o Supabase não envia emails reais para endereços externos. Os emails são capturados em
              um sistema interno chamado Inbucket (acessível apenas localmente) ou não são enviados.
            </AlertDescription>
          </Alert>

          {/* Opção 1: Confirmar manualmente */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Opção 1: Confirmar Usuário Manualmente (Desenvolvimento)
              </CardTitle>
              <CardDescription className="text-slate-400">Ideal para testes rápidos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-3 text-slate-300">
                <li>
                  Acesse o{" "}
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/auth/users`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline hover:text-emerald-300"
                  >
                    Supabase Dashboard → Authentication → Users
                  </a>
                </li>
                <li>Encontre o usuário que você acabou de criar</li>
                <li>
                  Clique nos três pontos (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded">...</code>) ao lado
                  do usuário
                </li>
                <li>
                  Selecione <strong>"Confirm email"</strong>
                </li>
                <li>Agora o usuário pode fazer login normalmente!</li>
              </ol>
            </CardContent>
          </Card>

          {/* Opção 2: Desabilitar confirmação */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                Opção 2: Desabilitar Confirmação de Email (Desenvolvimento)
              </CardTitle>
              <CardDescription className="text-slate-400">Apenas para ambiente de testes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-500/10 border-red-500/20">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300 text-sm">
                  <strong>Atenção:</strong> Não recomendado para produção! Esta opção permite que qualquer usuário faça
                  login sem confirmar o email.
                </AlertDescription>
              </Alert>

              <ol className="list-decimal list-inside space-y-3 text-slate-300">
                <li>
                  Acesse{" "}
                  <a
                    href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/auth/providers`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 underline hover:text-blue-300"
                  >
                    Supabase Dashboard → Authentication → Providers
                  </a>
                </li>
                <li>
                  Clique em <strong>Email</strong>
                </li>
                <li>
                  Desmarque <strong>"Confirm email"</strong>
                </li>
                <li>Clique em "Save"</li>
              </ol>
            </CardContent>
          </Card>

          {/* Opção 3: Configurar SMTP (Produção) */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Mail className="h-5 w-5 text-purple-500" />
                Opção 3: Configurar Provedor SMTP (Produção)
              </CardTitle>
              <CardDescription className="text-slate-400">
                Necessário para enviar emails reais em produção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Para enviar emails reais, você precisa configurar um provedor SMTP como SendGrid, Resend, AWS SES, ou
                Mailgun.
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-white mb-2">Passo 1: Escolha um provedor SMTP</h4>
                  <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 ml-4">
                    <li>
                      <strong>Resend:</strong> Moderno, fácil de usar (recomendado)
                    </li>
                    <li>
                      <strong>SendGrid:</strong> Popular, plano gratuito generoso
                    </li>
                    <li>
                      <strong>AWS SES:</strong> Barato, requer configuração técnica
                    </li>
                    <li>
                      <strong>Mailgun:</strong> Confiável, bom para volume alto
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Passo 2: Obtenha credenciais SMTP</h4>
                  <p className="text-sm text-slate-300">
                    Crie uma conta no provedor escolhido e obtenha: Host SMTP, Porta, Usuário e Senha
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Passo 3: Configure no Supabase</h4>
                  <ol className="list-decimal list-inside text-sm text-slate-300 space-y-2 ml-4">
                    <li>
                      Acesse{" "}
                      <a
                        href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/settings/auth`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 underline hover:text-purple-300"
                      >
                        Supabase Dashboard → Project Settings → Auth
                      </a>
                    </li>
                    <li>Role até "SMTP Settings"</li>
                    <li>Marque "Enable Custom SMTP"</li>
                    <li>Preencha os campos com as credenciais do seu provedor</li>
                    <li>Clique em "Save"</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-2">Passo 4: Personalize os templates (opcional)</h4>
                  <p className="text-sm text-slate-300">
                    Em <strong>Authentication → Email Templates</strong>, você pode personalizar o design e o conteúdo
                    dos emails de confirmação.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dicas adicionais */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <CardTitle className="text-white">Dicas Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Sempre teste o envio de emails antes de colocar em produção</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Configure SPF, DKIM e DMARC no seu domínio para evitar que emails caiam no spam</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Use um domínio verificado para ter melhor taxa de entrega</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Monitore os logs de Auth no Supabase para identificar problemas de envio (Dashboard → Logs → Auth
                    Logs)
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Link href="/auth/sucesso">
            <Button className="bg-emerald-600 hover:bg-emerald-700">Voltar para a página de sucesso</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
