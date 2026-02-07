import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("Recebido:", JSON.stringify(body))

    // 1. Extração segura dos dados
    const messageText = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text
    if (!messageText || body.data?.key?.fromMe) {
      return NextResponse.json({ ok: "Mensagem ignorada (origem própria ou vazia)" })
    }

    // 2. Chamada IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `Você é um assistente de agendamento. Extraia: servico, data (YYYY-MM-DD) e hora (HH:MM). 
          Responda APENAS JSON: {"servico": string, "data": string, "hora": string, "finalizado": boolean, "resposta": string}` 
        },
        { role: "user", content: messageText }
      ],
      response_format: { type: "json_object" }
    })

    const ai = JSON.parse(completion.choices[0].message.content || '{}')

    // 3. Salvar no Banco (Busca a primeira empresa cadastrada para garantir o MVP)
    const { data: empresa } = await supabase.from('empresas').select('id').limit(1).single()

    if (ai.finalizado && empresa) {
      const { error: insertError } = await supabase.from('agendamentos').insert([{
        empresa_id: empresa.id,
        servico: ai.servico,
        data_hora: `${ai.data}T${ai.hora}:00`,
        status: 'pendente'
      }])
      
      if (insertError) throw new Error("Erro ao inserir agendamento: " + insertError.message)
    }

    return NextResponse.json({ status: 'success', reply: ai.resposta })

  } catch (error: any) {
    console.error("ERRO DETALHADO:", error.message)
    return NextResponse.json({ error: 'Erro interno', details: error.message }, { status: 500 })
  }
}