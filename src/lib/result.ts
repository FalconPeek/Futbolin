export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export const DB_ERROR_CODES = [
  "NOT_ALLOWED",
  "INVALID_INPUT",
  "INVALID_CODE",
  "LAST_ADMIN",
  "MATCH_FULL",
  "MATCH_CLOSED",
  "INVALID_RESULT",
  "VOTING_CLOSED",
  "NOT_ELIGIBLE",
  "ALREADY_VOTED",
  "NOT_ENOUGH_TEAMS",
  "TOO_MANY_TEAMS",
  "TOURNAMENT_NOT_DRAFT",
  "TOURNAMENT_NOT_RUNNING",
  "PENALTIES_REQUIRED",
  "NEXT_PLAYED",
] as const;

export type DbErrorCode = (typeof DB_ERROR_CODES)[number];

export const ERROR_MESSAGES: Record<DbErrorCode, string> = {
  NOT_ALLOWED: "No tenés permiso para hacer esto.",
  INVALID_INPUT: "Revisá los datos e intentá de nuevo.",
  INVALID_CODE: "El link de invitación no es válido. Pedile uno nuevo a un admin del grupo.",
  LAST_ADMIN: "Sos el único admin. Nombrá otro admin antes de salir.",
  MATCH_FULL: "El partido ya está completo.",
  MATCH_CLOSED: "El partido ya no admite cambios.",
  INVALID_RESULT: "El resultado no cierra: revisá goles y asistencias.",
  VOTING_CLOSED: "La votación del MVP ya cerró.",
  NOT_ELIGIBLE: "Solo votan los que jugaron el partido.",
  ALREADY_VOTED: "Ya votaste en este partido.",
  NOT_ENOUGH_TEAMS: "Necesitás al menos 2 equipos para empezar.",
  TOO_MANY_TEAMS: "El torneo admite hasta 16 equipos.",
  TOURNAMENT_NOT_DRAFT: "El torneo ya empezó.",
  TOURNAMENT_NOT_RUNNING: "El torneo no está en curso.",
  PENALTIES_REQUIRED: "En eliminación directa no hay empate: cargá los penales.",
  NEXT_PLAYED: "No se puede cambiar: el partido siguiente ya se jugó.",
};

export const GENERIC_ERROR = "Algo salió mal. Probá de nuevo.";

export function dbErrorCode(error: unknown): DbErrorCode | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const message = (error as Record<string, unknown>).message;
  if (typeof message !== "string") {
    return null;
  }

  // Check if message is exactly a code or contains it as a complete word
  if (DB_ERROR_CODES.includes(message as DbErrorCode)) {
    return message as DbErrorCode;
  }

  // Check if the code appears as a word boundary within the message
  for (const code of DB_ERROR_CODES) {
    const regex = new RegExp(`\\b${code}\\b`);
    if (regex.test(message)) {
      return code;
    }
  }

  return null;
}

export function mapDbError(error: unknown): string {
  const code = dbErrorCode(error);
  if (code) {
    return ERROR_MESSAGES[code];
  }
  return GENERIC_ERROR;
}
