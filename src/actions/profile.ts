"use server";

import { createClient } from "@/lib/supabase/server";
import { ActionResult, ok, fail, mapDbError } from "@/lib/result";
import { profileSchema } from "@/lib/validators/profile";
import { revalidatePath } from "next/cache";

export async function updateProfile(input: unknown): Promise<ActionResult<null>> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo.");
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  const { display_name, nickname, position } = parsed.data;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name,
      nickname: nickname ?? null,
      // @ts-expect-error position is validated by schema
      position,
    })
    .eq("id", user.id);

  if (error) {
    return fail(mapDbError(error));
  }

  revalidatePath("/", "layout");
  return ok(null);
}
