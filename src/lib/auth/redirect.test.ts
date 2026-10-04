import { describe, it, expect } from 'vitest'
import {
  DEFAULT_AFTER_LOGIN,
  isPublicPath,
  isAuthPage,
  safeNextPath,
  loginRedirectPath,
} from './redirect'

describe('redirect utilities', () => {
  describe('isPublicPath', () => {
    it('should return true for root', () => {
      expect(isPublicPath('/')).toBe(true)
    })

    it('should return true for auth pages', () => {
      expect(isPublicPath('/ingresar')).toBe(true)
      expect(isPublicPath('/registrarme')).toBe(true)
    })

    it('should return true for PWA files', () => {
      expect(isPublicPath('/offline')).toBe(true)
      expect(isPublicPath('/manifest.webmanifest')).toBe(true)
      expect(isPublicPath('/sw.js')).toBe(true)
      expect(isPublicPath('/favicon.ico')).toBe(true)
    })

    it('should return true for icon paths', () => {
      expect(isPublicPath('/icon/192')).toBe(true)
      expect(isPublicPath('/apple-icon')).toBe(true)
      expect(isPublicPath('/apple-icon-180')).toBe(true)
    })

    it('should return true for Next.js internal paths', () => {
      expect(isPublicPath('/_next/static/chunks/main')).toBe(true)
      expect(isPublicPath('/_next/image')).toBe(true)
    })

    it('should return false for private routes', () => {
      expect(isPublicPath('/grupos')).toBe(false)
      expect(isPublicPath('/g/abc')).toBe(false)
      expect(isPublicPath('/g/abc/partidos')).toBe(false)
      expect(isPublicPath('/perfil')).toBe(false)
    })
  })

  describe('isAuthPage', () => {
    it('should return true for login and signup pages', () => {
      expect(isAuthPage('/ingresar')).toBe(true)
      expect(isAuthPage('/registrarme')).toBe(true)
    })

    it('should return false for other pages', () => {
      expect(isAuthPage('/')).toBe(false)
      expect(isAuthPage('/grupos')).toBe(false)
      expect(isAuthPage('/offline')).toBe(false)
    })
  })

  describe('safeNextPath', () => {
    it('should accept internal paths starting with /', () => {
      expect(safeNextPath('/g/abc/partidos?x=1')).toBe('/g/abc/partidos?x=1')
      expect(safeNextPath('/unirse/ABCD2345')).toBe('/unirse/ABCD2345')
      expect(safeNextPath('/grupos')).toBe('/grupos')
      expect(safeNextPath('/perfil')).toBe('/perfil')
    })

    it('should reject double-slash protocol', () => {
      expect(safeNextPath('//evil.com')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('//example.com/path')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject full URLs', () => {
      expect(safeNextPath('https://evil.com')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('http://example.com')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('ftp://files.example.com')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject backslash escapes', () => {
      expect(safeNextPath('/\\evil.com')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject empty and null/undefined', () => {
      expect(safeNextPath('')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath(undefined)).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject auth pages', () => {
      expect(safeNextPath('/ingresar')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('/registrarme')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject paths with control characters', () => {
      expect(safeNextPath('/path\n/bad')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('/path\t/bad')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('/path\x00/bad')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject javascript: URLs', () => {
      expect(safeNextPath('javascript:alert(1)')).toBe(DEFAULT_AFTER_LOGIN)
    })

    it('should reject paths not starting with /', () => {
      expect(safeNextPath('grupos')).toBe(DEFAULT_AFTER_LOGIN)
      expect(safeNextPath('g/abc')).toBe(DEFAULT_AFTER_LOGIN)
    })
  })

  describe('loginRedirectPath', () => {
    it('should encode pathname and search', () => {
      const result = loginRedirectPath('/grupos', '')
      expect(result).toBe('/ingresar?next=%2Fgrupos')
    })

    it('should encode pathname with query string', () => {
      const result = loginRedirectPath('/g/abc/partidos', '?x=1')
      expect(result).toBe('/ingresar?next=%2Fg%2Fabc%2Fpartidos%3Fx%3D1')
    })

    it('should encode special characters', () => {
      const result = loginRedirectPath('/unirse/AB-CD_2345', '')
      expect(result).toBe('/ingresar?next=%2Funirse%2FAB-CD_2345')
    })
  })
})
