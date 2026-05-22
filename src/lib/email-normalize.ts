/**
 * Centralized email normalization.
 * Call before ANY email save or query to ensure case-insensitive uniqueness.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
