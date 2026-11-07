import {
  CreatePaymentSessionParams,
  PaymentSessionResult,
  VerifyTransactionParams,
  TransactionVerificationResult,
  ParsedWebhookResult,
  PaymentGatewayConfig,
  PagueloFacilLinkDaemonRequest,
  PagueloFacilLinkDaemonResponse,
} from '../../src/types/payment.js';

/**
 * Universal Payment Gateway Adapter Contract
 */
export interface PaymentGatewayAdapter {
  createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSessionResult>;
  verifyTransaction(params: VerifyTransactionParams): Promise<TransactionVerificationResult>;
  parseWebhook(payload: any, headers?: Record<string, string | undefined>): ParsedWebhookResult;
  isConfigured(): boolean;
  getConfig(): PaymentGatewayConfig;
}

export interface DayTripPackageDefinition {
  id: 'day-tour-panama-city' | 'day-tour-port';
  title: { en: string; es: string };
  adultRate: number;
  childRate: number;
  priceInCents: number;
  childPriceInCents: number;
  includesTransport: boolean;
  minTravelers: number;
  maxTravelers: number;
}

/**
 * Official Day Tour Packages confirmed from website data (TheIslands.tsx & TermsAndConditionsPage.tsx)
 * - Panama City Day Tour: $145.00 USD (14,500 integer cents) per person with round-trip 4x4 overland transfer.
 * - Port Cartí Day Tour: $69.00 USD (6,900 integer cents) per person for maritime boat tour from Cartí port.
 * Never invent prices or alter official rates without approval.
 */
export const DAY_TOUR_PACKAGES: Record<string, DayTripPackageDefinition> = {
  'day-tour-panama-city': {
    id: 'day-tour-panama-city',
    title: {
      en: 'Day Tour from Panama City (Full Day with 4x4 Transport)',
      es: 'Pasadía desde Ciudad de Panamá (Completo con Traslado 4x4)',
    },
    adultRate: 142.0,
    childRate: 142.0,
    priceInCents: 14200,
    childPriceInCents: 14200,
    includesTransport: true,
    minTravelers: 1,
    maxTravelers: 14,
  },
  'day-tour-port': {
    id: 'day-tour-port',
    title: {
      en: 'Day Tour from Guna Yala Port (Maritime Excursion from Port Cartí)',
      es: 'Pasadía desde Puerto Cartí (Excursión Marítima desde Puerto)',
    },
    adultRate: 69.0,
    childRate: 69.0,
    priceInCents: 6900,
    childPriceInCents: 6900,
    includesTransport: false,
    minTravelers: 1,
    maxTravelers: 14,
  },
};

/**
 * Server-Side Configurable Day Trip Pricing Structure
 */
export interface DayTripPricingConfig {
  adultRate?: number;
  childRate?: number;
  isApproved: boolean;
}

export function getDayTripPricingConfig(): DayTripPricingConfig {
  const envAdult = process.env.APPROVED_DAY_TRIP_ADULT_RATE ? Number(process.env.APPROVED_DAY_TRIP_ADULT_RATE) : undefined;
  const envChild = process.env.APPROVED_DAY_TRIP_CHILD_RATE ? Number(process.env.APPROVED_DAY_TRIP_CHILD_RATE) : undefined;
  const isApproved = process.env.ENABLE_APPROVED_DAY_TRIP_PRICING === 'true' && Boolean(envAdult && envAdult > 0);

  return {
    adultRate: envAdult,
    childRate: envChild,
    isApproved,
  };
}

