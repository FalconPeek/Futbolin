# Picado

PWA mobile-first para organizar fútbol entre amigos: grupos, partidos, cartas estilo FC votadas por los compañeros, ranking y torneos.

## Desarrollo

Requisitos: Node 24, Docker y la CLI de Supabase.

```bash
npm install
npm run db:start      # Supabase local (Docker)
npm run dev
```

Copiá `.env.example` a `.env.local` con los valores de `supabase status -o env`.

## Calidad

```bash
bash scripts/quality_gate.sh all
```

El plan y las decisiones de la sesión están en `.yolo/plan.md` y `.yolo/decisions.md`. La guía visual está en `design-system/`.
