"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/actions/auth";
import { signInSchema, signUpSchema } from "@/lib/validators/auth";
import { safeNextPath } from "@/lib/auth/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface AuthFormProps {
  mode: "signin" | "signup";
  next?: string;
}

export function AuthForm({ mode, next }: AuthFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    display_name: "",
  });

  const isSignUp = mode === "signup";
  const actionSchema = isSignUp ? signUpSchema : signInSchema;
  const action = isSignUp ? signUp : signIn;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const parseResult = actionSchema.safeParse(formData);

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
      const result = await action(formData);

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      router.push(safeNextPath(next));
      router.refresh();
    });
  };

  const nextParam = next ? `?next=${encodeURIComponent(next)}` : "";
  const toggleLink = isSignUp ? `/ingresar${nextParam}` : `/registrarme${nextParam}`;
  const toggleText = isSignUp
    ? "¿Ya tenés cuenta? Ingresá"
    : "¿No tenés cuenta? Creá una";
  const buttonText = isSignUp ? "Crear cuenta" : "Ingresá";
  const buttonPendingText = isSignUp ? "Creando cuenta…" : "Ingresando…";

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isSignUp && (
        <Input
          name="display_name"
          type="text"
          label="Tu nombre"
          value={formData.display_name || ""}
          onChange={handleChange}
          error={errors.display_name}
          autoComplete="name"
          disabled={isPending}
        />
      )}

      <Input
        name="email"
        type="email"
        label="Email"
        value={formData.email || ""}
        onChange={handleChange}
        error={errors.email}
        autoComplete="email"
        disabled={isPending}
      />

      <Input
        name="password"
        type="password"
        label="Contraseña"
        value={formData.password || ""}
        onChange={handleChange}
        error={errors.password}
        hint={isSignUp ? "Mínimo 8 caracteres." : undefined}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        disabled={isPending}
      />

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
        {isPending ? buttonPendingText : buttonText}
      </Button>

      <p className="text-center text-small text-muted-foreground">
        <Link href={toggleLink} className="text-primary hover:underline">
          {toggleText}
        </Link>
      </p>
    </form>
  );
}
