import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Usamos a SERVICE_ROLE para ter poder total no banco via backend
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Pegando a mensagem e o número do cliente (Padrão Evolution API)
    const messageText = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text
    const phone = body.data?.key?.remoteJid?.split('@')[0] 

    if (!messageText || body.data?.key?.fromMe) return NextResponse.json({ ok: true })

    // CHAMADA PARA A IA
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: `Você é uma assistente de agendamento inteligente. 
          Sua tarefa é extrair: servico, data (YYYY-MM-DD) e hora (HH:MM).
          Se o cliente não informar algum dado, peça educadamente.
          Responda APENAS um JSON: {"servico": string, "data": string, "hora": string, "resposta_cliente": string, "finalizado": boolean}` 
        },
        { role: "user", content: messageText }
      ],
      response_format: { type: "json_object" }
    })

    const ai = JSON.parse(completion.choices[0].message.content || '{}')

    // Se a IA conseguiu todos os dados, salvamos
    if (ai.finalizado) {
      // 1. Buscar a primeira empresa (Para o MVP)
      const { data: empresa } = await supabase.from('empresas').select('id').single()

      if (empresa) {
        // 2. Salvar Agendamento
        await supabase.from('agendamentos').insert([{
          empresa_id: empresa.id,
          servico: ai.servico,
          data_hora: `${ai.data}T${ai.hora}:00`,
          status: 'pendente'
        }])
      }
    }

    // Aqui você enviaria a resposta de volta para o WhatsApp (ai.resposta_cliente)
    return NextResponse.json({ status: 'success', reply: ai.resposta_cliente })

  } catch (error) {
    console.error("Erro no Webhook:", error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}