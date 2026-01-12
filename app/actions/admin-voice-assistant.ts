"use server"

import { z } from "zod"

const AdminVoiceCommandSchema = z.object({
  intent: z.enum([
    "navigate",
    "approve_payment",
    "reject_payment",
    "approve_receipt",
    "reject_receipt",
    "assign_plan",
    "adjust_balance",
    "filter_data",
    "search_client",
    "unknown",
  ]),
  data: z
    .object({
      page: z.enum(["dashboard", "clientes", "pagamentos", "comprovantes"]).optional(),
      clientName: z.string().optional(),
      planName: z.enum(["basic", "intermediario", "top"]).optional(),
      amount: z.number().optional(),
      action: z.enum(["add", "remove"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    })
    .optional(),
})

export type AdminVoiceCommand = z.infer<typeof AdminVoiceCommandSchema>

export async function processAdminVoiceCommand(audioBlob: Blob): Promise<AdminVoiceCommand> {
  try {
    // 1. Transcrever áudio com Whisper
    const formData = new FormData()
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", "whisper-1")

    const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      throw new Error("Erro ao transcrever áudio")
    }

    const { text: transcription } = await transcriptionResponse.json()
    console.log("[v0] Admin Voice Transcrição:", transcription)

    // 2. Processar com GPT-4o-mini para extrair intenção e dados
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de voz para painel administrativo do PagNextLevel. Analise o comando de voz do administrador e retorne um JSON estruturado.

Intenções possíveis:
- "navigate": navegar entre páginas (dashboard, clientes, pagamentos, comprovantes)
- "approve_payment": aprovar um pagamento/saque
- "reject_payment": rejeitar um pagamento/saque
- "approve_receipt": aprovar um comprovante pendente
- "reject_receipt": rejeitar um comprovante pendente
- "assign_plan": atribuir plano a um cliente (basic, intermediario, top)
- "adjust_balance": adicionar ou remover saldo de um cliente
- "filter_data": filtrar dados por período
- "search_client": buscar um cliente específico
- "unknown": quando não entender o comando

Campos de dados:
- page: "dashboard", "clientes", "pagamentos" ou "comprovantes"
- clientName: nome do cliente mencionado
- planName: "basic", "intermediario" ou "top"
- amount: valor numérico em reais
- action: "add" (adicionar) ou "remove" (remover)
- dateFrom: data inicial (formato ISO)
- dateTo: data final (formato ISO)

Exemplos:
"Ir para clientes" = {"intent": "navigate", "data": {"page": "clientes"}}
"Abrir pagamentos" = {"intent": "navigate", "data": {"page": "pagamentos"}}
"Aprovar este pagamento" = {"intent": "approve_payment"}
"Rejeitar comprovante" = {"intent": "reject_receipt"}
"Atribuir plano intermediário para João" = {"intent": "assign_plan", "data": {"clientName": "João", "planName": "intermediario"}}
"Adicionar 500 reais para Maria" = {"intent": "adjust_balance", "data": {"clientName": "Maria", "amount": 500, "action": "add"}}
"Buscar cliente Pedro" = {"intent": "search_client", "data": {"clientName": "Pedro"}}

IMPORTANTE: Retorne APENAS o JSON, sem texto adicional.`,
          },
          {
            role: "user",
            content: transcription,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    })

    if (!gptResponse.ok) {
      throw new Error("Erro ao processar comando com GPT")
    }

    const gptData = await gptResponse.json()
    const commandText = gptData.choices[0].message.content
    console.log("[v0] Admin Voice Comando GPT:", commandText)

    const command = JSON.parse(commandText)
    return AdminVoiceCommandSchema.parse(command)
  } catch (error) {
    console.error("[v0] Erro ao processar comando de voz do admin:", error)
    return { intent: "unknown" }
  }
}
