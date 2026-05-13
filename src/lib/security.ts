/**
 * Password strength validation and common-password check
 */

const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', '123456789',
  'qwerty', 'qwerty123', 'abc123', 'letmein', 'monkey',
  'dragon', 'master', 'admin', 'admin123', 'login',
  'welcome', 'passw0rd', 'shadow', 'trustno1', 'sunshine',
  'princess', 'football', 'baseball', 'iloveyou', 'batman',
  'access', 'hello', 'charlie', 'donald', '654321',
  'password1', 'password!', 'p@ssword', 'p@ssw0rd',
  'changeme', 'secret', 'test', 'test123', 'guest',
]);

export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0-4
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else {
    score += 1;
  }

  if (password.length > 128) {
    errors.push('Password must be at most 128 characters');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain a lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain an uppercase letter');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    errors.push('Password must contain a digit');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  }

  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    errors.push('This password is too common. Choose a more unique password.');
    score = Math.max(0, score - 2);
  }

  return {
    valid: errors.length === 0 && score >= 3,
    score: Math.min(4, Math.max(0, score)),
    errors,
  };
}

/**
 * Input sanitization - strips HTML tags and trims whitespace
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#x27;';
        default: return char;
      }
    })
    .trim();
}

/**
 * Sanitize for plain-text storage (strip HTML but don't encode entities)
 */
export function sanitizePlainText(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}
