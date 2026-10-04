import { ImageResponse } from 'next/og'

export function generateImageMetadata() {
  return [
    {
      id: '192',
      size: { width: 192, height: 192 },
      contentType: 'image/png',
    },
    {
      id: '512',
      size: { width: 512, height: 512 },
      contentType: 'image/png',
    },
  ]
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const iconId = await id

  // Get size based on id
  const size = iconId === '192' ? 192 : 512
  const fontSize = size === 192 ? 115 : 307

  // Colors from design-system/tokens.json: primary #2fd27a, primary-foreground #03140a
  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2fd27a',
          fontSize,
          fontWeight: 700,
          color: '#03140a',
          fontFamily: 'system-ui',
        }}
      >
        P
      </div>
    ),
    {
      width: size,
      height: size,
    }
  )
}
