import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/database.types'
import { isPublicPath, isAuthPage, loginRedirectPath } from '@/lib/auth/redirect'

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll(cookiesToSet, headers) {
          // Las cookies refrescadas van al request (para los Server Components de este
          // mismo request) y a la respuesta (para el navegador).
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const search = request.nextUrl.search

  if (!data.user && !isPublicPath(pathname)) {
    const loginPath = loginRedirectPath(pathname, search)
    const redirectUrl = new URL(loginPath, request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  if (data.user && isAuthPage(pathname)) {
    const redirectUrl = new URL('/grupos', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return response
}
