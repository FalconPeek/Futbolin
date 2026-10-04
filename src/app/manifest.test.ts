import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('manifest', () => {
  const m = manifest()

  it('should have name "Picado"', () => {
    expect(m.name).toBe('Picado')
  })

  it('should have short_name "Picado"', () => {
    expect(m.short_name).toBe('Picado')
  })

  it('should have lang "es-AR"', () => {
    expect(m.lang).toBe('es-AR')
  })

  it('should have start_url "/grupos"', () => {
    expect(m.start_url).toBe('/grupos')
  })

  it('should have display "standalone"', () => {
    expect(m.display).toBe('standalone')
  })

  it('should have background_color from dark theme', () => {
    expect(m.background_color).toBe('#0a0e0c')
  })

  it('should have theme_color from dark theme', () => {
    expect(m.theme_color).toBe('#0a0e0c')
  })

  it('should have 192px icon with PNG type', () => {
    const icon192 = m.icons?.find((icon) => icon.sizes === '192x192')
    expect(icon192).toBeDefined()
    expect(icon192?.type).toBe('image/png')
    expect(icon192?.src).toBe('/icon/192')
  })

  it('should have 512px icon with PNG type', () => {
    const icon512 = m.icons?.find((icon) => icon.sizes === '512x512')
    expect(icon512).toBeDefined()
    expect(icon512?.type).toBe('image/png')
    expect(icon512?.src).toBe('/icon/512')
  })

  it('should have maskable 512px icon', () => {
    const maskableIcons = m.icons?.filter(
      (icon) => icon.sizes === '512x512' && icon.purpose?.includes('maskable')
    )
    expect(maskableIcons).toHaveLength(1)
    expect(maskableIcons?.[0].type).toBe('image/png')
  })
})