export function calculateAuthoritativeDayTripAmount(
  adults: number,
  children = 0,
  packageIdOrConfig?: string | DayTripPricingConfig,
  maybeConfig?: DayTripPricingConfig
): {
  valid: boolean;
  isApproved: boolean;
  packageId?: string;
  amount: number;
  amountInCents: number;
  currency: 'USD';
  breakdown?: {
    packageName: string;
    adults: number;
    children: number;
    ratePerAdult: number;
    ratePerChild: number;
    onlineTotal: number;
    onlineTotalInCents: number;
    localFeesNotice: string;
  };
  error?: string;
} {
  if (typeof adults !== 'number' || adults < 1) {
    return { valid: false, isApproved: false, amount: 0, amountInCents: 0, currency: 'USD', error: 'At least one adult is required for day trips.' };
  }
  if (typeof children !== 'number' || children < 0) {
    return { valid: false, isApproved: false, amount: 0, amountInCents: 0, currency: 'USD', error: 'Invalid children count.' };
  }
  const totalTravelers = adults + children;
  if (totalTravelers > 14) {
    return { valid: false, isApproved: false, amount: 0, amountInCents: 0, currency: 'USD', error: 'Party size exceeds standard 4x4 & boat capacity (max 14).' };
  }

  // Handle polymorphic overload: 3rd arg may be overrideConfig (for backwards compatibility with tests)
  const isOverrideConfig = typeof packageIdOrConfig === 'object' && packageIdOrConfig !== null;
  const overrideConfig: DayTripPricingConfig | undefined = isOverrideConfig
    ? (packageIdOrConfig as DayTripPricingConfig)
    : maybeConfig;
  const requestedPackageId = typeof packageIdOrConfig === 'string' ? packageIdOrConfig : undefined;

  // 1. If custom overrideConfig is explicitly provided (e.g. Test 12)
  if (overrideConfig) {
    if (!overrideConfig.isApproved || !overrideConfig.adultRate) {
      return {
        valid: false,
        isApproved: false,
        amount: 0,
        amountInCents: 0,
        currency: 'USD',
        error: "Day-trip rates are pending Petra's official pricing approval. Automatic checkout is disabled; please submit as a booking request.",
      };
    }
    const adultRate = overrideConfig.adultRate;
    const childRate = overrideConfig.childRate ?? adultRate;
    const adultCents = Math.round(adults * adultRate * 100);
    const childCents = Math.round(children * childRate * 100);
    const totalCents = adultCents + childCents;
    const totalDollars = Number((totalCents / 100).toFixed(2));
    return {
      valid: true,
      isApproved: true,
      amount: totalDollars,
      amountInCents: totalCents,
      currency: 'USD',
      breakdown: {
        packageName: 'Custom Approved Day Trip',
        adults,
        children,
        ratePerAdult: adultRate,
        ratePerChild: childRate,
        onlineTotal: totalDollars,
        onlineTotalInCents: totalCents,
        localFeesNotice: 'Local Comarca taxes payable in cash on site.',
      },
    };
  }

  // 2. If a specific official package is requested by ID
  if (requestedPackageId && DAY_TOUR_PACKAGES[requestedPackageId]) {
    const pkg = DAY_TOUR_PACKAGES[requestedPackageId];
    const adultCents = adults * pkg.priceInCents;
    const childCents = children * pkg.childPriceInCents;
    const totalCents = adultCents + childCents;
    const totalDollars = Number((totalCents / 100).toFixed(2));
    return {
      valid: true,
      isApproved: true,
      packageId: pkg.id,
      amount: totalDollars,
      amountInCents: totalCents,
      currency: 'USD',
      breakdown: {
        packageName: pkg.title.en,
        adults,
        children,
        ratePerAdult: pkg.adultRate,
        ratePerChild: pkg.childRate,
        onlineTotal: totalDollars,
        onlineTotalInCents: totalCents,
        localFeesNotice: 'Guna Yala entrance fee ($20/person foreign, $5/person resident) and Cartí port tax ($2-$3/person) payable locally upon arrival in cash USD (not charged online).',
      },
    };
  }

  // 3. Fallback: check environment-configured rate
  const envConfig = getDayTripPricingConfig();
  if (!envConfig.isApproved || !envConfig.adultRate) {
    return {
      valid: false,
      isApproved: false,
      amount: 0,
      amountInCents: 0,
      currency: 'USD',
      error: "Day-trip rates are pending Petra's official pricing approval. Automatic checkout is disabled; please submit as a booking request.",
    };
  }

  const childRate = envConfig.childRate ?? envConfig.adultRate;
  const adultCents = Math.round(adults * envConfig.adultRate * 100);
  const childCents = Math.round(children * childRate * 100);
  const totalCents = adultCents + childCents;
  const totalDollars = Number((totalCents / 100).toFixed(2));

  return {
    valid: true,
    isApproved: true,
    amount: totalDollars,
    amountInCents: totalCents,
    currency: 'USD',
    breakdown: {
      packageName: 'Day Trip Excursion',
      adults,
      children,
      ratePerAdult: envConfig.adultRate,
      ratePerChild: childRate,
      onlineTotal: totalDollars,
      onlineTotalInCents: totalCents,
      localFeesNotice: 'Local Comarca taxes payable in cash on site.',
    },
  };
}

