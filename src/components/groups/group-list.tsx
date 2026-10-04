"use client"

import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/layout/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface GroupListItem {
  id: string
  name: string
  memberCount: number
  role: "admin" | "member"
}

interface GroupListProps {
  groups: GroupListItem[]
}

export function GroupList({ groups }: GroupListProps) {
  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Todavía no estás en ningún grupo"
        description="Creá uno y pasales el link a tus amigos, o pedile el link a quien lo organiza."
        action={
          <Button asChild variant="primary" size="lg" block>
            <Link href="/grupos/nuevo">Crear grupo</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 pb-nav px-4">
      {groups.map((group) => (
        <Link
          key={group.id}
          href={`/g/${group.id}`}
          className={cn(
            "group bg-card border border-border rounded-lg p-4",
            "flex items-center justify-between gap-3",
            "hover:bg-accent transition-colors",
            "min-h-tap"
          )}
        >
          <div className="flex-1 min-w-0">
            <p className="text-title font-semibold truncate text-foreground">
              {group.name}
            </p>
            <p className="text-small text-muted-foreground tabular">
              {group.memberCount === 1 ? "1 miembro" : `${group.memberCount} miembros`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {group.role === "admin" && <Badge variant="neutral">Admin</Badge>}
            <ChevronRight className="size-5 text-muted-foreground" />
          </div>
        </Link>
      ))}

      <Button asChild variant="primary" size="lg" block className="mt-6">
        <Link href="/grupos/nuevo">Crear grupo</Link>
      </Button>
    </div>
  )
}
