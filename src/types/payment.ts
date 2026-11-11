/**
 * Payment System & Gateway Abstraction Types
 * Guna Yala Panama Travel — Part 25B
 */

export type PaymentLifecycleStatus =
  | 'awaiting_approval' // Request received; Petra must review availability before payment
  | 'pending'           // Payment session created; awaiting customer hosted checkout
  | 'processing'        // Checkout initiated / 3DS authorization in progress
  | 'approved'          // Successfully verified by payment gateway
  | 'rejected'          // Card declined / fraud check failed
  | 'expired'           // Payment link expired before checkout
  | 'refunded';         // Administratively refunded

export type PaymentType = 'deposit' | 'full' | 'balance';

export type SupportedCurrency = 'USD';

export interface PaymentTransactionRecord {
  id: string;
  bookingReference: string;
  quotationId?: string;
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  gateway: 'paguelofacil';
  environment: 'sandbox' | 'production';
  gatewayOperationId?: string;
  gatewayLinkCode?: string;
  paymentUrl?: string;
  currency: SupportedCurrency;
  expectedAmount: number;
  amountPaid?: number;
  paymentType: PaymentType;
  status: PaymentLifecycleStatus;
  cardType?: string;
  authCode?: string;
  errorCode?: string;
  errorMessage?: string;
  idempotencyKey: string;
  expiresAt?: string;
  verifiedAt?: string;
  auditMetadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentGatewayConfig {
  cclw?: string;
  accessToken?: string;
  sandboxCclw?: string;
  sandboxAccessToken?: string;
  environment: 'sandbox' | 'production' | 'unconfigured';
  returnUrlBase?: string;
  webhookUrl?: string;
  isConfigured: boolean;
  isSandboxConfigured?: boolean;
  enableLivePayments: boolean;
  enableSandboxPayments?: boolean;
}

export interface CreatePaymentSessionParams {
  bookingReference: string;
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  quotationId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  amount: number;
  currency: SupportedCurrency;
  paymentType: PaymentType;
  description: string;
  expiresInSeconds?: number;
  idempotencyKey: string;
}

export interface PaymentSessionResult {
  success: boolean;
  paymentId: string;
  paymentUrl?: string;
  gatewayLinkCode?: string;
  expiresAt?: string;
  environment?: 'sandbox' | 'production' | 'unconfigured';
  isSimulated?: boolean;
  rawGatewayResponse?: any;
  error?: string;
}

export interface VerifyTransactionParams {
  gatewayOperationId?: string;
  bookingReference?: string;
  expectedAmount?: number;
  idempotencyKey?: string;
  environment?: 'sandbox' | 'production';
}

export interface TransactionVerificationResult {
  success: boolean;
  verified: boolean;
  status: PaymentLifecycleStatus;
  amountPaid?: number;
  currency?: SupportedCurrency;
  cardType?: string;
  authCode?: string;
  gatewayOperationId?: string;
  rawGatewayStatus?: string;
  missingRequirement?: string;
  error?: string;
}

export interface ParsedWebhookResult {
  isValid: boolean;
  eventType: 'payment_approved' | 'payment_rejected' | 'unknown';
  gatewayOperationId?: string;
  bookingReference?: string;
  gatewayLinkCode?: string;
  idempotencyKey?: string;
  amountPaid?: number;
  currency?: SupportedCurrency;
  cardType?: string;
  authCode?: string;
  environment?: 'sandbox' | 'production';
  error?: string;
  rawPayload?: any;
}

/**
 * Official PagueloFacil LinkDeamon.cfm Request Specification
 * Verified from developers.paguelofacil.com
 */
export interface PagueloFacilLinkDaemonRequest {
  CCLW: string;         // Connection key / Merchant Code
  CMTN: number;         // Total amount (USD, 2 decimal places, min $1.00)
  CDSC: string;         // Description (max 150 chars)
  RETURN_URL: string;   // Hex-encoded or standard return URL
  PARM_1: string;       // Booking reference (e.g. 'GNY-482325')
  PARM_2?: string;      // Custom tracking (e.g. quotationId or paymentType)
  EXPIRES_IN?: number;  // Expiration in seconds
}

/**
 * Official PagueloFacil LinkDeamon.cfm Response Specification
 */
export interface PagueloFacilLinkDaemonResponse {
  headerStatus: {
    code: number;
    status: string;
    description?: string;
  };
  data?: {
    url: string;
    code?: string;
  };
  message?: string;
}

/**
 * Admin-Only PagueloFacil Sandbox Connectivity Test Types (Part 25H & Existing Tx Diagnostic)
 */
export interface AdminSandboxTestRequest {
  adminNote?: string;
  action?: 'test_connectivity' | 'diagnose_existing_transaction';
  bookingReference?: string;
  operationCode?: string;
}

export interface ExistingTransactionDiagnosticResult {
  success: boolean;
  action: 'diagnose_existing_transaction';
  bookingReference: string;
  targetOperationCode: string;
  databaseLookup: {
    rowFound: boolean;
    exactOneRow: boolean;
    matchCount: number;
    dbErrorCode?: string | null;
    dbErrorMessage?: string | null;
    transactionRecord?: any;
  };
  gatewayDiagnostic: {
    endpoint: string;
    tokenConfigured: boolean;
    httpStatus?: number;
    recordsFoundCount: number;
    diagnosticCategory: 'approved' | 'declined' | 'absent_records' | 'authentication_failure' | 'mismatched_identifiers' | 'validation_rejection' | 'parsing_problem';
    parsedRecord?: {
      codOper?: string;
      status?: any;
      txType?: string;
      amount?: number;
      currency?: string;
      idMerchant?: string;
      bookingReference?: string;
    };
    error?: string;
  };
  matchedFieldNames?: string[];
  identifierFieldsPresence?: Record<string, boolean>;
  identifierFieldMatches?: Record<string, boolean>;
  additionalFieldInspections?: Array<{
    fieldName: string;
    exists: boolean;
    hasValue: boolean;
    containsBookingRef: boolean;
    containsLinkCode: boolean;
    matchedIdentifier: string | null;
    isAuthoritativeEvidence: boolean;
    assessment: string;
  }>;
  relationshipVerification: {
    verified: boolean;
    evidence: 'customParm1' | 'linkCode' | 'parm1' | 'bookingReference' | 'code' | 'gatewayLinkCode' | 'none';
    provingField?: string;
    details: string;
  };
  message: string;
  timestamp: string;
}

export interface AdminSandboxTestResponse {
  success: boolean;
  environment: 'sandbox';
  testReference: string;
  checkoutUrl?: string;
  linkCode?: string;
  amount: number;
  currency: 'USD';
  expiresAt?: string;
  gatewayStatus?: number;
  message?: string;
  error?: string;
  diagnostic?: {
    cclwConfigured: boolean;
    cclwMasked: string;
    tokenConfigured: boolean;
    gatewayEndpoint: string;
    requestedAmount: number;
    requestTimestamp: string;
  };
  existingTransactionDiagnostic?: ExistingTransactionDiagnosticResult;
}


