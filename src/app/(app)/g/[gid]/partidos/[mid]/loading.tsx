import { AppHeader } from "@/components/layout/app-header"
import { PageSkeleton } from "@/components/layout/page-skeleton"

export default function PartidoLoading() {
  return (
    <>
      <AppHeader title="Partido" />
      <PageSkeleton rows={4} />
    </>
  )
}
