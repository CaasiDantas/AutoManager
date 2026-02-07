'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from 'next/link'

export default function RegisterPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [segmento, setSegmento] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const nomeEmpresa = formData.get('nomeEmpresa') as string
    const ramoPersonalizado = formData.get('ramoPersonalizado') as string
    const finalSegmento = segmento === 'outro' ? ramoPersonalizado : segmento

    try {
      // 1. Criar a Empresa
      const { data: empresa, error: empError } = await supabase
        .from('empresas')
        .insert([{ 
          nome_fantasia: nomeEmpresa, 
          segmento: finalSegmento,
          slug: nomeEmpresa.toLowerCase().trim().replace(/\s+/g, '-')
        }])
        .select()
        .single()

      if (empError) throw empError

      // 2. Criar o usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      })

      if (authError) throw authError

      if (authData.user && empresa) {
        // 3. INSERÇÃO MANUAL DO PROFILE (O pulo do gato)
        // Como matamos o Trigger, nós criamos a linha aqui com todos os dados
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: authData.user.id,
            empresa_id: empresa.id,
            full_name: nomeEmpresa,
            role: 'owner'
          }])

        if (profileError) {
            // Se der erro aqui, é RLS. Vamos tentar um update caso o trigger ainda tenha rodado
            await supabase.from('profiles').update({ empresa_id: empresa.id }).eq('id', authData.user.id)
        }

        alert("Tudo pronto! Sua empresa foi vinculada.")
        router.push('/login')
      }

    } catch (err: any) {
      console.error("Erro no cadastro:", err)
      setErrorMsg(err.message || "Ocorreu um erro.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-xl">
        <Link href="/login" className="flex items-center text-sm text-muted-foreground mb-4 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar para o login
        </Link>
        
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-slate-900">Nova Conta Business</CardTitle>
            <p className="text-muted-foreground mt-2">Sua plataforma de agendamentos com IA</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
                <Input id="nomeEmpresa" name="nomeEmpresa" placeholder="Ex: Oficina Prime" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Acesso</Label>
                <Input id="email" name="email" type="email" placeholder="contato@empresa.com" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" required />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Qual seu ramo de atuação?</Label>
                <Select onValueChange={setSegmento} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica">Clínica / Consultório</SelectItem>
                    <SelectItem value="oficina">Oficina Mecânica</SelectItem>
                    <SelectItem value="salao">Salão de Beleza / Barbearia</SelectItem>
                    <SelectItem value="outro">Outro (Especificar)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {segmento === 'outro' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="ramoPersonalizado">Descreva seu ramo</Label>
                  <Input id="ramoPersonalizado" name="ramoPersonalizado" placeholder="Ex: Pet Shop" required />
                </div>
              )}

              {errorMsg && (
                <div className="md:col-span-2 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" className="w-full md:col-span-2 bg-slate-900 hover:bg-slate-800 text-white h-12 text-lg font-bold transition-all" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Configurando...
                  </>
                ) : (
                  "Criar Minha Plataforma"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}