import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

// Forçamos a inicialização dentro da função para evitar erros de ambiente no build
export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json()
    const messageText = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text

    if (!messageText) return NextResponse.json({ ok: "Sem mensagem" })

    // TESTE DA OPENAI
    let ai;
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Extraia servico, data, hora em JSON: {\"servico\": \"\", \"data\": \"\", \"hora\": \"\", \"finalizado\": true, \"resposta\": \"\"}" },
          { role: "user", content: messageText }
        ],
        response_format: { type: "json_object" }
      })
      ai = JSON.parse(completion.choices[0].message.content || '{}')
    } catch (err: any) {
      console.error("ERRO OPENAI:", err.message)
      return NextResponse.json({ error: "Erro na OpenAI. Verifique saldo/chave.", details: err.message }, { status: 500 })
    }

    // TESTE DO SUPABASE
    const { data: empresa, error: empError } = await supabase.from('empresas').select('id').limit(1).single()
    
    if (empError || !empresa) {
      return NextResponse.json({ error: "Empresa não encontrada no banco." }, { status: 500 })
    }

    if (ai.finalizado) {
      const { error: insError } = await supabase.from('agendamentos').insert([{
        empresa_id: empresa.id,
        servico: ai.servico || 'Serviço não identificado',
        data_hora: ai.data && ai.hora ? `${ai.data}T${ai.hora}:00` : new Date().toISOString(),
        status: 'pendente'
      }])

      if (insError) {
        return NextResponse.json({ error: "Erro ao salvar agendamento", details: insError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ status: 'success', reply: ai.resposta })

  } catch (error: any) {
    return NextResponse.json({ error: 'Erro crítico no servidor', details: error.message }, { status: 500 })
  }
}