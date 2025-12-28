"use server"

import { z } from "zod"

const BalanceAdjustmentVoiceSchema = z.object({
  type: z.enum(["add", "remove"]),
  amount: z.number(),
  reason: z.string(),
})

export type BalanceAdjustmentVoiceResult = z.infer<typeof BalanceAdjustmentVoiceSchema>

export async function processBalanceAdjustmentVoice(audioBlob: Blob): Promise<BalanceAdjustmentVoiceResult | null> {
  try {
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
    console.log("[v0] Balance Adjustment Voice - Transcrição:", transcription)

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
            content: `Você é um assistente que preenche formulários de ajuste financeiro.

Sua tarefa: Analisar o texto transcrito e extrair as informações para preencher um formulário de ajuste de saldo.

Saída: JSON estrito com { "type": "add" | "remove", "amount": number, "reason": string }

Regras de 'type' (Tipo de Ajuste):
- Se o texto contiver: "adicionar", "somar", "bônus", "crédito", "pagar", "reembolso", "dar", "conceder" → Retorne "add"
- Se o texto contiver: "remover", "tirar", "subtrair", "descontar", "taxa", "multa", "estorno", "cobrar", "debitar" → Retorne "remove"
- Padrão: "add"

Regras de 'amount' (Valor):
- Extraia o valor numérico mencionado. Ignore "R$", "reais", "real"
- Converta números por extenso: "cinquenta" → 50, "cem" → 100, "mil" → 1000
- Se não houver valor mencionado, use 0

Regras de 'reason' (Motivo):
- Todo o texto que explica o "porquê" deve ir para o campo reason
- Melhore a gramática e clareza se necessário
- Se não houver motivo explícito, infira um baseado no contexto

Exemplos:
"Descontar 15 reais por taxa de cancelamento" → {"type": "remove", "amount": 15, "reason": "Taxa de cancelamento"}
"Bônus de meta batida 100 reais" → {"type": "add", "amount": 100, "reason": "Bônus de meta batida"}
"Remover 50 por atraso na entrega" → {"type": "remove", "amount": 50, "reason": "Atraso na entrega"}
"Adicionar 200 reais de comissão extra" → {"type": "add", "amount": 200, "reason": "Comissão extra"}
"Estornar 35 reais" → {"type": "remove", "amount": 35, "reason": "Estorno"}

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional.`,
          },
          {
            role: "user",
            content: transcription,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    })

    if (!gptResponse.ok) {
      throw new Error("Erro ao processar comando com GPT")
    }

    const gptData = await gptResponse.json()
    const resultText = gptData.choices[0].message.content
    console.log("[v0] Balance Adjustment Voice - GPT Result:", resultText)

    const result = JSON.parse(resultText)
    return BalanceAdjustmentVoiceSchema.parse(result)
  } catch (error) {
    console.error("[v0] Erro ao processar comando de voz de ajuste de saldo:", error)
    return null
  }
}