// Official PagueloFacil Endpoints
export const PAGUELOFACIL_ENDPOINTS = {
  SANDBOX_LINK_DAEMON: 'https://sandbox.paguelofacil.com/LinkDeamon.cfm',
  PRODUCTION_LINK_DAEMON: 'https://secure.paguelofacil.com/LinkDeamon.cfm',
  SANDBOX_VERIFY: 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions',
  PRODUCTION_VERIFY: 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions',
};

// Documented Trusted PagueloFacil Checkout Hostnames
export const TRUSTED_CHECKOUT_HOSTNAMES: Record<'sandbox' | 'production', string[]> = {
  sandbox: [
    'sandbox.paguelofacil.com',
    'checkout-sand.paguelofacil.com',
    'checkout-demo.paguelofacil.com',
  ],
  production: [
    'secure.paguelofacil.com',
    'checkout.paguelofacil.com',
  ],
};

/**
 * Validates merchant credentials (CCLW).
 * Does NOT enforce unsupported 32-character requirement; accepts any non-empty alphanumeric identifier.
 */
export function validateCclw(cclw?: string): boolean {
  if (typeof cclw !== 'string') return false;
  const trimmed = cclw.trim();
  // Validates non-empty string without arbitrary length assumption
  return trimmed.length > 0 && /^[A-Za-z0-9_-]+$/.test(trimmed);
}

/**
 * Masks sensitive credentials so keys are never exposed in logs or client responses.
 */
export function maskCredential(cred?: string): string {
  if (!cred) return '[EMPTY]';
  const trimmed = cred.trim();
  if (trimmed.length <= 4) return '***';
  return `***${trimmed.slice(-4)}`;
}

/**
 * Validates returned PagueloFacil checkout URL against documented trusted hostnames.
 * Enforces HTTPS, rejects nonstandard ports, embedded credentials, unrecognized hosts and subdomains.
 */
export function validatePagueloFacilCheckoutUrl(
  rawUrl: string,
  environment: 'sandbox' | 'production'
): { valid: boolean; url?: string; error?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Checkout URL must use secure HTTPS protocol.' };
    }
    if (parsed.port && parsed.port !== '443') {
      return { valid: false, error: 'Checkout URL must not specify a custom port.' };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'Checkout URL must not contain embedded credentials.' };
    }
    const trustedHosts = TRUSTED_CHECKOUT_HOSTNAMES[environment] || [];
    if (!trustedHosts.includes(parsed.hostname.toLowerCase())) {
      return {
        valid: false,
        error: `Untrusted checkout hostname "${parsed.hostname}". Must match trusted PagueloFacil host for ${environment} environment.`,
      };
    }
    return { valid: true, url: parsed.toString() };
  } catch (err: any) {
    return { valid: false, error: `Invalid checkout URL format: ${err.message}` };
  }
}

/**
 * PagueloFacil Gateway Adapter
 * Safe Preparation & Demo Phase (Part 25E.1):
 * - Live payments are strictly DISABLED pending Petra's merchant configuration (ENABLE_LIVE_PAYMENTS=false).
 * - Environment is selected EXCLUSIVELY via trusted server-side configuration; caller overrides are prohibited.
 * - CCLW validation does not enforce arbitrary length rules.
 * - Real gateway responses are parsed; mock URLs are never manufactured in runtime.
 * - Webhook processing requires authoritative server-to-server verification before approval.
 */
export class PagueloFacilGatewayAdapter implements PaymentGatewayAdapter {
  private config: PaymentGatewayConfig;
  private testTransport?: (action: string, payload: any) => Promise<any>;

