import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .email("Ingresá un email válido."),
  password: z
    .string()
    .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
    .max(72),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  email: z
    .string()
    .email("Ingresá un email válido."),
  password: z
    .string()
    .min(8, "La contraseña tiene que tener al menos 8 caracteres.")
    .max(72),
  display_name: z
    .string()
    .trim()
    .min(2, "Tu nombre tiene que tener entre 2 y 40 caracteres.")
    .max(40, "Tu nombre tiene que tener entre 2 y 40 caracteres."),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
