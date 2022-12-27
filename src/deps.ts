import { config } from "./config.ts";

export function isNumeric(value: string) {
  return /^-?\d+$/.test(value);
}

export function error(error: string, status: number): Response {
  return new Response(error, { status: status });
}

export async function customHash(string: string): Promise<string> {
  const encrypted = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(config.passwordSalt + string),
  );

  return [...new Uint8Array(encrypted)].map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export async function exists(string: string) {
  try {
    await Deno.stat(string);
    return true;
  } catch {
    return false;
  }
}
