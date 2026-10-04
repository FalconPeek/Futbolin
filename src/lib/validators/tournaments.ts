import { z } from "zod";

const intNumber = z.number().int();

export const tournamentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre del torneo tiene que tener entre 2 y 60 caracteres.")
      .max(60, "El nombre del torneo tiene que tener entre 2 y 60 caracteres."),
    format: z.enum(["liga", "eliminacion"] as const),
    legs: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber)
      .refine(
        (n) => n === 1 || n === 2,
        "Tiene que ser ida (1) o ida y vuelta (2)."
      ),
  })
  .refine(
    (data) => data.format === "liga" || data.legs === 1,
    {
      message: "La ida y vuelta es solo para ligas.",
      path: ["legs"],
    }
  );

export type TournamentInput = z.infer<typeof tournamentSchema>;

export const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del equipo tiene que tener entre 1 y 30 caracteres.")
    .max(30, "El nombre del equipo tiene que tener entre 1 y 30 caracteres."),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Elegí un color de la lista."),
});

export type TeamInput = z.infer<typeof teamSchema>;

export const tournamentResultSchema = z
  .object({
    format: z.enum(["liga", "eliminacion"] as const),
    home_score: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber)
      .refine((n) => n >= 0 && n <= 99, "El resultado tiene que estar entre 0 y 99."),
    away_score: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber)
      .refine((n) => n >= 0 && n <= 99, "El resultado tiene que estar entre 0 y 99."),
    home_pens: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber)
      .optional()
      .nullable(),
    away_pens: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    const isTie = data.home_score === data.away_score;

    if (data.format === "eliminacion" && isTie) {
      // Penales are required and must be different
      if (
        data.home_pens === null ||
        data.home_pens === undefined ||
        data.away_pens === null ||
        data.away_pens === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "En eliminación directa no hay empate: cargá los penales.",
        });
      } else if (data.home_pens === data.away_pens) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "En eliminación directa no hay empate: cargá los penales.",
        });
      }
    }
  })
  .transform((data) => ({
    ...data,
    home_pens:
      data.format !== "eliminacion" || data.home_score !== data.away_score
        ? null
        : data.home_pens,
    away_pens:
      data.format !== "eliminacion" || data.home_score !== data.away_score
        ? null
        : data.away_pens,
  }));

export type TournamentResultInput = z.infer<typeof tournamentResultSchema>;
