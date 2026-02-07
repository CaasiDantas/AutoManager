'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, Clock, TrendingUp, Loader2, LogOut, MessageSquare, ShieldCheck } from "lucide-react"
import { useRouter } from 'next/navigation'

interface DashboardData {
  nome_fantasia: string
  segmento: string
  agendamentos: any[]
}

export default function Dashboard() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  useEffect(() => {
    async function getDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 1. Busca o perfil vinculado (Aqui o empresa_id não virá mais null!)
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (profile?.empresa_id) {
        // 2. Busca os dados da empresa e agendamentos simultaneamente
        const [empresaRes, agendamentosRes] = await Promise.all([
          supabase.from('empresas').select('*').eq('id', profile.empresa_id).single(),
          supabase.from('agendamentos').select('*, contatos(nome)').eq('empresa_id', profile.empresa_id)
        ])

        if (empresaRes.data) {
          setData({
            nome_fantasia: empresaRes.data.nome_fantasia,
            segmento: empresaRes.data.segmento,
            agendamentos: agendamentosRes.data || []
          })
        }
      }
      setLoading(false)
    }

    getDashboardData()
  }, [supabase, router])

  // Configuração dinâmica baseada no ramo da empresa
  const config = {
    clinica: { texto: "Pacientes", sub: "Consultas hoje" },
    oficina: { texto: "Veículos", sub: "Serviços hoje" },
    salao: { texto: "Clientes", sub: "Cortes agendados" },
    default: { texto: "Agendamentos", sub: "Gestão do dia" }
  }[data?.segmento?.toLowerCase() || 'default'] || { texto: "Agendamentos", sub: "Gestão do dia" }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Carregando seu painel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 bg-[#f8fafc] min-h-screen dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Sistema Ativo
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              {data?.nome_fantasia || 'Minha Empresa'} <span className="text-slate-400">👋</span>
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Gestão inteligente para <span className="text-slate-900 font-bold capitalize">{data?.segmento || 'seu negócio'}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="hidden md:flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:bg-slate-50 transition-all">
              <ShieldCheck className="h-4 w-4" /> Configurações
            </button>
            <button 
              onClick={handleSignOut}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento IA</CardTitle>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 tracking-tight">R$ 0,00</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Previsão para este mês</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">{config.texto}</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <CalendarDays className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 tracking-tight">{data?.agendamentos.length || 0}</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">{config.sub}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agente Virtual</CardTitle>
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-emerald-600 tracking-tight">ONLINE</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">WhatsApp Monitorado</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tempo Economizado</CardTitle>
              <div className="p-2 bg-orange-50 rounded-lg">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-slate-900 tracking-tight">0h</div>
              <p className="text-xs text-slate-400 mt-1 font-medium">Processado pela IA</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <Card className="border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50 bg-white py-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black text-slate-900">Próximos Agendamentos</CardTitle>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest">Ver todos</button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data?.agendamentos.length === 0 ? (
              <div className="text-center py-24 bg-white px-4">
                <div className="bg-slate-50 h-20 w-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-slate-900 font-bold text-lg">Nenhum agendamento ainda</h3>
                <p className="text-slate-400 max-w-xs mx-auto mt-2 text-sm leading-relaxed">
                  Assim que os clientes começarem a falar com sua IA no WhatsApp, os horários aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {/* Aqui entrará o map dos agendamentos quando você tiver dados */}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}