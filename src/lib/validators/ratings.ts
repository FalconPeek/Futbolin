import { z } from "zod";

const intNumber = z.number().int();

const statRange = z
  .union([z.number(), z.string()])
  .pipe(z.coerce.number())
  .pipe(intNumber)
  .refine((n) => n >= 1 && n <= 99, "Cada stat tiene que estar entre 1 y 99.");

export const ratingSchema = z.object({
  kind: z.enum(["campo", "arquero"] as const),
  stats: z
    .array(statRange)
    .length(6, "Tiene que haber exactamente 6 stats."),
});

export type RatingInput = z.infer<typeof ratingSchema>;

export interface StatsColumns {
  s1: number;
  s2: number;
  s3: number;
  s4: number;
  s5: number;
  s6: number;
}

export function statsToColumns(stats: number[]): StatsColumns {
  return {
    s1: stats[0],
    s2: stats[1],
    s3: stats[2],
    s4: stats[3],
    s5: stats[4],
    s6: stats[5],
  };
}
