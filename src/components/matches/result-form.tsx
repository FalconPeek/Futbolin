"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { finalizeMatch } from "@/actions/matches"
import { resultSchema } from "@/lib/validators/matches"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Player {
  userId: string
  name: string
  team: "A" | "B"
}

interface ResultFormProps {
  matchId: string
  groupId: string
  players: Player[]
}

interface ScoreState {
  score_a: number | ""
  score_b: number | ""
}

interface StatsState {
  [userId: string]: {
    goals: number | ""
    assists: number | ""
  }
}

export function ResultForm({ matchId, groupId, players }: ResultFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [scores, setScores] = useState<ScoreState>({
    score_a: "",
    score_b: "",
  })
  const [stats, setStats] = useState<StatsState>(() => {
    const initial: StatsState = {}
    players.forEach((p) => {
      initial[p.userId] = { goals: "", assists: "" }
    })
    return initial
  })

  const handleScoreChange = (team: "a" | "b", value: string) => {
    const numValue = value === "" ? "" : Math.max(0, Math.min(99, parseInt(value, 10)))
    setScores((prev) => ({
      ...prev,
      [`score_${team}`]: numValue,
    }))
    setError("")
  }

  const handleStatsChange = (
    userId: string,
    field: "goals" | "assists",
    value: string
  ) => {
    const numValue = value === "" ? "" : Math.max(0, parseInt(value, 10))
    setStats((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: numValue,
      },
    }))
    setError("")
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    // Convert scores to numbers
    const score_a = scores.score_a === "" ? 0 : Number(scores.score_a)
    const score_b = scores.score_b === "" ? 0 : Number(scores.score_b)

    // Build stats array
    const statsArray = players.map((p) => ({
      user_id: p.userId,
      team: p.team,
      goals: stats[p.userId]?.goals === "" ? 0 : Number(stats[p.userId]?.goals || 0),
      assists: stats[p.userId]?.assists === "" ? 0 : Number(stats[p.userId]?.assists || 0),
    }))

    // Validate with schema
    const input = {
      matchId,
      groupId,
      score_a,
      score_b,
      stats: statsArray,
    }

    const parseResult = resultSchema.safeParse(input)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message
      if (firstError) {
        setError(firstError)
      }
      return
    }

    startTransition(async () => {
      const result = await finalizeMatch(input)

      if (!result.ok) {
        setError(result.error)
        return
      }

      toast.success("Partido cerrado. Ya pueden votar al MVP.")
      router.push(`/g/${groupId}/partidos/${matchId}`)
      router.refresh()
    })
  }

  const teamA = players.filter((p) => p.team === "A")
  const teamB = players.filter((p) => p.team === "B")

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Score inputs */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            type="number"
            inputMode="numeric"
            label="Equipo A"
            value={scores.score_a}
            onChange={(e) => handleScoreChange("a", e.target.value)}
            min={0}
            max={99}
            disabled={isPending}
            className="text-center text-score"
          />
          <Input
            type="number"
            inputMode="numeric"
            label="Equipo B"
            value={scores.score_b}
            onChange={(e) => handleScoreChange("b", e.target.value)}
            min={0}
            max={99}
            disabled={isPending}
            className="text-center text-score"
          />
        </div>
      </div>

      {/* Team A stats */}
      {teamA.length > 0 && (
        <div className="space-y-3">
          <p className="label-caps text-muted-foreground">Equipo A</p>
          <div className="space-y-3">
            {teamA.map((player) => (
              <div key={player.userId} className="space-y-2">
                <p className="text-small text-foreground">{player.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    label="Goles"
                    aria-label={`Goles de ${player.name}`}
                    value={stats[player.userId]?.goals ?? ""}
                    onChange={(e) =>
                      handleStatsChange(player.userId, "goals", e.target.value)
                    }
                    min={0}
                    disabled={isPending}
                    className="h-tap"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    label="Asistencias"
                    aria-label={`Asistencias de ${player.name}`}
                    value={stats[player.userId]?.assists ?? ""}
                    onChange={(e) =>
                      handleStatsChange(player.userId, "assists", e.target.value)
                    }
                    min={0}
                    disabled={isPending}
                    className="h-tap"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team B stats */}
      {teamB.length > 0 && (
        <div className="space-y-3">
          <p className="label-caps text-muted-foreground">Equipo B</p>
          <div className="space-y-3">
            {teamB.map((player) => (
              <div key={player.userId} className="space-y-2">
                <p className="text-small text-foreground">{player.name}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    label="Goles"
                    aria-label={`Goles de ${player.name}`}
                    value={stats[player.userId]?.goals ?? ""}
                    onChange={(e) =>
                      handleStatsChange(player.userId, "goals", e.target.value)
                    }
                    min={0}
                    disabled={isPending}
                    className="h-tap"
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    label="Asistencias"
                    aria-label={`Asistencias de ${player.name}`}
                    value={stats[player.userId]?.assists ?? ""}
                    onChange={(e) =>
                      handleStatsChange(player.userId, "assists", e.target.value)
                    }
                    min={0}
                    disabled={isPending}
                    className="h-tap"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <p role="alert" className="text-small text-destructive">
          {error}
        </p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        disabled={isPending}
      >
        {isPending ? "Cerrando…" : "Cerrar partido"}
      </Button>
    </form>
  )
}
