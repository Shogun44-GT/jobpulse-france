import { timingSafeEqual } from "node:crypto";

export function hasValidBearerToken(header: string | null, expected: string | undefined) {
  if (!header || !expected || !header.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (suppliedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(suppliedBuffer, expectedBuffer);
}
