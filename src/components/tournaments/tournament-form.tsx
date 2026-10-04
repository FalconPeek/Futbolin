"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournament } from "@/actions/tournaments";
import { tournamentSchema } from "@/lib/validators/tournaments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TournamentFormProps {
  groupId: string;
}

export function TournamentForm({ groupId }: TournamentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    format: "liga" as "liga" | "eliminacion",
    legs: 1,
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, name: value }));
    if (errors.name) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.name;
        return updated;
      });
    }
  };

  const handleFormatChange = (newFormat: "liga" | "eliminacion") => {
    setFormData((prev) => ({
      ...prev,
      format: newFormat,
      legs: newFormat === "liga" ? prev.legs : 1,
    }));
    if (errors.format) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.format;
        return updated;
      });
    }
  };

  const handleLegsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      legs: checked ? 2 : 1,
    }));
    if (errors.legs) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.legs;
        return updated;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const parseResult = tournamentSchema.safeParse(formData);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = await createTournament({
        groupId,
        name: parseResult.data.name,
        format: parseResult.data.format,
        legs: parseResult.data.legs,
      });

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      router.push(result.data.redirectTo);
      router.refresh();
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Input
        name="name"
        type="text"
        label="Nombre"
        placeholder="Copa de verano"
        value={formData.name}
        onChange={handleNameChange}
        error={errors.name}
        disabled={isPending}
      />

      <fieldset className="flex flex-col gap-3">
        <Label className="text-small font-semibold">Formato</Label>
        <div role="radiogroup" className="flex flex-col gap-2">
          <label
            className={cn(
              "flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer h-tap",
              "transition-colors",
              formData.format === "liga"
                ? "border-primary bg-accent"
                : "border-input bg-card hover:bg-muted",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            )}
          >
            <input
              type="radio"
              name="format"
              value="liga"
              checked={formData.format === "liga"}
              onChange={() => handleFormatChange("liga")}
              disabled={isPending}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-small font-semibold">Liga</div>
              <div className="text-caption text-muted-foreground">
                Todos contra todos, gana el que suma más puntos.
              </div>
            </div>
          </label>

          <label
            className={cn(
              "flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer h-tap",
              "transition-colors",
              formData.format === "eliminacion"
                ? "border-primary bg-accent"
                : "border-input bg-card hover:bg-muted",
              "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            )}
          >
            <input
              type="radio"
              name="format"
              value="eliminacion"
              checked={formData.format === "eliminacion"}
              onChange={() => handleFormatChange("eliminacion")}
              disabled={isPending}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-small font-semibold">Eliminación directa</div>
              <div className="text-caption text-muted-foreground">
                Llave con cruces; el que pierde se va.
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      {formData.format === "liga" && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.legs === 2}
            onChange={handleLegsChange}
            disabled={isPending}
            className="w-4 h-4 rounded border border-input bg-card cursor-pointer"
          />
          <span className="text-small">Ida y vuelta</span>
        </label>
      )}

      {serverError && (
        <p role="alert" className="text-small text-destructive">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        block
        disabled={isPending}
      >
        {isPending ? "Creando…" : "Crear torneo"}
      </Button>
    </form>
  );
}
