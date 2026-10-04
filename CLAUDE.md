# Picado

PWA mobile-first para organizar fútbol real entre amigos (partidos, torneos, cartas estilo FC votadas por los compañeros, rankings, plantillas). Stack previsto: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 + shadcn/ui, Supabase.

## Design system — obligatorio para cualquier UI

Todo vive en `design-system/`:

| Archivo | Qué es |
|---|---|
| `design-system/README.md` | Guía de marca: tono, color, tipografía, espaciado, estados, layout. **Leela antes de crear o cambiar UI.** |
| `design-system/tokens.json` | Fuente de verdad de los tokens (colores por tema, tipografía, espaciado, radios, sombras). |
| `design-system/globals.css` | Los tokens listos para Tailwind 4 + shadcn/ui. Se copia a `app/globals.css`. |
| `design-system/components/<Nombre>/README.md` | Guía de cada componente (cuándo usarlo, props, reglas). |
| `design-system/components/index.d.ts` | Props de cada componente. |
| `design-system/referencia/bundle.css`, `bundle.js` | Implementación de referencia de los componentes (CSS + React sin JSX). Solo para copiar medidas y estructura: **no importarlos en la app**. |

### Reglas

- Usá solo tokens, nunca colores, tamaños ni radios sueltos: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `border-border`, `border-input`, `ring-ring`, `text-gold`, `text-info`, `bg-destructive`.
- Tema oscuro por defecto: `<html lang="es-AR" data-theme="dark">`. El claro es `data-theme="light"`. La variante `dark:` de Tailwind está atada a `data-theme="dark"`.
- Tipografía: `font-sans` (Barlow) para interfaz, `font-display` (Barlow Condensed) para números, OVR y resultados. Estilos de texto como utilidades: `text-score`, `text-display`, `text-ovr`, `text-stat`, `text-title-lg`, `text-title`, `text-body`, `text-body-strong`, `text-small`, `text-caption`; etiquetas en mayúsculas con `label-caps`; números tabulares con `tabular`.
- Espaciado: escala por defecto de Tailwind (4px): `p-4` = `space-4` (16px), `gap-6` = `space-6` (24px), etc. Tocables de al menos `h-tap` (44px). Barra inferior: `h-nav` (64px); dejá `pb-nav` al final del contenido.
- Radios: `rounded-sm` (6), `rounded-md` (10, botones e inputs), `rounded-lg` (14, tarjetas y tablas), `rounded-card` (18, carta de jugador), `rounded-full`. El `Card` de shadcn trae `rounded-xl`: cambialo a `rounded-lg`.
- Sombras: `shadow-sm` para tarjetas, `shadow-card` solo para la carta de jugador y las hojas inferiores.
- Colores de nivel de carta (`bg-tier-bronze`, `tier-silver`, `tier-gold`, `tier-special`, `tier-provisional` y sus `-ink`): solo dentro de `PlayerCard`.
- Textos en español rioplatense con voseo y en sentence case ("Reportar resultado", "Votá"). Sin emoji. Íconos: lucide-react, 20px.
- Componentes del sistema (`Button`, `Input`, `Badge`, `Card`, `FormBadge`, `PlayerCard`, `StandingsTable`): los base salen de shadcn/ui ajustados a estas reglas; `FormBadge`, `PlayerCard` y `StandingsTable` se construyen siguiendo su README, `index.d.ts` y `referencia/bundle.css`.
- Si cambiás un token, cambialo en `design-system/tokens.json` y en `app/globals.css` a la vez.

### Arranque del proyecto

1. `create-next-app` no acepta una carpeta con archivos: generá la app en una carpeta temporal (Tailwind, TypeScript, App Router) y mové su contenido a la raíz sin pisar `CLAUDE.md` ni `design-system/`.
2. `npx shadcn@latest init` y después reemplazá `app/globals.css` por `design-system/globals.css`. Si el init agregó otros `@import` (por ejemplo `tw-animate-css`), conservalos debajo de `@import "tailwindcss";`.
3. Fuentes en `app/layout.tsx`:

```tsx
import { Barlow, Barlow_Condensed } from "next/font/google";

const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-barlow-condensed" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" data-theme="dark" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```
