export const DEFAULT_AFTER_LOGIN = '/grupos'

export function isPublicPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/ingresar' || pathname === '/registrarme' || pathname === '/offline' ||
    pathname === '/manifest.webmanifest' || pathname === '/sw.js' || pathname === '/favicon.ico') {
    return true
  }

  if (pathname.startsWith('/icon') || pathname.startsWith('/apple-icon') || pathname.startsWith('/_next')) {
    return true
  }

  return false
}

export function isAuthPage(pathname: string): boolean {
  return pathname === '/ingresar' || pathname === '/registrarme'
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || typeof next !== 'string') {
    return DEFAULT_AFTER_LOGIN
  }

  if (next.startsWith('//') || next.startsWith('/\\')) {
    return DEFAULT_AFTER_LOGIN
  }

  if (next.includes('://')) {
    return DEFAULT_AFTER_LOGIN
  }

  if (!/^\//.test(next)) {
    return DEFAULT_AFTER_LOGIN
  }

  if (isAuthPage(next)) {
    return DEFAULT_AFTER_LOGIN
  }

  for (let i = 0; i < next.length; i++) {
    const code = next.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) {
      return DEFAULT_AFTER_LOGIN
    }
  }

  return next
}

export function loginRedirectPath(pathname: string, search: string): string {
  return `/ingresar?next=${encodeURIComponent(pathname + search)}`
}
