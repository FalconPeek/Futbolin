import { type Metadata } from "next"
import { AppHeader } from "@/components/layout/app-header"
import { MatchForm } from "@/components/matches/match-form"

interface NuevoPartidoPageProps {
  params: Promise<{ gid: string }>
}

export const metadata: Metadata = {
  title: "Nuevo partido · Picado",
}

export default async function NuevoPartidoPage({ params }: NuevoPartidoPageProps) {
  const { gid } = await params

  return (
    <>
      <AppHeader title="Nuevo partido" backHref={`/g/${gid}/partidos`} />
      <MatchForm groupId={gid} />
    </>
  )
}
