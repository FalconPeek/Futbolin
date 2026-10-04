import { Metadata } from "next"
import { AppHeader } from "@/components/layout/app-header"
import { CreateGroupForm } from "@/components/groups/create-group-form"

export const metadata: Metadata = {
  title: "Nuevo grupo · Picado",
}

export default function NuevoGrupoPage() {
  return (
    <>
      <AppHeader title="Nuevo grupo" backHref="/grupos" />
      <main className="mx-auto w-full max-w-screen-sm">
        <CreateGroupForm />
      </main>
    </>
  )
}
