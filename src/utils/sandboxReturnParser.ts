/**
 * Utility to parse, sanitize, and validate unverified URL query parameters
 * returned by the PagueloFacil Sandbox Hosted Checkout redirect.
 *
 * CRITICAL SECURITY PRINCIPLES:
 * 1. URL parameters are strictly UNVERIFIED browser inputs that can be spoofed or intercepted.
 * 2. Never treat browser redirect as proof of payment.
 * 3. Never mark transactions, bookings, or quotations as paid based on URL parameters.
 * 4. "Payment status not verified" must be displayed until authoritative server verification.
 * 5. If TotalPagado is 0 or non-positive, display "No successful payment confirmed".
 * 6. Strip and never display sensitive merchant credentials (CCLW, tokens, keys).
 * 7. Zero database mutations or writes.
 */

export interface ParsedSandboxReturn {
  /** Whether the current URL contains the sandbox test return flag */
  isSandboxReturn: boolean;
  /** Raw reference passed in PARM_1 (e.g. TEST-PF-SANDBOX-...) */
  reference: string | null;
  /** Idempotency / attempt key passed in PARM_2 */
  attemptKey: string | null;
  /** Raw string value of TotalPagado as returned in URL */
  totalPagadoRaw: string | null;
  /** Parsed numeric amount or null if malformed/missing */
  amount: number | null;
  /** Reported Estado string (e.g. Aprobada, Rechazada, Pendiente) - UNVERIFIED */
  estado: string | null;
  /** Gateway operation identifier - UNVERIFIED */
  oper: string | null;
  /** Gateway reported reason or message - UNVERIFIED */
  razon: string | null;
  /** True if TotalPagado is missing, malformed, 0, or negative */
  isZeroAmount: boolean;
  /** ALWAYS FALSE for browser redirects. Verification requires server check. */
  isVerified: false;
  /** Human-readable headline required by security rules */
  headline: 'Payment status not verified' | 'No successful payment confirmed';
  /** Verification warning message */
  verificationNotice: string;
  /** Safe, sanitized key-value dictionary of non-sensitive parameters */
  sanitizedParams: Record<string, string>;
}

const SENSITIVE_PARAM_KEYS = new Set([
  'cclw',
  'token',
  'access_token',
  'key',
  'apikey',
  'secret',
  'authorization',
  'auth',
  'pan',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'password',
  'pwd',
]);

/**
 * Sanitizes a string to prevent XSS or abnormal control characters.
 */
function sanitizeValue(value: string): string {
  return value
    .replace(/[<>'"&]/g, '')
    .trim()
    .slice(0, 200);
}

/**
 * Safely parses TotalPagado string into a positive floating-point number.
 * Returns null if missing, non-numeric, or malformed.
 */
export function parseTotalPagado(rawVal: string | null): number | null {
  if (!rawVal) return null;
  const cleaned = rawVal.replace(/[^0-9.-]/g, '').trim();
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  if (isNaN(num) || !isFinite(num)) return null;
  return Number(num.toFixed(2));
}

/**
 * Parses URL search string into a structured, sanitized ParsedSandboxReturn object.
 */
export function parseSandboxReturnParams(queryStringOrSearch: string): ParsedSandboxReturn {
  let search = queryStringOrSearch || '';
  if (search.startsWith('?')) {
    search = search.slice(1);
  }

  const params = new URLSearchParams(search);

  // Detect sandbox-test=complete or sandbox_test=complete
  const hasHyphenFlag = params.get('sandbox-test') === 'complete' || params.has('sandbox-test');
  const hasUnderscoreFlag = params.get('sandbox_test') === 'complete' || params.has('sandbox_test');
  const isSandboxReturn = hasHyphenFlag || hasUnderscoreFlag;

  // Extract reference (PARM_1)
  const rawRef =
    params.get('PARM_1') ||
    params.get('parm_1') ||
    params.get('PARM1') ||
    params.get('parm1') ||
    params.get('ref') ||
    params.get('reference') ||
    null;
  const reference = rawRef ? sanitizeValue(rawRef) : null;

  // Extract attempt key (PARM_2)
  const rawAttempt =
    params.get('PARM_2') ||
    params.get('parm_2') ||
    params.get('PARM2') ||
    params.get('parm2') ||
    null;
  const attemptKey = rawAttempt ? sanitizeValue(rawAttempt) : null;

  // Extract TotalPagado
  const rawTotal =
    params.get('TotalPagado') ||
    params.get('totalpagado') ||
    params.get('totalPagado') ||
    params.get('Total') ||
    params.get('total') ||
    params.get('amount') ||
    null;
  const totalPagadoRaw = rawTotal ? sanitizeValue(rawTotal) : null;
  const amount = parseTotalPagado(totalPagadoRaw);

  // Extract Estado
  const rawEstado =
    params.get('Estado') ||
    params.get('estado') ||
    params.get('Status') ||
    params.get('status') ||
    null;
  const estado = rawEstado ? sanitizeValue(rawEstado) : null;

  // Extract Oper
  const rawOper =
    params.get('Oper') ||
    params.get('oper') ||
    params.get('operation') ||
    params.get('codOper') ||
    params.get('codoper') ||
    null;
  const oper = rawOper ? sanitizeValue(rawOper) : null;

  // Extract Razon
  const rawRazon =
    params.get('Razon') ||
    params.get('razon') ||
    params.get('Reason') ||
    params.get('reason') ||
    params.get('Motivo') ||
    params.get('motivo') ||
    params.get('message') ||
    null;
  const razon = rawRazon ? sanitizeValue(rawRazon) : null;

  // Zero-amount detection: TotalPagado <= 0, missing, or malformed
  const isZeroAmount = amount === null || amount <= 0;

  // Rule 4 & 5: If TotalPagado is 0, display 'No successful payment confirmed'
  // otherwise 'Payment status not verified'
  const headline: 'Payment status not verified' | 'No successful payment confirmed' =
    isZeroAmount ? 'No successful payment confirmed' : 'Payment status not verified';

  // Sanitize all parameters for safe diagnostic display, strictly discarding sensitive keys
  const sanitizedParams: Record<string, string> = {};
  params.forEach((val, key) => {
    const lowerKey = key.toLowerCase();
    if (!SENSITIVE_PARAM_KEYS.has(lowerKey)) {
      sanitizedParams[key] = sanitizeValue(val);
    }
  });

  return {
    isSandboxReturn,
    reference,
    attemptKey,
    totalPagadoRaw,
    amount,
    estado,
    oper,
    razon,
    isZeroAmount,
    isVerified: false, // Invariant: Browser redirect is NEVER verified proof
    headline,
    verificationNotice:
      'Payment status not verified. Browser URL redirect parameters are unverified and cannot confirm transaction settlement.',
    sanitizedParams,
  };
}