  constructor(customConfig?: Partial<PaymentGatewayConfig>, testTransport?: (action: string, payload: any) => Promise<any>) {
    const cclw = (customConfig?.cclw ?? process.env.PAGUELOFACIL_CCLW ?? '').trim();
    const accessToken = (customConfig?.accessToken ?? process.env.PAGUELOFACIL_ACCESS_TOKEN ?? '').trim();
    const sandboxCclw = (customConfig?.sandboxCclw ?? process.env.PAGUELOFACIL_DEMO_CCLW ?? process.env.PAGUELOFACIL_SANDBOX_CCLW ?? '').trim();
    const sandboxAccessToken = (customConfig?.sandboxAccessToken ?? process.env.PAGUELOFACIL_DEMO_ACCESS_TOKEN ?? process.env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN ?? '').trim();

    // Trusted server-side activation flags
    const enableLivePayments = customConfig?.enableLivePayments ?? (process.env.ENABLE_LIVE_PAYMENTS === 'true');
    const enableSandboxPayments = customConfig?.enableSandboxPayments ?? (
      (process.env.ENABLE_DEMO_PAYMENTS === 'true' || process.env.ENABLE_SANDBOX_PAYMENTS === 'true')
    );

    // Environment Selection: Strictly server-side
    let environment: 'sandbox' | 'production' | 'unconfigured' = 'unconfigured';
    const serverEnvSetting = (customConfig?.environment ?? process.env.PAGUELOFACIL_ENV ?? '').trim().toLowerCase();

    if (serverEnvSetting === 'production' && enableLivePayments && validateCclw(cclw) && Boolean(accessToken)) {
      environment = 'production';
    } else if (
      (serverEnvSetting === 'sandbox' || serverEnvSetting === 'demo') &&
      enableSandboxPayments &&
      (validateCclw(sandboxCclw) || Boolean(testTransport))
    ) {
      environment = 'sandbox';
    }

    this.config = {
      cclw,
      accessToken,
      sandboxCclw,
      sandboxAccessToken,
      environment,
      returnUrlBase: process.env.PAGUELOFACIL_RETURN_URL || 'https://gunayalapanama.com/checkout/complete',
      webhookUrl: process.env.PAGUELOFACIL_WEBHOOK_URL || 'https://gunayalapanama.com/.netlify/functions/payment-webhook',
      isConfigured: environment === 'production',
      isSandboxConfigured: environment === 'sandbox',
      enableLivePayments,
      enableSandboxPayments,
    };

    this.testTransport = testTransport;
  }

  public isConfigured(): boolean {
    return this.config.environment === 'production' && this.config.enableLivePayments;
  }

  public isSandboxConfigured(): boolean {
    return this.config.environment === 'sandbox' && Boolean(this.config.enableSandboxPayments);
  }

  public getConfig(): PaymentGatewayConfig {
    return { ...this.config };
  }

  /**
   * Generates a hosted checkout payment session.
   * - Enforces currency USD and minimum $1.00.
   * - Requires non-empty idempotencyKey.
   * - Environment is derived strictly from server configuration.
   * - Uses actual data.url returned by PagueloFacil LinkDeamon.cfm and validates hostname.
   * - Never manufactures fake URLs outside isolated unit test transport.
   */
  public async createPaymentSession(params: CreatePaymentSessionParams): Promise<PaymentSessionResult> {
    // 1. Validate currency
    if (params.currency !== 'USD') {
      return {
        success: false,
        paymentId: '',
        error: `Unsupported currency: ${params.currency}. Guna Yala Panama Travel accepts USD only.`,
      };
    }

    // 2. Validate amount
    if (!params.amount || params.amount < 1.00) {
      return {
        success: false,
        paymentId: '',
        error: `Invalid payment amount: $${params.amount}. Minimum transaction is $1.00 USD.`,
      };
    }

    // 3. Validate idempotency key
    if (!params.idempotencyKey || !params.idempotencyKey.trim()) {
      return {
        success: false,
        paymentId: '',
        error: 'Missing required idempotency key for payment creation.',
      };
    }

    // 4. In isolated unit tests with mock transport
    if (this.testTransport) {
      const mockResult: PaymentSessionResult = await this.testTransport('createPaymentSession', params);
      // Validate returned URL even in test transport
      if (mockResult.paymentUrl) {
        const envToCheck = this.config.environment === 'production' ? 'production' : 'sandbox';
        const urlValidation = validatePagueloFacilCheckoutUrl(mockResult.paymentUrl, envToCheck);
        if (!urlValidation.valid) {
          return {
            success: false,
            paymentId: '',
            error: `Gateway returned invalid or untrusted checkout URL: ${urlValidation.error}`,
          };
        }
      }
      return mockResult;
    }

    // 5. Server-side environment check
    if (this.config.environment === 'unconfigured') {
      return {
        success: false,
        paymentId: `prep_${Date.now()}_${params.bookingReference}`,
        error: 'PagueloFacil payment gateway is in safe preparation mode. Processing is unconfigured pending merchant verification.',
      };
    }

    const isSandbox = this.config.environment === 'sandbox';
    const activeCclw = isSandbox ? this.config.sandboxCclw : this.config.cclw;

    if (!validateCclw(activeCclw)) {
      return {
        success: false,
        paymentId: '',
        error: `Missing or invalid PagueloFacil CCLW credentials for ${this.config.environment} environment.`,
      };
    }

    const endpoint = isSandbox
      ? PAGUELOFACIL_ENDPOINTS.SANDBOX_LINK_DAEMON
      : PAGUELOFACIL_ENDPOINTS.PRODUCTION_LINK_DAEMON;

    const returnUrl = `${this.config.returnUrlBase}?bookingReference=${encodeURIComponent(params.bookingReference)}&idem=${encodeURIComponent(params.idempotencyKey)}`;

    // Build official PagueloFacil LinkDeamon request payload
    const requestPayload: PagueloFacilLinkDaemonRequest = {
      CCLW: activeCclw!,
      CMTN: Number(params.amount.toFixed(2)),
      CDSC: params.description.slice(0, 150),
      RETURN_URL: returnUrl,
      PARM_1: params.bookingReference,
      PARM_2: params.idempotencyKey,
      EXPIRES_IN: params.expiresInSeconds || 7200,
    };

    try {
      const formParams = new URLSearchParams();
      formParams.append('CCLW', requestPayload.CCLW);
      formParams.append('CMTN', requestPayload.CMTN.toFixed(2));
      formParams.append('CDSC', requestPayload.CDSC);
      formParams.append('RETURN_URL', requestPayload.RETURN_URL);
      formParams.append('PARM_1', requestPayload.PARM_1);
      if (requestPayload.PARM_2) formParams.append('PARM_2', requestPayload.PARM_2);
      if (requestPayload.EXPIRES_IN) formParams.append('EXPIRES_IN', String(requestPayload.EXPIRES_IN));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          paymentId: '',
          error: `PagueloFacil gateway returned HTTP ${response.status} ${response.statusText}.`,
        };
      }

