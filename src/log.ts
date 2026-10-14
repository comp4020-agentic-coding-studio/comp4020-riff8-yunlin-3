import { createHash } from "node:crypto";

// One logfmt line per event, no free text ever. A value that isn't a finite
// number or a plain token (no space, quote, "=" or backslash) is written as
// "?", so a colophon body, a header or a query string can't reach the log by
// construction, only by someone choosing to pass one in as a field.
const SAFE = /^[^\s"=\\]+$/;

function value(v: string | number): string {
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "?";
  return SAFE.test(v) ? v : "?";
}

export function log(event: string, fields: Record<string, string | number> = {}): void {
  const parts = [`event=${value(event)}`];
  for (const [k, v] of Object.entries(fields)) parts.push(`${value(k)}=${value(v)}`);
  console.log(parts.join(" "));
}

// A visitor in the log: the seal they sign with, plus a short one-way tag of
// their token so two visitors sharing a hash glyph stay distinguishable. The
// token is a random UUID, so the tag can't be reversed; the domain prefix
// keeps it from matching any other hash of the same token.
export function who(token: string, glyph: string): string {
  const tag = createHash("sha256").update(`colophon-log:${token}`).digest("hex").slice(0, 6);
  return `${glyph}#${tag}`;
}
