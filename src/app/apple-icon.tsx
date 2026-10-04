import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// Colors from design-system/tokens.json: primary #2fd27a, primary-foreground #03140a
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2fd27a',
          fontSize: 108,
          fontWeight: 700,
          color: '#03140a',
          fontFamily: 'system-ui',
        }}
      >
        P
      </div>
    ),
    {
      width: 180,
      height: 180,
    }
  )
}
