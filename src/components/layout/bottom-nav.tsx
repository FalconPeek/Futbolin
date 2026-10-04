"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, CalendarDays, Trophy, ListOrdered, IdCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  groupId: string
}

export function BottomNav({ groupId }: BottomNavProps) {
  const pathname = usePathname()

  const links = [
    {
      href: `/g/${groupId}`,
      label: "Inicio",
      icon: House,
      isActive: pathname === `/g/${groupId}`,
    },
    {
      href: `/g/${groupId}/partidos`,
      label: "Partidos",
      icon: CalendarDays,
      isActive: pathname.startsWith(`/g/${groupId}/partidos`),
    },
    {
      href: `/g/${groupId}/torneos`,
      label: "Torneos",
      icon: Trophy,
      isActive: pathname.startsWith(`/g/${groupId}/torneos`),
    },
    {
      href: `/g/${groupId}/ranking`,
      label: "Ranking",
      icon: ListOrdered,
      isActive: pathname.startsWith(`/g/${groupId}/ranking`),
    },
    {
      href: `/g/${groupId}/cartas`,
      label: "Cartas",
      icon: IdCard,
      isActive: pathname.startsWith(`/g/${groupId}/cartas`),
    },
  ]

  return (
    <nav
      aria-label="Secciones del grupo"
      className={cn(
        "fixed inset-x-0 bottom-0",
        "bg-card border-t border-border",
        "h-nav pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex h-full items-stretch">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1",
                "min-h-tap",
                "transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                link.isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              {...(link.isActive && { "aria-current": "page" })}
            >
              <Icon className="size-5" />
              <span className="text-caption">{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
