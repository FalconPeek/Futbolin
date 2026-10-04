"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createGroup } from "@/actions/groups"
import { groupSchema } from "@/lib/validators/groups"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CreateGroupForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [name, setName] = useState("")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    const parseResult = groupSchema.safeParse({ name })

    if (!parseResult.success) {
      setError(parseResult.error.issues[0]?.message ?? "Error al validar")
      return
    }

    startTransition(async () => {
      const result = await createGroup({ name: parseResult.data.name })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(result.data.redirectTo)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <Input
        type="text"
        label="Nombre del grupo"
        placeholder="Fútbol de los jueves"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        disabled={isPending}
        required
      />
      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        disabled={isPending}
      >
        {isPending ? "Creando…" : "Crear grupo"}
      </Button>
    </form>
  )
}
