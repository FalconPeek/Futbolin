import { Metadata } from "next"
import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { JoinGroupCard } from "@/components/groups/join-group-card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Unirse al grupo · Picado",
}

interface UnirsePageProps {
  params: Promise<{ code: string }>
}

export default async function UnirstePage({ params }: UnirsePageProps) {
  const { code } = await params

  const supabase = await createClient()

  const { data: invitePreview } = await supabase.rpc("get_invite_preview", {
    p_code: code.toUpperCase(),
  })

  if (!invitePreview || invitePreview.length === 0) {
    return (
      <>
        <AppHeader title="Unirse al grupo" backHref="/grupos" />
        <main className="mx-auto w-full max-w-screen-sm">
          <div className="flex flex-col items-center justify-center gap-4 py-12 px-4 text-center">
            <AlertCircle className="size-12 text-destructive" strokeWidth={1.5} />
            <h2 className="text-title font-semibold text-foreground">Este link no sirve</h2>
            <p className="text-small text-muted-foreground max-w-xs">
              El link de invitación no es válido. Pedile uno nuevo a un admin del grupo.
            </p>
            <Button asChild variant="secondary">
              <Link href="/grupos">Ir a tus grupos</Link>
            </Button>
          </div>
        </main>
      </>
    )
  }

  const { group_id, name, member_count, is_member } = invitePreview[0]

  if (is_member) {
    redirect(`/g/${group_id}`)
  }

  return (
    <>
      <AppHeader title="Unirse al grupo" backHref="/grupos" />
      <main className="mx-auto w-full max-w-screen-sm">
        <JoinGroupCard code={code} name={name} memberCount={member_count} />
      </main>
    </>
  )
}
