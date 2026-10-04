"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { cancelMatch } from "@/actions/matches"
import { toast } from "sonner"

interface MatchActionsProps {
  matchId: string
  groupId: string
}

export function MatchActions({ matchId, groupId }: MatchActionsProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelMatch({
        matchId,
        groupId,
      })

      if (!result.ok) {
        toast.error(result.error)
      } else {
        setShowDialog(false)
      }
    })
  }

  return (
    <>
      <div className="space-y-3">
        <Button asChild variant="secondary" size="lg" block>
          <Link href={`/g/${groupId}/partidos/${matchId}/equipos`}>Armar equipos</Link>
        </Button>
        <Button asChild variant="secondary" size="lg" block>
          <Link href={`/g/${groupId}/partidos/${matchId}/resultado`}>Cargar resultado</Link>
        </Button>
        <Button
          onClick={() => setShowDialog(true)}
          disabled={pending}
          variant="destructive"
          size="lg"
          block
        >
          Cancelar partido
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar el partido</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setShowDialog(false)} variant="ghost">
              Volver
            </Button>
            <Button onClick={handleCancel} disabled={pending} variant="destructive">
              Cancelar partido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
