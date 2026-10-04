import { z } from "zod";

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre del grupo tiene que tener entre 2 y 40 caracteres.")
    .max(40, "El nombre del grupo tiene que tener entre 2 y 40 caracteres."),
});

export type GroupInput = z.infer<typeof groupSchema>;

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const inviteCodeSchema = z
  .string()
  .length(8, "El código de invitación no es válido.")
  .toUpperCase()
  .refine(
    (code) =>
      code.split("").every((char) => INVITE_CODE_ALPHABET.includes(char)),
    "El código de invitación no es válido."
  );

export type InviteCodeInput = z.infer<typeof inviteCodeSchema>;
