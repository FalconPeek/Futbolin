"use client"

import { useState, useTransition } from "react"
import { Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { voteMvp } from "@/actions/matches"
import { toast } from "sonner"

interface MvpVoteProps {
  matchId: string
  groupId: string
  candidates: Array<{ userId: string; name: string }>
  canVote: boolean
  myVote: string | null
  eligible: number
  votesCast: number
  closed: boolean
  mvpNames: string[]
}

export function MvpVote({
  matchId,
  groupId,
  candidates,
  canVote,
  myVote,
  eligible,
  votesCast,
  closed,
  mvpNames,
}: MvpVoteProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleVote = () => {
    if (!selectedId) return

    startTransition(async () => {
      const result = await voteMvp({
        matchId,
        groupId,
        votedId: selectedId,
      })

      if (!result.ok) {
        toast.error(result.error)
      } else {
        setSelectedId(null)
      }
    })
  }

  return (
    <Card title="MVP">
      {closed ? (
        <div className="space-y-3">
          {mvpNames.length > 0 ? (
            <div className="flex items-center gap-2">
              <Badge variant="gold" className="gap-1">
                <Star className="size-4" />
                MVP: {mvpNames.join(", ")}
              </Badge>
            </div>
          ) : (
            <p className="text-small text-muted-foreground">Nadie votó.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {canVote ? (
            <>
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <label
                    key={candidate.userId}
                    className="flex items-center h-tap gap-3 px-3 border border-input rounded-md cursor-pointer hover:bg-accent transition-colors"
                  >
                    <input
                      type="radio"
                      name="mvp"
                      value={candidate.userId}
                      checked={selectedId === candidate.userId}
                      onChange={(e) => setSelectedId(e.target.value)}
                      disabled={pending}
                      className="cursor-pointer"
                    />
                    <span className="text-small text-foreground flex-1">{candidate.name}</span>
                  </label>
                ))}
              </div>
              <Button
                onClick={handleVote}
                disabled={!selectedId || pending}
                variant="primary"
                size="lg"
                block
              >
                Votá
              </Button>
            </>
          ) : myVote ? (
            <p className="text-small text-muted-foreground">Ya votaste.</p>
          ) : (
            <p className="text-small text-muted-foreground">Solo votan los que jugaron.</p>
          )}

          <p className="text-caption tabular text-muted-foreground text-center">
            {votesCast} de {eligible} votaron
          </p>
        </div>
      )}
    </Card>
  )
}
