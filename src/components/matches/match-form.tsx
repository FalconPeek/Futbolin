"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createMatch } from "@/actions/matches"
import { matchSchema } from "@/lib/validators/matches"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface MatchFormProps {
  groupId: string
}

export function MatchForm({ groupId }: MatchFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState("")
  const [formData, setFormData] = useState({
    scheduled_at: "",
    location: "",
    players_per_team: "5",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
    setGeneralError("")
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setGeneralError("")

    // Convert datetime-local to ISO string with timezone
    if (!formData.scheduled_at) {
      setErrors((prev) => ({ ...prev, scheduled_at: "Elegí la fecha y la hora." }))
      return
    }

    let scheduledAtDate: Date
    try {
      scheduledAtDate = new Date(formData.scheduled_at)
      if (Number.isNaN(scheduledAtDate.getTime())) {
        throw new Error()
      }
    } catch {
      setErrors((prev) => ({ ...prev, scheduled_at: "La fecha y hora no son válidas." }))
      return
    }

    const input = {
      groupId,
      scheduled_at: scheduledAtDate.toISOString(),
      location: formData.location,
      players_per_team: parseInt(formData.players_per_team, 10),
    }

    const parseResult = matchSchema.safeParse(input)
    if (!parseResult.success) {
      const newErrors: Record<string, string> = {}
      parseResult.error.issues.forEach((issue) => {
        if (issue.path && issue.path.length > 0) {
          const fieldName = issue.path[0].toString()
          newErrors[fieldName] = issue.message
        }
      })
      setErrors(newErrors)
      return
    }

    startTransition(async () => {
      const result = await createMatch(input)

      if (!result.ok) {
        setGeneralError(result.error)
        return
      }

      router.push(result.data.redirectTo)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-6">
      <Input
        type="datetime-local"
        label="Fecha y hora"
        name="scheduled_at"
        value={formData.scheduled_at}
        onChange={handleChange}
        error={errors.scheduled_at}
        disabled={isPending}
        required
      />

      <Input
        type="text"
        label="Lugar"
        name="location"
        placeholder="Cancha de Juan, Palermo"
        value={formData.location}
        onChange={handleChange}
        error={errors.location}
        disabled={isPending}
        required
      />

      <div className="flex flex-col gap-1">
        <Label htmlFor="players_per_team" className="text-small">
          Jugadores por equipo
        </Label>
        <select
          id="players_per_team"
          name="players_per_team"
          value={formData.players_per_team}
          onChange={handleChange}
          disabled={isPending}
          required
          className={cn(
            "h-tap px-3 w-full",
            "bg-card text-foreground border border-input rounded-md text-body",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            errors.players_per_team && "border-destructive"
          )}
        >
          {Array.from({ length: 9 }, (_, i) => i + 3).map((n) => (
            <option key={n} value={n}>
              {n} contra {n}
            </option>
          ))}
        </select>
        {errors.players_per_team && (
          <p className="text-small text-destructive">{errors.players_per_team}</p>
        )}
      </div>

      {generalError && (
        <p role="alert" className="text-small text-destructive">
          {generalError}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        block
        disabled={isPending}
      >
        {isPending ? "Creando…" : "Crear partido"}
      </Button>
    </form>
  )
}
