import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Crear respuesta
  const response = NextResponse.next()

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Solo establecer cookies si realmente han cambiado
              const currentValue = request.cookies.get(name)?.value
              if (currentValue !== value) {
                response.cookies.set(name, value, options)
              }
            })
          },
        },
      }
    )

    // Solo verificar sesión, no forzar refresh
    await supabase.auth.getSession()
    
  } catch (error) {
    console.error('Middleware error:', error)
    // No hacer nada, continuar con la petición
  }

  return response
}

export const config = {
  matcher: [
    // Solo proteger rutas que necesiten autenticación
    '/surveys/:path*',
    '/analytics/:path*',
    '/profile/:path*',
  ],
}