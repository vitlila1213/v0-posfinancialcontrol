import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 })
    }

    console.log("[v0] Processando imagem de comprovante com GPT-4 Vision...")

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise este comprovante de pagamento e extraia as seguintes informações em formato JSON:
              {
                "amount": number (valor da transação),
                "payment_type": "credito" | "debito" | "pix_qr" | "pix_conta",
                "installments": number (número de parcelas, 1 se não especificado)
              }
              
              Regras importantes:
              - Se for cartão de crédito e tiver parcelas, retorne o número correto
              - Se for débito, sempre 1 parcela
              - Se for PIX com QR Code, use "pix_qr"
              - Se for PIX transferência/conta, use "pix_conta"
              - Retorne apenas o JSON, sem texto adicional`,
            },
            {
              type: "image_url",
              image_url: {
                url: image,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    })

    const responseText = completion.choices[0]?.message?.content?.trim()
    console.log("[v0] Resposta da OpenAI:", responseText)

    if (!responseText) {
      throw new Error("Nenhuma resposta da OpenAI")
    }

    // Parse JSON response
    const data = JSON.parse(responseText)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Erro ao processar imagem:", error)
    return NextResponse.json({ error: "Erro ao processar imagem" }, { status: 500 })
  }
}
