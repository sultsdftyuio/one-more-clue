/** A FormData field as a string ("" when missing or a file). */
export function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "jo***@gmail.com" - enough to follow a flow in the logs without storing the address. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : "[redacted]";
}
