export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

/**
 * Convierte input a Date y valida que sea válida.
 * Lanza Error si es inválida.
 */
function toDate(input: Date | string): Date {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Fecha inválida: ${input}`);
  }
  return date;
}

/**
 * Remueve puntos finales de las abreviaturas que devuelve Intl
 * (ej: "sáb." → "sáb", "oct." → "oct").
 */
function removeDots(text: string): string {
  return text.replace(/\.+$/g, "");
}

/**
 * Obtiene el weekday corto en minúscula sin puntos.
 */
function getWeekdayShort(date: Date): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: APP_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "";
  return removeDots(weekday).toLowerCase();
}

/**
 * Obtiene el día del mes.
 */
function getDay(date: Date): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  return parts.find((p) => p.type === "day")?.value || "";
}

/**
 * Obtiene el mes abreviado en minúscula sin puntos.
 */
function getMonthShort(date: Date): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    timeZone: APP_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value || "";
  return removeDots(month).toLowerCase();
}

/**
 * Obtiene la hora en formato HH:mm (24h).
 */
function getTimeString(date: Date): string {
  const formatter = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value || "";
  const minute = parts.find((p) => p.type === "minute")?.value || "";
  return `${hour}:${minute}`;
}

/**
 * Formatea una fecha como "sáb 3 oct · 21:00" en hora de Buenos Aires.
 * Lanza Error si la fecha es inválida.
 */
export function formatMatchDate(input: Date | string): string {
  const date = toDate(input);
  const weekday = getWeekdayShort(date);
  const day = getDay(date);
  const month = getMonthShort(date);
  const time = getTimeString(date);
  return `${weekday} ${day} ${month} · ${time}`;
}

/**
 * Formatea una fecha como "3 oct" en hora de Buenos Aires.
 * Lanza Error si la fecha es inválida.
 */
export function formatShortDate(input: Date | string): string {
  const date = toDate(input);
  const day = getDay(date);
  const month = getMonthShort(date);
  return `${day} ${month}`;
}

/**
 * Formatea la hora como "21:00" en hora de Buenos Aires.
 * Lanza Error si la fecha es inválida.
 */
export function formatTime(input: Date | string): string {
  const date = toDate(input);
  return getTimeString(date);
}
