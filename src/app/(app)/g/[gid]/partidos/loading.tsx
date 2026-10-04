import { AppHeader } from "@/components/layout/app-header"
import { PageSkeleton } from "@/components/layout/page-skeleton"

export default function PartidosLoading() {
  return (
    <>
      <AppHeader title="Partidos" />
      <PageSkeleton rows={5} />
    </>
  )
}
