'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function AdminDashboard() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email === 'admin@gmail.com') {
        setAuthorized(true)
      } else {
        router.push('/') // Manda pro dashboard comum se não for admin
      }
    }
    checkAdmin()
  }, [])

  if (!authorized) return <p className="p-8 text-center">Verificando credenciais de Admin...</p>

  return (
    <div className="p-8 bg-slate-900 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">Painel Master (Admin)</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-800 border-slate-700 text-white">
          <CardHeader><CardTitle>Empresas Totais</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold">1</div></CardContent>
        </Card>
        {/* Outros cards de métricas aqui */}
      </div>
    </div>
  )
}