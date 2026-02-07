import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 1. DEFINIÇÃO DE ROTAS
  const pathname = request.nextUrl.pathname
  
  // Rota do Webhook (Aberta para o WhatsApp/IA)
  const isWebhook = pathname.startsWith('/api/webhook')
  
  // Rotas de Autenticação (Abertas para o usuário deslogado)
  const isAuthPage = pathname === '/login' || pathname === '/register'

  // 2. LÓGICA DE PROTEÇÃO

  // Se for o Webhook, deixa passar direto (sem checar sessão)
  if (isWebhook) {
    return response
  }

  // Se NÃO está logado e NÃO está tentando entrar no Login/Register -> Manda para o Login
  if (!session && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se ESTÁ logado e tenta ir para Login ou Register -> Manda para o Dashboard (Home)
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// O Matcher diz ao Next.js em quais arquivos o middleware deve rodar
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback).*)'],
}