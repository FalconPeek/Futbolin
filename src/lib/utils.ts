import { createCn } from "cn/config"

// Tokens propios del design system (src/app/globals.css) para que el merge
// resuelva conflictos: text-body vs text-foreground, rounded-card, h-tap, etc.
export const cn = createCn({
  extend: {
    theme: {
      text: ["score", "display", "ovr", "stat", "label-caps", "title-lg", "title", "body", "body-strong", "small", "caption"],
      radius: ["card"],
      shadow: ["card"],
      spacing: ["tap", "nav"],
    },
  },
})
