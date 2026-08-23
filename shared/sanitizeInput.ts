export function sanitizePlainText(input: string) {
  return input.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

export function sanitizeOptionalPlainText(input: string | null | undefined) {
  if (input === null || input === undefined) return input;
  const sanitized = sanitizePlainText(input);
  return sanitized || null;
}
