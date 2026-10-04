"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { joinGroup } from "@/actions/groups"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"

interface JoinGroupCardProps {
  code: string
  name: string
  memberCount: number
}

export function JoinGroupCard({ code, name, memberCount }: JoinGroupCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    startTransition(async () => {
      const result = await joinGroup({ code })

      if (result.ok) {
        router.push(result.data.redirectTo)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-4 py-12">
      <Card className="flex flex-col gap-4">
        <p className="text-small text-muted-foreground">Te invitaron a</p>
        <h2 className="text-title-lg font-semibold text-foreground">{name}</h2>
        <p className="text-small text-muted-foreground tabular">
          {memberCount === 1 ? "1 miembro" : `${memberCount} miembros`}
        </p>
      </Card>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        disabled={isPending}
      >
        {isPending ? "Uniéndote…" : "Unite al grupo"}
      </Button>
    </form>
  )
}
