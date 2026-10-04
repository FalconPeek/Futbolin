"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ActionResult, fail, ok, mapDbError } from "@/lib/result";
import { ratingSchema, statsToColumns } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function rateTeammate({
  groupId,
  ratedId,
  kind,
  stats,
}: {
  groupId: string;
  ratedId: string;
  kind: string;
  stats: unknown;
}): Promise<ActionResult<null>> {
  // Validar IDs
  const groupUuid = z.uuid().safeParse(groupId);
  const ratedUuid = z.uuid().safeParse(ratedId);

  if (!groupUuid.success) {
    return fail("El ID del grupo no es válido.");
  }
  if (!ratedUuid.success) {
    return fail("El ID del jugador no es válido.");
  }

  // Validar con ratingSchema
  const parsed = ratingSchema.safeParse({ kind, stats });
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? "Revisá los datos e intentá de nuevo."
    );
  }

  // Obtener usuario
  const supabase = await createClient();
  const user = (await supabase.auth.getUser()).data.user;

  if (!user) {
    return fail("Tenés que ingresar para hacer esto.");
  }

  // Validar no autocalificación
  if (user.id === ratedId) {
    return fail("No podés calificarte a vos mismo.");
  }

  // Hacer upsert
  const statsColumns = statsToColumns(parsed.data.stats);
  const { error } = await supabase
    .from("player_ratings")
    .upsert(
      {
        group_id: groupId,
        rater_id: user.id,
        rated_id: ratedId,
        kind: parsed.data.kind,
        ...statsColumns,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "group_id,rater_id,rated_id",
      }
    );

  if (error) {
    return fail(mapDbError(error));
  }

  // Revalidar rutas
  revalidatePath(`/g/${groupId}/cartas/${ratedId}`);
  revalidatePath(`/g/${groupId}/cartas`);
  revalidatePath(`/g/${groupId}`);

  return ok(null);
}
