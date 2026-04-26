import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "@/lib/domain/practice/formatRelativeTime";

const now = new Date("2026-04-26T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("returns 'agora' for under a minute", () => {
    const t = new Date(now.getTime() - 30_000).toISOString();
    expect(formatRelativeTime(t, now)).toBe("agora");
  });

  it("formats minutes (singular and plural)", () => {
    expect(
      formatRelativeTime(new Date(now.getTime() - 60_000).toISOString(), now),
    ).toBe("ha 1 minuto");
    expect(
      formatRelativeTime(new Date(now.getTime() - 5 * 60_000).toISOString(), now),
    ).toBe("ha 5 minutos");
  });

  it("formats hours, days, and weeks", () => {
    expect(
      formatRelativeTime(new Date(now.getTime() - 60 * 60_000).toISOString(), now),
    ).toBe("ha 1 hora");
    expect(
      formatRelativeTime(new Date(now.getTime() - 26 * 60 * 60_000).toISOString(), now),
    ).toBe("ha 1 dia");
    expect(
      formatRelativeTime(new Date(now.getTime() - 8 * 24 * 60 * 60_000).toISOString(), now),
    ).toBe("ha 1 semana");
  });

  it("returns 'agora' for future dates (clock skew)", () => {
    expect(
      formatRelativeTime(new Date(now.getTime() + 60_000).toISOString(), now),
    ).toBe("agora");
  });

  it("returns 'data invalida' for unparseable input", () => {
    expect(formatRelativeTime("nope", now)).toBe("data invalida");
  });
});
