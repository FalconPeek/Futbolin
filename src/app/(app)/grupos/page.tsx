import { Metadata } from "next"
import Link from "next/link"
import { UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { GroupList } from "@/components/groups/group-list"

export const metadata: Metadata = {
  title: "Tus grupos · Picado",
}

interface GroupMember {
  role: "admin" | "member"
  groups: {
    id: string
    name: string
    group_members: Array<{ count: number }>
  }
}

export default async function GruposPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Usuario no autenticado")
  }

  const { data: groupsData } = await supabase
    .from("group_members")
    .select("role, groups(id, name, group_members(count))")
    .eq("user_id", user.id)

  const groups = (groupsData as GroupMember[] || [])
    .map((member) => ({
      id: member.groups.id,
      name: member.groups.name,
      memberCount: member.groups.group_members[0]?.count || 0,
      role: member.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es-AR"))

  return (
    <>
      <AppHeader
        title="Tus grupos"
        right={
          <Link
            href="/perfil"
            aria-label="Tu perfil"
            className="inline-flex items-center justify-center w-tap h-tap rounded-md text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <UserRound className="size-5" />
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-screen-sm">
        <GroupList groups={groups} />
      </main>
    </>
  )
}