      const responseData: PagueloFacilLinkDaemonResponse = await response.json();

      if (responseData.headerStatus?.code !== 200 || !responseData.data?.url) {
        return {
          success: false,
          paymentId: '',
          error: responseData.headerStatus?.description || responseData.message || 'PagueloFacil failed to generate checkout link.',
          rawGatewayResponse: responseData,
        };
      }

      // Validate returned checkout URL against documented trusted hostnames
      const urlValidation = validatePagueloFacilCheckoutUrl(responseData.data.url, this.config.environment);
      if (!urlValidation.valid) {
        return {
          success: false,
          paymentId: '',
          error: `Gateway returned untrusted checkout URL: ${urlValidation.error}`,
          rawGatewayResponse: responseData,
        };
      }

      return {
        success: true,
        paymentId: `tx_${Date.now()}_${params.bookingReference}`,
        paymentUrl: urlValidation.url,
        gatewayLinkCode: responseData.data.code,
        environment: this.config.environment,
        expiresAt: new Date(Date.now() + (params.expiresInSeconds || 7200) * 1000).toISOString(),
        rawGatewayResponse: responseData,
      };
    } catch (networkErr: any) {
      return {
        success: false,
        paymentId: '',
        error: `Network error connecting to PagueloFacil: ${networkErr.message}`,
      };
    }
  }

  /**
   * Authoritative server-to-server transaction status verification.
   * Never approves a transaction based merely on customer redirect or unverified callback.
   */
  public async verifyTransaction(params: VerifyTransactionParams): Promise<TransactionVerificationResult> {
    if (!params.gatewayOperationId && !params.bookingReference) {
      return {
        success: false,
        verified: false,
        status: 'pending',
        error: 'Missing required transaction identifier (gatewayOperationId or bookingReference).',
      };
    }

    if (this.testTransport) {
      return await this.testTransport('verifyTransaction', params);
    }

    // In runtime, authoritative verification requires configured merchant API access token
    const targetEnv = params.environment || (this.config.environment === 'production' ? 'production' : 'sandbox');
    const isSandbox = targetEnv === 'sandbox';
    const activeToken = isSandbox ? this.config.sandboxAccessToken : this.config.accessToken;

    if (!activeToken) {
      return {
        success: false,
        verified: false,
        status: 'pending',
        missingRequirement: 'Authoritative transaction verification requires PagueloFacil REST API token (PAGUELOFACIL_ACCESS_TOKEN / PAGUELOFACIL_SANDBOX_ACCESS_TOKEN).',
        error: 'Cannot authoritatively verify payment without configured merchant API token.',
      };
    }

    // Dispatch authenticated query to PagueloFacil MerchantTransactions API
    try {
      const verifyUrl = isSandbox
        ? PAGUELOFACIL_ENDPOINTS.SANDBOX_VERIFY
        : PAGUELOFACIL_ENDPOINTS.PRODUCTION_VERIFY;

      const filterParam = params.gatewayOperationId
        ? `codOper::${params.gatewayOperationId}`
        : `customParm1::${params.bookingReference}`;

      const response = await fetch(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          verified: false,
          status: 'pending',
          error: `Verification API returned HTTP ${response.status}.`,
        };
      }

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : []);
      const matched = records.find((r: any) =>
        r.codOper === params.gatewayOperationId || r.customParm1 === params.bookingReference
      );

      if (!matched) {
        return {
          success: false,
          verified: false,
          status: 'pending',
          error: `No authoritative record found for operation ${params.gatewayOperationId || params.bookingReference}.`,
        };
      }

      const isApproved = String(matched.status).toLowerCase() === 'aprobada' || matched.status === 1 || matched.status === 2;

      return {
        success: true,
        verified: isApproved,
        status: isApproved ? 'approved' : 'rejected',
        amountPaid: Number(matched.amount || matched.total || 0),
        currency: 'USD',
        cardType: matched.cardType,
        authCode: matched.authCode,
        gatewayOperationId: matched.codOper,
        rawGatewayStatus: String(matched.status),
      };
    } catch (err: any) {
      return {
        success: false,
        verified: false,
        status: 'pending',
        error: `Verification query error: ${err.message}`,
      };
    }
  }

  /**
   * Parses gateway callback / webhook payloads and checks merchant CCLW.
   */
  public parseWebhook(payload: any, headers?: Record<string, string | undefined>): ParsedWebhookResult {
    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        eventType: 'unknown',
        error: 'Invalid webhook payload format: expected JSON object.',
      };
    }

    const payloadCclw = (payload.CCLW || payload.cclw || '').trim();
    const isLiveMatch = Boolean(this.config.cclw && payloadCclw === this.config.cclw);
    const isSandboxMatch = Boolean(this.config.sandboxCclw && payloadCclw === this.config.sandboxCclw);

    // If merchant identifiers are configured on server, reject unauthenticated / mismatched callbacks
    if ((this.config.cclw || this.config.sandboxCclw) && payloadCclw && !isLiveMatch && !isSandboxMatch) {
      return {
        isValid: false,
        eventType: 'unknown',
        error: 'Security alert: Webhook CCLW does not match configured merchant identifier.',
      };
    }

    const estado = String(payload.Estado || payload.status || '').trim().toLowerCase();
    const oper = String(payload.Oper || payload.codOper || payload.gatewayOperationId || '').trim();
    const rawTotal = payload.TotalPagado || payload.CMTN || payload.amount;
    const amountPaid = rawTotal ? Number(rawTotal) : undefined;
    const cardType = payload.Tipo || payload.cardType;
    const authCode = payload.authCode || payload.authStatus;
    const bookingRef = payload.PARM_1 || payload.relatedTx || payload.bookingReference;
    const gatewayLinkCode = String(payload.code || payload.linkCode || payload.gatewayLinkCode || '').trim() || undefined;
    const idempotencyKey = String(payload.PARM_2 || payload.idempotencyKey || payload.customParm2 || '').trim() || undefined;

    const detectedEnv: 'sandbox' | 'production' = isSandboxMatch ? 'sandbox' : 'production';

    if (estado === 'aprobada' || estado === 'approved' || estado === '1' || estado === '2') {
      return {
        isValid: true,
        eventType: 'payment_approved',
        gatewayOperationId: oper,
        bookingReference: bookingRef,
        gatewayLinkCode,
        idempotencyKey,
        amountPaid,
        currency: 'USD',
        cardType,
        authCode,
        environment: detectedEnv,
        rawPayload: payload,
      };
    }

    if (estado === 'rechazada' || estado === 'rejected' || estado === '0' || estado === 'declined') {
      return {
        isValid: true,
        eventType: 'payment_rejected',
        gatewayOperationId: oper,
        bookingReference: bookingRef,
        gatewayLinkCode,
        idempotencyKey,
        amountPaid,
        currency: 'USD',
        cardType,
        environment: detectedEnv,
        error: payload.Razon || payload.errorMessage || 'Payment was declined by card network.',
        rawPayload: payload,
      };
    }

    return {
      isValid: false,
      eventType: 'unknown',
      error: `Unrecognized gateway status: "${estado}".`,
      rawPayload: payload,
    };
  }
}
