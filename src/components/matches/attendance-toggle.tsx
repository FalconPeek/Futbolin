"use client"

import { useTransition } from "react"
import { setAttendance } from "@/actions/matches"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AttendanceToggleProps {
  matchId: string
  groupId: string
  myStatus: "confirmado" | "baja" | null
}

export function AttendanceToggle({ matchId, groupId, myStatus }: AttendanceToggleProps) {
  const [pending, startTransition] = useTransition()

  const handleAttendance = (status: "confirmado" | "baja") => {
    startTransition(async () => {
      const result = await setAttendance({
        matchId,
        groupId,
        status,
      })

      if (!result.ok) {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        onClick={() => handleAttendance("confirmado")}
        disabled={pending}
        variant={myStatus === "confirmado" ? "primary" : "secondary"}
        size="lg"
        block
        aria-pressed={myStatus === "confirmado"}
        className={cn(
          "transition-colors",
          myStatus === "confirmado" && "border-primary bg-accent"
        )}
      >
        Voy
      </Button>
      <Button
        onClick={() => handleAttendance("baja")}
        disabled={pending}
        variant={myStatus === "baja" ? "primary" : "secondary"}
        size="lg"
        block
        aria-pressed={myStatus === "baja"}
        className={cn(
          "transition-colors",
          myStatus === "baja" && "border-primary bg-accent"
        )}
      >
        No voy
      </Button>
    </div>
  )
}
