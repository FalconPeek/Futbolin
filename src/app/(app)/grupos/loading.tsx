import { AppHeader } from "@/components/layout/app-header"
import { PageSkeleton } from "@/components/layout/page-skeleton"

export default function GruposLoading() {
  return (
    <>
      <AppHeader title="Tus grupos" />
      <main className="mx-auto w-full max-w-screen-sm">
        <PageSkeleton />
      </main>
    </>
  )
}
