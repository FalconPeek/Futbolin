import { describe, it, expect } from "vitest";
import {
  ok,
  fail,
  DB_ERROR_CODES,
  ERROR_MESSAGES,
  GENERIC_ERROR,
  dbErrorCode,
  mapDbError,
} from "./result";

describe("result", () => {
  describe("ok()", () => {
    it("returns { ok: true, data }", () => {
      const result = ok(42);
      expect(result).toEqual({ ok: true, data: 42 });
    });

    it("works with any data type", () => {
      const result = ok({ foo: "bar" });
      expect(result).toEqual({ ok: true, data: { foo: "bar" } });
    });

    it("works with void", () => {
      const result = ok(undefined);
      expect(result).toEqual({ ok: true, data: undefined });
    });
  });

  describe("fail()", () => {
    it("returns { ok: false, error }", () => {
      const result = fail("test error");
      expect(result).toEqual({ ok: false, error: "test error" });
    });
  });

  describe("DB_ERROR_CODES", () => {
    it("contains all 16 expected codes", () => {
      expect(DB_ERROR_CODES).toHaveLength(16);
    });

    it("contains NOT_ALLOWED", () => {
      expect(DB_ERROR_CODES).toContain("NOT_ALLOWED");
    });

    it("contains INVALID_INPUT", () => {
      expect(DB_ERROR_CODES).toContain("INVALID_INPUT");
    });

    it("contains INVALID_CODE", () => {
      expect(DB_ERROR_CODES).toContain("INVALID_CODE");
    });

    it("contains LAST_ADMIN", () => {
      expect(DB_ERROR_CODES).toContain("LAST_ADMIN");
    });

    it("contains MATCH_FULL", () => {
      expect(DB_ERROR_CODES).toContain("MATCH_FULL");
    });

    it("contains MATCH_CLOSED", () => {
      expect(DB_ERROR_CODES).toContain("MATCH_CLOSED");
    });

    it("contains INVALID_RESULT", () => {
      expect(DB_ERROR_CODES).toContain("INVALID_RESULT");
    });

    it("contains VOTING_CLOSED", () => {
      expect(DB_ERROR_CODES).toContain("VOTING_CLOSED");
    });

    it("contains NOT_ELIGIBLE", () => {
      expect(DB_ERROR_CODES).toContain("NOT_ELIGIBLE");
    });

    it("contains ALREADY_VOTED", () => {
      expect(DB_ERROR_CODES).toContain("ALREADY_VOTED");
    });

    it("contains NOT_ENOUGH_TEAMS", () => {
      expect(DB_ERROR_CODES).toContain("NOT_ENOUGH_TEAMS");
    });

    it("contains TOO_MANY_TEAMS", () => {
      expect(DB_ERROR_CODES).toContain("TOO_MANY_TEAMS");
    });

    it("contains TOURNAMENT_NOT_DRAFT", () => {
      expect(DB_ERROR_CODES).toContain("TOURNAMENT_NOT_DRAFT");
    });

    it("contains TOURNAMENT_NOT_RUNNING", () => {
      expect(DB_ERROR_CODES).toContain("TOURNAMENT_NOT_RUNNING");
    });

    it("contains PENALTIES_REQUIRED", () => {
      expect(DB_ERROR_CODES).toContain("PENALTIES_REQUIRED");
    });

    it("contains NEXT_PLAYED", () => {
      expect(DB_ERROR_CODES).toContain("NEXT_PLAYED");
    });
  });

  describe("ERROR_MESSAGES", () => {
    it("has all 16 error codes mapped", () => {
      for (const code of DB_ERROR_CODES) {
        expect(ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof ERROR_MESSAGES[code]).toBe("string");
      }
    });

    it("NOT_ALLOWED has correct message", () => {
      expect(ERROR_MESSAGES.NOT_ALLOWED).toBe("No tenés permiso para hacer esto.");
    });

    it("INVALID_INPUT has correct message", () => {
      expect(ERROR_MESSAGES.INVALID_INPUT).toBe("Revisá los datos e intentá de nuevo.");
    });

    it("INVALID_CODE has correct message", () => {
      expect(ERROR_MESSAGES.INVALID_CODE).toBe(
        "El link de invitación no es válido. Pedile uno nuevo a un admin del grupo."
      );
    });

    it("LAST_ADMIN has correct message", () => {
      expect(ERROR_MESSAGES.LAST_ADMIN).toBe(
        "Sos el único admin. Nombrá otro admin antes de salir."
      );
    });

    it("MATCH_FULL has correct message", () => {
      expect(ERROR_MESSAGES.MATCH_FULL).toBe("El partido ya está completo.");
    });

    it("MATCH_CLOSED has correct message", () => {
      expect(ERROR_MESSAGES.MATCH_CLOSED).toBe("El partido ya no admite cambios.");
    });

    it("INVALID_RESULT has correct message", () => {
      expect(ERROR_MESSAGES.INVALID_RESULT).toBe(
        "El resultado no cierra: revisá goles y asistencias."
      );
    });

    it("VOTING_CLOSED has correct message", () => {
      expect(ERROR_MESSAGES.VOTING_CLOSED).toBe("La votación del MVP ya cerró.");
    });

    it("NOT_ELIGIBLE has correct message", () => {
      expect(ERROR_MESSAGES.NOT_ELIGIBLE).toBe("Solo votan los que jugaron el partido.");
    });

    it("ALREADY_VOTED has correct message", () => {
      expect(ERROR_MESSAGES.ALREADY_VOTED).toBe("Ya votaste en este partido.");
    });

    it("NOT_ENOUGH_TEAMS has correct message", () => {
      expect(ERROR_MESSAGES.NOT_ENOUGH_TEAMS).toBe(
        "Necesitás al menos 2 equipos para empezar."
      );
    });

    it("TOO_MANY_TEAMS has correct message", () => {
      expect(ERROR_MESSAGES.TOO_MANY_TEAMS).toBe("El torneo admite hasta 16 equipos.");
    });

    it("TOURNAMENT_NOT_DRAFT has correct message", () => {
      expect(ERROR_MESSAGES.TOURNAMENT_NOT_DRAFT).toBe("El torneo ya empezó.");
    });

    it("TOURNAMENT_NOT_RUNNING has correct message", () => {
      expect(ERROR_MESSAGES.TOURNAMENT_NOT_RUNNING).toBe("El torneo no está en curso.");
    });

    it("PENALTIES_REQUIRED has correct message", () => {
      expect(ERROR_MESSAGES.PENALTIES_REQUIRED).toBe(
        "En eliminación directa no hay empate: cargá los penales."
      );
    });

    it("NEXT_PLAYED has correct message", () => {
      expect(ERROR_MESSAGES.NEXT_PLAYED).toBe(
        "No se puede cambiar: el partido siguiente ya se jugó."
      );
    });
  });

  describe("dbErrorCode()", () => {
    it("returns the code when message is exactly a DB error code", () => {
      const error = { message: "NOT_ALLOWED" };
      expect(dbErrorCode(error)).toBe("NOT_ALLOWED");
    });

    it("returns the code when it appears as a word within the message", () => {
      const error = { message: "ERROR: LAST_ADMIN in transaction" };
      expect(dbErrorCode(error)).toBe("LAST_ADMIN");
    });

    it("returns null for unknown error message", () => {
      const error = { message: "duplicate key value violates unique constraint" };
      expect(dbErrorCode(error)).toBeNull();
    });

    it("returns null for null error", () => {
      expect(dbErrorCode(null)).toBeNull();
    });

    it("returns null for undefined error", () => {
      expect(dbErrorCode(undefined)).toBeNull();
    });

    it("returns null for string error", () => {
      expect(dbErrorCode("some error")).toBeNull();
    });

    it("returns null for error without message property", () => {
      const error = { code: "NOT_ALLOWED" };
      expect(dbErrorCode(error)).toBeNull();
    });

    it("returns null for error with non-string message", () => {
      const error = { message: 123 };
      expect(dbErrorCode(error)).toBeNull();
    });

    it("does not match code as a substring (only word boundary)", () => {
      const error = { message: "NOT_ALLOWEDEXTRA" };
      expect(dbErrorCode(error)).toBeNull();
    });
  });

  describe("mapDbError()", () => {
    it("returns the correct message for each DB error code", () => {
      for (const code of DB_ERROR_CODES) {
        const error = { message: code };
        expect(mapDbError(error)).toBe(ERROR_MESSAGES[code]);
        expect(mapDbError(error)).not.toContain(code);
      }
    });

    it("returns the correct message when code is within the error message", () => {
      const error = { message: "ERROR: INVALID_INPUT from trigger" };
      expect(mapDbError(error)).toBe(ERROR_MESSAGES.INVALID_INPUT);
    });

    it("returns GENERIC_ERROR for unknown database error", () => {
      const error = { message: "duplicate key value violates unique constraint" };
      const result = mapDbError(error);
      expect(result).toBe(GENERIC_ERROR);
      expect(result).not.toContain("duplicate");
    });

    it("returns GENERIC_ERROR for null", () => {
      expect(mapDbError(null)).toBe(GENERIC_ERROR);
    });

    it("returns GENERIC_ERROR for undefined", () => {
      expect(mapDbError(undefined)).toBe(GENERIC_ERROR);
    });

    it("returns GENERIC_ERROR for plain string", () => {
      expect(mapDbError("some error")).toBe(GENERIC_ERROR);
    });

    it("returns GENERIC_ERROR for error without message property", () => {
      const error = { code: "P0001" };
      expect(mapDbError(error)).toBe(GENERIC_ERROR);
    });

    it("never exposes raw Postgres error messages", () => {
      const postgresError = {
        message: "duplicate key value violates unique constraint users_email_key",
      };
      const result = mapDbError(postgresError);
      expect(result).toBe(GENERIC_ERROR);
      expect(result).not.toContain("duplicate");
      expect(result).not.toContain("constraint");
      expect(result).not.toContain("users_email_key");
    });

    it("never exposes raw PostgreSQL error for common DB errors", () => {
      const postgresError = {
        message: "violates foreign key constraint",
      };
      const result = mapDbError(postgresError);
      expect(result).toBe(GENERIC_ERROR);
      expect(result).not.toContain("violates");
      expect(result).not.toContain("constraint");
    });
  });
});
