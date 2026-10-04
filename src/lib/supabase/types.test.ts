import { describe, it, expect } from 'vitest'
import { Constants } from '@/lib/database.types'

describe('database.types', () => {
  it('player_position enum has 15 values and includes POR', () => {
    const positions = Constants.public.Enums.player_position
    expect(positions).toHaveLength(15)
    expect(positions).toContain('POR')
  })

  it('tournament_format enum includes eliminacion', () => {
    const formats = Constants.public.Enums.tournament_format
    expect(formats).toContain('eliminacion')
  })

  it('match_status enum has correct values', () => {
    const statuses = Array.from(Constants.public.Enums.match_status).sort()
    expect(statuses).toEqual(['cancelado', 'finalizado', 'programado'])
  })

  it('rating_kind enum has campo and arquero', () => {
    const kinds = Constants.public.Enums.rating_kind
    expect(kinds).toContain('campo')
    expect(kinds).toContain('arquero')
  })
})
