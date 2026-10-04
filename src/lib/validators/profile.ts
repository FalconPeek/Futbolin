import { z } from "zod";
import { POSITIONS } from "@/lib/cards/positions";

const positionsEnum = z.enum(POSITIONS as readonly [string, ...string[]]);

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Tu nombre tiene que tener entre 2 y 40 caracteres.")
    .max(40, "Tu nombre tiene que tener entre 2 y 40 caracteres."),
  nickname: z
    .string()
    .trim()
    .max(20, "El apodo tiene que tener hasta 20 caracteres.")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  position: positionsEnum,
});

export type ProfileInput = z.infer<typeof profileSchema>;
