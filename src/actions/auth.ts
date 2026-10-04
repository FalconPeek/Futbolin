"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult, ok, fail } from "@/lib/result";
import { signInSchema, signUpSchema } from "@/lib/validators/auth";
import { revalidatePath } from "next/cache";

export async function signUp(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { email, password, display_name } = parsed.data;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name,
      },
    },
  });

  if (error) {
    // Check for email already registered errors
    if (
      error.status === 422 ||
      error.code === "user_already_exists" ||
      error.code === "email_exists" ||
      error.message?.includes("already registered")
    ) {
      return fail("Ya hay una cuenta con ese email. Ingresá.");
    }
    return fail("Algo salió mal. Probá de nuevo.");
  }

  revalidatePath("/", "layout");
  return ok({ redirectTo: "/grupos" });
}

export async function signIn(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.status === 400 || error.code === "invalid_credentials") {
      return fail("El email o la contraseña no coinciden.");
    }
    return fail("Algo salió mal. Probá de nuevo.");
  }

  revalidatePath("/", "layout");
  return ok({ redirectTo: "/grupos" });
}

export async function signOut(): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return fail("Algo salió mal. Probá de nuevo.");
  }

  revalidatePath("/", "layout");
  return ok({ redirectTo: "/ingresar" });
}
