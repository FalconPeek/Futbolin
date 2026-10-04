import { z } from "zod";

const intNumber = z.number().int();

export const matchSchema = z.object({
  scheduled_at: z
    .union([z.string(), z.date()])
    .pipe(z.coerce.date())
    .refine(
      (date) => date > new Date(),
      "Elegí una fecha y hora que todavía no pasó."
    ),
  location: z
    .string()
    .trim()
    .min(2, "El lugar tiene que tener entre 2 y 80 caracteres.")
    .max(80, "El lugar tiene que tener entre 2 y 80 caracteres."),
  players_per_team: z
    .union([z.number(), z.string()])
    .pipe(z.coerce.number())
    .pipe(intNumber)
    .refine(
      (n) => n >= 3 && n <= 11,
      "Tiene que haber entre 3 y 11 jugadores por equipo."
    ),
});

export type MatchInput = z.infer<typeof matchSchema>;

export const resultSchema = z
  .object({
    score_a: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber),
    score_b: z
      .union([z.number(), z.string()])
      .pipe(z.coerce.number())
      .pipe(intNumber),
    stats: z.array(
      z.object({
        user_id: z.string().uuid(),
        team: z.enum(["A", "B"] as const),
        goals: z
          .union([z.number(), z.string()])
          .pipe(z.coerce.number())
          .pipe(intNumber),
        assists: z
          .union([z.number(), z.string()])
          .pipe(z.coerce.number())
          .pipe(intNumber),
      })
    ),
  })
  .refine(
    (data) => data.score_a >= 0 && data.score_a <= 99,
    "El resultado tiene que estar entre 0 y 99."
  )
  .refine(
    (data) => data.score_b >= 0 && data.score_b <= 99,
    "El resultado tiene que estar entre 0 y 99."
  )
  .superRefine((data, ctx) => {
    // Check team A stats
    const teamAStats = data.stats.filter((s) => s.team === "A");
    const teamAGoals = teamAStats.reduce((sum, s) => sum + s.goals, 0);
    const teamAAssists = teamAStats.reduce((sum, s) => sum + s.assists, 0);

    if (teamAGoals > data.score_a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los goles de los jugadores superan el resultado.",
      });
    }

    if (teamAAssists > data.score_a) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las asistencias no pueden superar los goles.",
      });
    }

    // Check team B stats
    const teamBStats = data.stats.filter((s) => s.team === "B");
    const teamBGoals = teamBStats.reduce((sum, s) => sum + s.goals, 0);
    const teamBAssists = teamBStats.reduce((sum, s) => sum + s.assists, 0);

    if (teamBGoals > data.score_b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los goles de los jugadores superan el resultado.",
      });
    }

    if (teamBAssists > data.score_b) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las asistencias no pueden superar los goles.",
      });
    }
  });

export type ResultInput = z.infer<typeof resultSchema>;
