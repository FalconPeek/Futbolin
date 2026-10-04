"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateProfile } from "@/actions/profile";
import { profileSchema } from "@/lib/validators/profile";
import { POSITIONS, POSITION_LABELS, type Position } from "@/lib/cards/positions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ProfileFormProps {
  defaultValues: {
    display_name: string;
    nickname: string;
    position: Position;
  };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    startTransition(async () => {
      const parsed = profileSchema.safeParse(formData);

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0];
          if (path) {
            fieldErrors[path.toString()] = issue.message;
          }
        }
        setErrors(fieldErrors);
        return;
      }

      const result = await updateProfile(parsed.data);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Guardamos tus cambios.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Tu nombre"
        value={formData.display_name}
        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
        error={errors.display_name}
        disabled={isPending}
      />

      <Input
        label="Apodo"
        hint="Es el nombre que sale en tu carta."
        value={formData.nickname}
        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
        error={errors.nickname}
        disabled={isPending}
      />

      <div className="flex flex-col gap-1">
        <Label htmlFor="position" className="text-small">
          Posición
        </Label>
        <select
          id="position"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value as Position })}
          disabled={isPending}
          className={cn(
            "h-tap px-3 w-full bg-card text-foreground border border-input rounded-md text-body",
            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            errors.position && "border-destructive"
          )}
          aria-invalid={errors.position ? "true" : "false"}
          aria-describedby={errors.position ? "position-error" : undefined}
        >
          {POSITIONS.map((position) => (
            <option key={position} value={position}>
              {position} · {POSITION_LABELS[position]}
            </option>
          ))}
        </select>
        {errors.position && (
          <p id="position-error" className="text-small text-destructive">
            {errors.position}
          </p>
        )}
      </div>

      <Button type="submit" block disabled={isPending}>
        {isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
