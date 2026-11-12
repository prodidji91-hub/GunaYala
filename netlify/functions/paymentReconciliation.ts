import { SupabaseClient } from '@supabase/supabase-js';
import { validatePagueloFacilCheckoutUrl, maskCredential } from './paymentGateway.js';

export interface MerchantIdentityDiagnostic {
  operationFound: boolean;
  operationCode: string;
  idMerchantExists: boolean;
  idMerchantDataType?: string;
  maskedIdMerchant?: string;
  rawIdMerchantValue?: string;
  gatewayTransactionId?: string;
  cclwExistsInRecord: boolean;
  paguelofacilMerchantIdConfigured: boolean;
  maskedConfiguredMerchantId?: string;
  paguelofacilCclwConfigured: boolean;
  merchantVerified: boolean;
  failingValidationRule: string;
  verificationDetails: string;
  actionableGuidance: string;
}

export interface ReconciliationParams {
  bookingReference?: string;
  operationCode?: string;
  linkCode?: string;
  idempotencyKey?: string;
  environment?: 'sandbox' | 'production';
  supabaseClient: SupabaseClient;
  env?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
}

export interface ReconciliationResult {
  success: boolean;
  duplicate?: boolean;
  category: 'approved' | 'declined' | 'absent_records' | 'ambiguous_records' | 'authentication_failure' | 'mismatched_identifiers' | 'validation_rejection' | 'parsing_problem' | 'needs_manual_review' | 'partial_synchronization_failure';
  bookingReference?: string;
  operationCode?: string;
  amountPaid?: number;
  message: string;
  databaseUpdated?: boolean;
  error?: string;
  audit?: any;
  merchantIdentityDiagnostic?: MerchantIdentityDiagnostic;
}

export interface RelationshipValidationResult {
  verified: boolean;
  evidence: 'customParm1' | 'parm1' | 'PARM_1' | 'bookingReference' | 'linkCode' | 'code' | 'gatewayLinkCode' | 'urlString_parameter' | 'none';
  provingField?: string;
  details: string;
  diagnosticDetails?: {
    urlFormatValid: boolean;
    recognizedQueryParameters: string[];
    matchingParameterNames: string[];
    hasConflicts: boolean;
    rejectionReason: string;
  };
}

/**
 * Validates merchant return URLs (e.g. gunayalapanama.com/checkout/complete) found in MerchantTransactions.urlString.
 * Enforces HTTPS, trusted merchant origin, expected path, and validates query parameters & idempotency.
 */
export function validateMerchantReturnUrl(
  rawUrl: string,
  storedRef: string,
  storedIdem?: string,
  configuredReturnUrl?: string,
  environment: 'sandbox' | 'production' = 'sandbox'
): { valid: boolean; recognizedParams: string[]; matchingParams: string[]; hasConflicts: boolean; rejectionReason?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      const isSandboxLocal = environment === 'sandbox' && parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if (!isSandboxLocal) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'insecure_protocol' };
      }
    }
    if (parsed.port && parsed.port !== '443' && parsed.port !== '80') {
      const isSandboxPort = environment === 'sandbox' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if (!isSandboxPort) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'custom_port' };
      }
    }
    if (parsed.username || parsed.password) {
      return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'embedded_credentials' };
    }

    const expectedUrlBase = configuredReturnUrl || process.env.PAGUELOFACIL_RETURN_URL || 'https://gunayalapanama.com/checkout/complete';
    let expectedOrigin = 'https://gunayalapanama.com';
    let expectedPath = '/checkout/complete';
    try {
      const parsedExpected = new URL(expectedUrlBase);
      expectedOrigin = parsedExpected.origin.toLowerCase();
      expectedPath = parsedExpected.pathname.toLowerCase();
    } catch {
      // Keep defaults
    }

    const currentOrigin = parsed.origin.toLowerCase();
    const currentPath = parsed.pathname.toLowerCase();

    if (environment === 'production') {
      // STRICT PRODUCTION RULES:
      // Exact HTTPS origin matching expected return URL (e.g. https://gunayalapanama.com).
      // Reject localhost, 127.0.0.1, http, and subdomains (e.g. sub.gunayalapanama.com)
      if (currentOrigin !== expectedOrigin) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'untrusted_origin' };
      }

      // Exact pathname matching expected return URL (e.g. /checkout/complete).
      // Reject extended paths (/checkout/complete/extra, /checkout/other)
      if (currentPath !== expectedPath) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'untrusted_path' };
      }
    } else {
      // SANDBOX / DEV ALLOWANCES:
      const allowedOrigins = [
        expectedOrigin,
        'https://gunayalapanama.com',
        'http://localhost:3000',
        'https://localhost:3000',
        'http://localhost',
        'http://127.0.0.1',
      ];
      const isAllowedHost = allowedOrigins.includes(currentOrigin) || currentOrigin.endsWith('.gunayalapanama.com');
      if (!isAllowedHost) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'untrusted_origin' };
      }

      const isAllowedPath = currentPath === expectedPath || currentPath === '/checkout/complete' || currentPath.startsWith('/checkout/');
      if (!isAllowedPath) {
        return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'untrusted_path' };
      }
    }

    const searchParams = parsed.searchParams;
    const trustedParams = ['bookingReference', 'PARM_1', 'parm1', 'customParm1', 'ref', 'booking_reference'];
    const recognizedParams: string[] = [];
    const matchingParams: string[] = [];
    let hasConflicts = false;

    const idemParam = searchParams.get('idem') || searchParams.get('idempotencyKey') || searchParams.get('PARM_2');
    if (idemParam && storedIdem && idemParam.trim() !== storedIdem.trim()) {
      return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: true, rejectionReason: 'idem_mismatch' };
    }

    for (const param of trustedParams) {
      if (searchParams.has(param)) {
        recognizedParams.push(param);
        const val = searchParams.get(param);
        if (val !== null && val !== undefined) {
          const trimmed = val.trim();
          if (storedRef && trimmed === storedRef) {
            matchingParams.push(param);
          } else if (storedRef && trimmed !== '' && trimmed !== storedRef) {
            hasConflicts = true;
          }
        }
      }
    }

    for (const key of trustedParams) {
      const allVals = searchParams.getAll(key);
      if (allVals.some(v => v.trim() !== storedRef)) {
        hasConflicts = true;
      }
    }

    if (hasConflicts) {
      return { valid: false, recognizedParams, matchingParams, hasConflicts: true, rejectionReason: 'parameter_conflict' };
    }

    if (matchingParams.length === 0) {
      return { valid: false, recognizedParams, matchingParams: [], hasConflicts: false, rejectionReason: 'no_matching_trusted_parameters' };
    }

    return { valid: true, recognizedParams, matchingParams, hasConflicts: false };
  } catch {
    return { valid: false, recognizedParams: [], matchingParams: [], hasConflicts: false, rejectionReason: 'malformed_url' };
  }
}

/**
 * Strict Authoritative Relationship Validation Helper
 * Validates trusted gateway parameters, link codes, and safely parsed urlString query parameters.
 * Rejects substring matches, malformed URLs, untrusted origins, and conflicting identifiers.
 * Privacy-safe: never returns raw URLs, query values, tokens, or customer data.
 */
export function validatePaymentRelationship(matched: any, existingTx: any): RelationshipValidationResult {
  if (!matched || !existingTx) {
    return {
      verified: false,
      evidence: 'none',
      details: 'Missing gateway record or existing transaction for relationship validation.',
      diagnosticDetails: {
        urlFormatValid: false,
        recognizedQueryParameters: [],
        matchingParameterNames: [],
        hasConflicts: false,
        rejectionReason: 'missing_records',
      },
    };
  }

  const storedRef = String(existingTx.booking_reference || '').trim();
  const storedLinkCode = String(existingTx.gateway_link_code || '').trim();
  const env = existingTx.environment === 'production' ? 'production' : 'sandbox';

  if (!storedRef && !storedLinkCode) {
    return {
      verified: false,
      evidence: 'none',
      details: 'Missing stored booking reference and link code for relationship validation.',
      diagnosticDetails: {
        urlFormatValid: false,
        recognizedQueryParameters: [],
        matchingParameterNames: [],
        hasConflicts: false,
        rejectionReason: 'missing_stored_identifiers',
      },
    };
  }

  let hasConflict = false;
  let conflictDetails = '';
  let conflictField = '';

  const matchedDirectValues: Record<string, { value: string; matches: boolean }> = {};
  const matchedLinkValues: Record<string, { value: string; matches: boolean }> = {};

  // 1. Inspect ALL direct structured gateway parameters (customParm1, parm1, PARM_1, bookingReference)
  const directFields = ['customParm1', 'parm1', 'PARM_1', 'bookingReference'];
  for (const field of directFields) {
    const actualKey = field in matched ? field : Object.keys(matched).find(k => k.toLowerCase() === field.toLowerCase());
    if (actualKey && matched[actualKey] !== undefined && matched[actualKey] !== null) {
      const val = String(matched[actualKey]).trim();
      if (val !== '') {
        const isMatch = Boolean(storedRef && val === storedRef);
        matchedDirectValues[actualKey] = { value: val, matches: isMatch };
        if (storedRef && val !== storedRef) {
          hasConflict = true;
          conflictField = actualKey;
          conflictDetails = `Direct parameter conflict: field "${actualKey}" contains mismatching booking reference.`;
        }
      }
    }
  }

  // 2. Inspect ALL gateway link code fields (linkCode, code, gatewayLinkCode)
  const linkFields = ['linkCode', 'code', 'gatewayLinkCode'];
  for (const field of linkFields) {
    const actualKey = field in matched ? field : Object.keys(matched).find(k => k.toLowerCase() === field.toLowerCase());
    if (actualKey && matched[actualKey] !== undefined && matched[actualKey] !== null) {
      const val = String(matched[actualKey]).trim();
      if (val !== '') {
        const isMatch = Boolean(storedLinkCode && val === storedLinkCode);
        matchedLinkValues[actualKey] = { value: val, matches: isMatch };
        if (storedLinkCode && val !== storedLinkCode) {
          hasConflict = true;
          if (!conflictField) conflictField = actualKey;
          if (!conflictDetails) conflictDetails = `Link code conflict: field "${actualKey}" contains mismatching link code.`;
        }
      }
    }
  }

  // 3. Inspect urlString trusted URL parameters safely
  let urlMatchFound = false;
  let urlProvingParam = '';
  let urlFormatValid = false;
  let urlRecognizedParams: string[] = [];
  let urlMatchingParams: string[] = [];
  let urlRejectionReason: string | undefined;

  const urlStringVal = matched.urlString || matched.url || matched.returnUrl || matched.callbackUrl;
  if (urlStringVal && typeof urlStringVal === 'string' && urlStringVal.trim() !== '') {
    const isPagueloFacilHost = urlStringVal.includes('paguelofacil.com');
    if (isPagueloFacilHost) {
      const urlCheck = validatePagueloFacilCheckoutUrl(urlStringVal, env);
      if (!urlCheck.valid) {
        hasConflict = true;
        if (!conflictField) conflictField = 'urlString';
        if (!conflictDetails) conflictDetails = `URL format/origin validation failed for gateway checkout URL: ${urlCheck.error}`;
        if (!urlRejectionReason) urlRejectionReason = 'untrusted_origin_or_malformed_url';
      } else {
        urlFormatValid = true;
        try {
          const parsedUrl = new URL(urlStringVal);
          const searchParams = parsedUrl.searchParams;
          const trustedParams = ['bookingReference', 'PARM_1', 'parm1', 'customParm1', 'ref', 'booking_reference', 'linkCode', 'code'];

          for (const param of trustedParams) {
            if (searchParams.has(param)) {
              urlRecognizedParams.push(param);
              const paramVal = searchParams.get(param);
              if (paramVal !== null && paramVal !== undefined) {
                const trimmedVal = paramVal.trim();
                const isBookingRefParam = ['bookingReference', 'PARM_1', 'parm1', 'customParm1', 'ref', 'booking_reference'].includes(param);
                const isLinkCodeParam = ['linkCode', 'code'].includes(param);

                if (isBookingRefParam) {
                  if (storedRef && trimmedVal === storedRef) {
                    urlMatchingParams.push(param);
                    urlMatchFound = true;
                    if (!urlProvingParam) urlProvingParam = param;
                  } else if (storedRef && trimmedVal !== '' && trimmedVal !== storedRef) {
                    hasConflict = true;
                    if (!conflictField) conflictField = `urlString?${param}`;
                    if (!conflictDetails) conflictDetails = `URL query parameter conflict: "${param}" in urlString does not match stored booking reference.`;
                    if (!urlRejectionReason) urlRejectionReason = 'parameter_conflict';
                  }
                } else if (isLinkCodeParam) {
                  if (storedLinkCode && trimmedVal === storedLinkCode) {
                    urlMatchingParams.push(param);
                    urlMatchFound = true;
                    if (!urlProvingParam) urlProvingParam = param;
                  } else if (storedLinkCode && trimmedVal !== '' && trimmedVal !== storedLinkCode) {
                    hasConflict = true;
                    if (!conflictField) conflictField = `urlString?${param}`;
                    if (!conflictDetails) conflictDetails = `URL query parameter conflict: "${param}" in urlString does not match stored link code.`;
                    if (!urlRejectionReason) urlRejectionReason = 'parameter_conflict';
                  }
                }
              }
            }
          }
        } catch {
          hasConflict = true;
          if (!conflictField) conflictField = 'urlString';
          if (!conflictDetails) conflictDetails = 'Malformed urlString in gateway record.';
          if (!urlRejectionReason) urlRejectionReason = 'malformed_url';
        }
      }
    } else {
      const storedIdem = existingTx.idempotency_key || existingTx.idempotencyKey;
      const configuredReturnUrl = process.env.PAGUELOFACIL_RETURN_URL;
      const returnUrlVal = validateMerchantReturnUrl(urlStringVal, storedRef, storedIdem, configuredReturnUrl, env);

      urlFormatValid = returnUrlVal.valid;
      urlRecognizedParams = returnUrlVal.recognizedParams;
      urlMatchingParams = returnUrlVal.matchingParams;

      if (!returnUrlVal.valid) {
        hasConflict = true;
        if (!conflictField) conflictField = 'urlString';
        if (!conflictDetails) conflictDetails = `Merchant return URL validation failed: reason=${returnUrlVal.rejectionReason}`;
        if (!urlRejectionReason) urlRejectionReason = returnUrlVal.rejectionReason;
      } else if (returnUrlVal.hasConflicts) {
        hasConflict = true;
        if (!conflictField) conflictField = 'urlString';
        if (!conflictDetails) conflictDetails = 'Merchant return URL query parameter conflict detected.';
        if (!urlRejectionReason) urlRejectionReason = returnUrlVal.rejectionReason || 'parameter_conflict';
      } else if (returnUrlVal.matchingParams.length > 0) {
        urlMatchFound = true;
        urlProvingParam = returnUrlVal.matchingParams[0];
      }
    }
  }

  // REJECT IMMEDIATELY IF ANY CONFLICT WAS DETECTED ANYWHERE
  if (hasConflict) {
    return {
      verified: false,
      evidence: conflictField as any,
      provingField: conflictField,
      details: conflictDetails || 'Relationship validation rejected: conflicting evidence detected in gateway record.',
      diagnosticDetails: {
        urlFormatValid,
        recognizedQueryParameters: urlRecognizedParams,
        matchingParameterNames: urlMatchingParams,
        hasConflicts: true,
        rejectionReason: urlRejectionReason || 'parameter_conflict',
      },
    };
  }

  // IF NO CONFLICTS EXIST, CHECK FOR AT LEAST ONE MATCHING FIELD
  const matchingDirectKey = Object.keys(matchedDirectValues).find(k => matchedDirectValues[k].matches);
  if (matchingDirectKey) {
    return {
      verified: true,
      evidence: matchingDirectKey as any,
      provingField: matchingDirectKey,
      details: `Verified via trusted gateway parameter "${matchingDirectKey}" matching stored booking reference.`,
      diagnosticDetails: {
        urlFormatValid,
        recognizedQueryParameters: urlRecognizedParams,
        matchingParameterNames: [matchingDirectKey],
        hasConflicts: false,
        rejectionReason: 'none',
      },
    };
  }

  const matchingLinkKey = Object.keys(matchedLinkValues).find(k => matchedLinkValues[k].matches);
  if (matchingLinkKey) {
    return {
      verified: true,
      evidence: matchingLinkKey as any,
      provingField: matchingLinkKey,
      details: `Verified via trusted gateway link code field "${matchingLinkKey}".`,
      diagnosticDetails: {
        urlFormatValid,
        recognizedQueryParameters: urlRecognizedParams,
        matchingParameterNames: [matchingLinkKey],
        hasConflicts: false,
        rejectionReason: 'none',
      },
    };
  }

  if (urlMatchFound && urlProvingParam) {
    return {
      verified: true,
      evidence: 'urlString_parameter',
      provingField: `urlString?${urlProvingParam}`,
      details: `Verified via trusted URL parameter "${urlProvingParam}" in gateway urlString matching stored booking reference.`,
      diagnosticDetails: {
        urlFormatValid,
        recognizedQueryParameters: urlRecognizedParams,
        matchingParameterNames: urlMatchingParams,
        hasConflicts: false,
        rejectionReason: 'none',
      },
    };
  }

  return {
    verified: false,
    evidence: 'none',
    details: 'Relationship evidence unavailable: gateway record contains no parameter matching stored booking reference or link code.',
    diagnosticDetails: {
      urlFormatValid,
      recognizedQueryParameters: urlRecognizedParams,
      matchingParameterNames: [],
      hasConflicts: false,
      rejectionReason: 'relationship_evidence_unavailable',
    },
  };
}

/**
 * Protected Read-Only Merchant Identity Diagnostic
 * Queries authenticated PagueloFacil MerchantTransactions endpoint by exact codOper and evaluates
 * merchant identity verification rules without updating transaction status or approving payments.
 * Sanitizes all output to ensure zero raw credential / token exposure.
 */
export async function diagnoseMerchantIdentity(
  operationCode: string,
  environment: 'sandbox' | 'production' = 'production',
  env: Record<string, string | undefined> = process.env,
  fetchFn: typeof fetch = global.fetch
): Promise<MerchantIdentityDiagnostic> {
  const isSandbox = environment === 'sandbox';
  const activeToken = isSandbox
    ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
    : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

  const expectedCclw = isSandbox
    ? (env.PAGUELOFACIL_SANDBOX_CCLW || env.PAGUELOFACIL_DEMO_CCLW || '').trim()
    : (env.PAGUELOFACIL_CCLW || '').trim();

  const configuredMerchantId = (
    isSandbox
      ? (env.PAGUELOFACIL_SANDBOX_MERCHANT_ID || env.PAGUELOFACIL_MERCHANT_ID)
      : env.PAGUELOFACIL_MERCHANT_ID
  ) || '';

  const paguelofacilMerchantIdConfigured = Boolean(configuredMerchantId.trim());
  const paguelofacilCclwConfigured = Boolean(expectedCclw.trim());

  if (!activeToken) {
    return {
      operationFound: false,
      operationCode,
      idMerchantExists: false,
      cclwExistsInRecord: false,
      paguelofacilMerchantIdConfigured,
      maskedConfiguredMerchantId: paguelofacilMerchantIdConfigured ? maskCredential(configuredMerchantId) : '[UNCONFIGURED]',
      paguelofacilCclwConfigured,
      merchantVerified: false,
      failingValidationRule: 'missing_access_token',
      verificationDetails: 'Server environment variable for PagueloFacil access token is not configured.',
      actionableGuidance: 'Configure PAGUELOFACIL_ACCESS_TOKEN in server environment variables.',
    };
  }

  const verifyUrl = isSandbox
    ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
    : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';

  try {
    const filterParam = `codOper::${operationCode.trim()}`;
    const response = await fetchFn(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
      method: 'GET',
      headers: {
        Authorization: activeToken,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        operationFound: false,
        operationCode,
        idMerchantExists: false,
        cclwExistsInRecord: false,
        paguelofacilMerchantIdConfigured,
        maskedConfiguredMerchantId: paguelofacilMerchantIdConfigured ? maskCredential(configuredMerchantId) : '[UNCONFIGURED]',
        paguelofacilCclwConfigured,
        merchantVerified: false,
        failingValidationRule: 'http_gateway_error',
        verificationDetails: `MerchantTransactions API returned HTTP ${response.status}.`,
        actionableGuidance: 'Verify production access token and gateway API availability.',
      };
    }

    const data = await response.json();
    const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));
    const matchingRecords = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(operationCode).trim());

    if (matchingRecords.length !== 1) {
      return {
        operationFound: false,
        operationCode,
        idMerchantExists: false,
        cclwExistsInRecord: false,
        paguelofacilMerchantIdConfigured,
        maskedConfiguredMerchantId: paguelofacilMerchantIdConfigured ? maskCredential(configuredMerchantId) : '[UNCONFIGURED]',
        paguelofacilCclwConfigured,
        merchantVerified: false,
        failingValidationRule: matchingRecords.length === 0 ? 'record_not_found' : 'ambiguous_records_found',
        verificationDetails: `Expected exactly 1 record for operation ${operationCode}, found ${matchingRecords.length}.`,
        actionableGuidance: 'Verify operation code exists in PagueloFacil production portal.',
      };
    }

    const matched = matchingRecords[0];
    const gwCclw = String(matched.cclw || matched.CCLW || '').trim();
    const rawIdMerchant = matched.idMerchant ?? matched.id_merchant ?? matched.merchant;
    const gwMerchantId = String(rawIdMerchant ?? '').trim();
    const gwTxId = matched.id !== undefined && matched.id !== null ? String(matched.id).trim() : undefined;

    const idMerchantExists = Boolean(gwMerchantId);
    const idMerchantDataType = rawIdMerchant !== undefined && rawIdMerchant !== null ? typeof rawIdMerchant : undefined;
    const maskedIdMerchant = idMerchantExists ? maskCredential(gwMerchantId) : '[ABSENT]';
    const rawIdMerchantValue = idMerchantExists ? gwMerchantId : '[ABSENT]';

    const cclwExistsInRecord = Boolean(gwCclw);

    let merchantVerified = false;
    let failingRule = '';
    let details = '';
    let guidance = '';

    // Rule 1: Record CCLW matches configured CCLW
    if (cclwExistsInRecord && paguelofacilCclwConfigured) {
      if (gwCclw === expectedCclw.trim()) {
        merchantVerified = true;
        details = 'Merchant identity verified via exact CCLW key match in gateway record.';
      } else {
        failingRule = 'cclw_mismatch';
        details = 'Gateway record CCLW key does not match configured server CCLW.';
        guidance = 'Verify configured PAGUELOFACIL_CCLW in server environment variables.';
      }
    }

    // Rule 2: Record idMerchant matches configured PAGUELOFACIL_MERCHANT_ID
    if (!merchantVerified && idMerchantExists && paguelofacilMerchantIdConfigured) {
      if (gwMerchantId === configuredMerchantId.trim()) {
        merchantVerified = true;
        details = `Merchant identity verified via exact merchant ID match (${maskedIdMerchant}).`;
      } else {
        failingRule = 'merchant_id_mismatch';
        details = `Gateway record idMerchant (${maskedIdMerchant}) does not match configured server PAGUELOFACIL_MERCHANT_ID (${maskCredential(configuredMerchantId)}).`;
        guidance = 'Update PAGUELOFACIL_MERCHANT_ID in server environment variables to match production merchant ID.';
      }
    }

    // Rule 3: Cross-field match fallback
    if (!merchantVerified && idMerchantExists && paguelofacilCclwConfigured) {
      if (gwMerchantId === expectedCclw.trim()) {
        merchantVerified = true;
        details = 'Merchant identity verified via cross-field ID match.';
      }
    }

    if (!merchantVerified && !failingRule) {
      if (!paguelofacilMerchantIdConfigured && !cclwExistsInRecord) {
        failingRule = 'missing_configured_merchant_id_and_record_lacks_cclw';
        details = `Gateway record provides idMerchant (${maskedIdMerchant}, data type: ${idMerchantDataType}), but PAGUELOFACIL_MERCHANT_ID is not configured in server environment variables, and gateway REST API response omits CCLW key.`;
        guidance = `Configure PAGUELOFACIL_MERCHANT_ID in server environment variables with the production merchant account ID matching ${rawIdMerchantValue} after independent portal confirmation.`;
      } else if (!paguelofacilCclwConfigured && !paguelofacilMerchantIdConfigured) {
        failingRule = 'no_server_merchant_credentials_configured';
        details = 'Neither PAGUELOFACIL_CCLW nor PAGUELOFACIL_MERCHANT_ID is configured in server environment variables.';
        guidance = 'Configure PAGUELOFACIL_CCLW or PAGUELOFACIL_MERCHANT_ID in server environment variables.';
      } else {
        failingRule = 'unverified_merchant_identity';
        details = 'Gateway record does not contain trustworthy evidence matching configured server merchant credentials.';
        guidance = 'Verify merchant portal credentials and configure PAGUELOFACIL_MERCHANT_ID.';
      }
    }

    return {
      operationFound: true,
      operationCode,
      idMerchantExists,
      idMerchantDataType,
      maskedIdMerchant,
      rawIdMerchantValue,
      gatewayTransactionId: gwTxId,
      cclwExistsInRecord,
      paguelofacilMerchantIdConfigured,
      maskedConfiguredMerchantId: paguelofacilMerchantIdConfigured ? maskCredential(configuredMerchantId) : '[UNCONFIGURED]',
      paguelofacilCclwConfigured,
      merchantVerified,
      failingValidationRule: failingRule || 'none',
      verificationDetails: details,
      actionableGuidance: guidance,
    };
  } catch (err: any) {
    return {
      operationFound: false,
      operationCode,
      idMerchantExists: false,
      cclwExistsInRecord: false,
      paguelofacilMerchantIdConfigured,
      maskedConfiguredMerchantId: paguelofacilMerchantIdConfigured ? maskCredential(configuredMerchantId) : '[UNCONFIGURED]',
      paguelofacilCclwConfigured,
      merchantVerified: false,
      failingValidationRule: 'network_or_parsing_exception',
      verificationDetails: `Network or parsing exception querying MerchantTransactions API: ${err.message}`,
      actionableGuidance: 'Check server connectivity to PagueloFacil REST services.',
    };
  }
}

/**
 * Shared Authoritative Payment Reconciliation Helper
 * Used by both normal payment-webhook.ts and admin-payment-sandbox-test.ts (reconcile_existing_transaction action).
 */
export async function reconcilePaymentTransaction(params: ReconciliationParams): Promise<ReconciliationResult> {
  const {
    bookingReference,
    operationCode,
    linkCode,
    idempotencyKey,
    environment = 'sandbox',
    supabaseClient,
    env = process.env,
    fetchFn = params.fetchFn || global.fetch,
  } = params;

  if (!bookingReference && !operationCode && !linkCode) {
    return {
      success: false,
      category: 'mismatched_identifiers',
      message: 'Reconciliation failed: Missing required transaction identifier (bookingReference, operationCode, or linkCode).',
      error: 'Missing identifiers.',
    };
  }

  // 1. Always load existing payment transaction from Supabase by trustworthy unique keys / fallback
  let existingTx: any = null;

  try {
    // 1. Try by bookingReference (PARM_1) with strict single-row check first
    if (!existingTx && bookingReference) {
      const { data: attempts, error: selectErr } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('booking_reference', bookingReference);

      if (selectErr) {
        console.error('[PaymentReconciliation] Supabase select error:', selectErr.code, selectErr.message);
        return {
          success: false,
          category: 'parsing_problem',
          message: `Database select error: ${selectErr.message}`,
          error: selectErr.code,
        };
      }

      if (attempts && attempts.length === 1) {
        existingTx = attempts[0];
      } else if (attempts && attempts.length > 1) {
        return {
          success: false,
          category: 'ambiguous_records',
          bookingReference,
          message: `Ambiguous payment records: Booking "${bookingReference}" has ${attempts.length} transaction attempts. Cannot uniquely reconcile without operation code or attempt key.`,
          error: 'Multiple records found for booking reference.',
        };
      }
    }

    // 2. Try by operationCode (gateway_operation_id)
    if (!existingTx && operationCode) {
      const opQuery: any = supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('gateway_operation_id', operationCode);
      const res = typeof opQuery?.maybeSingle === 'function' ? await opQuery.maybeSingle() : await opQuery;
      const data = Array.isArray(res?.data) ? (res.data.length === 1 ? res.data[0] : null) : res?.data;
      if (data) {
        existingTx = data;
      }
    }

    // 3. Try by linkCode (gateway_link_code)
    if (!existingTx && linkCode) {
      const linkQuery: any = supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('gateway_link_code', linkCode);
      const res = typeof linkQuery?.maybeSingle === 'function' ? await linkQuery.maybeSingle() : await linkQuery;
      const data = Array.isArray(res?.data) ? (res.data.length === 1 ? res.data[0] : null) : res?.data;
      if (data) {
        existingTx = data;
      }
    }

    // 4. Try by idempotencyKey
    if (!existingTx && idempotencyKey) {
      const idemQuery: any = supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey);
      const res = typeof idemQuery?.maybeSingle === 'function' ? await idemQuery.maybeSingle() : await idemQuery;
      const data = Array.isArray(res?.data) ? (res.data.length === 1 ? res.data[0] : null) : res?.data;
      if (data) {
        existingTx = data;
      }
    }

    // 5. Webhook Automatic Correlation Recovery Path:
    // If transaction not found by local keys, but operationCode is provided by webhook,
    // query MerchantTransactions API authoritatively using operationCode, parse urlString as merchant return URL,
    // extract verified bookingReference, and query Supabase by that verified booking reference.
    if (!existingTx && operationCode) {
      const isSandboxEnv = environment === 'sandbox';
      const activeToken = isSandboxEnv
        ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
        : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

      if (activeToken) {
        const verifyUrl = isSandboxEnv
          ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
          : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';
        const filterParam = `codOper::${operationCode}`;

        try {
          const gwRes = await fetchFn(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
            method: 'GET',
            headers: {
              Authorization: activeToken,
              Accept: 'application/json',
            },
          });

          if (gwRes.ok) {
            const gwJson = await gwRes.json();
            const records = Array.isArray(gwJson?.data) ? gwJson.data : (gwJson?.data ? [gwJson.data] : (Array.isArray(gwJson) ? gwJson : []));
            const matching = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(operationCode).trim());

            if (matching.length === 1) {
              const matchedGw = matching[0];
              const urlStr = matchedGw.urlString || matchedGw.url || matchedGw.returnUrl || matchedGw.callbackUrl;
              if (urlStr && typeof urlStr === 'string') {
                try {
                  const parsedUrl = new URL(urlStr);
                  const verifiedRef = parsedUrl.searchParams.get('bookingReference') || parsedUrl.searchParams.get('PARM_1') || parsedUrl.searchParams.get('booking_reference');
                  if (verifiedRef && verifiedRef.trim() !== '') {
                    const trimmedRef = verifiedRef.trim();
                    const { data: foundByUrlRef, error: urlRefErr } = await supabaseClient
                      .from('payment_transactions')
                      .select('*')
                      .eq('booking_reference', trimmedRef);

                    if (!urlRefErr && foundByUrlRef && foundByUrlRef.length === 1) {
                      existingTx = foundByUrlRef[0];
                    }
                  }
                } catch {
                  // Ignore URL parsing error
                }
              }
            }
          }
        } catch (gwErr) {
          console.error('[PaymentReconciliation] Webhook gateway recovery lookup exception:', gwErr);
        }
      }
    }

    // 5. Try by idempotencyKey
    if (!existingTx && idempotencyKey) {
      const { data } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (data) {
        existingTx = data;
      }
    }
  } catch (err: any) {
    return {
      success: false,
      category: 'parsing_problem',
      message: `Database query exception: ${err.message}`,
      error: err.message,
    };
  }

  if (!existingTx) {
    return {
      success: false,
      category: 'absent_records',
      bookingReference,
      message: 'Transaction record could not be located in database.',
      error: 'Transaction not found.',
    };
  }

  // Enforce server-configured environment security and reject cross-environment mismatches
  const txEnvironment = existingTx.environment || 'sandbox';
  if (environment && txEnvironment !== environment) {
    return {
      success: false,
      category: 'validation_rejection',
      bookingReference: existingTx.booking_reference,
      operationCode: existingTx.gateway_operation_id,
      message: `Cross-environment mismatch: Transaction environment is "${txEnvironment}" but request environment is "${environment}".`,
      error: 'Environment mismatch.',
    };
  }

  const isSandbox = txEnvironment === 'sandbox';
  if (isSandbox && bookingReference) {
    const parm1EqualsStored = existingTx.booking_reference === bookingReference;
    const incomingLength = (bookingReference || '').length;
    const storedLength = (existingTx.booking_reference || '').length;
    console.log(`[PaymentReconciliation] [Sandbox PARM_1 Check] equal=${parm1EqualsStored}, incomingLength=${incomingLength}, storedLength=${storedLength}`);
  }

  // Helper to sync/repair booking_requests record atomically/safely with TEST flag
  async function syncBookingRequest(bookingRef: string): Promise<{ success: boolean; error?: any }> {
    if (!bookingRef) return { success: true };

    const { data: currentBooking } = await supabaseClient
      .from('booking_requests')
      .select('special_notes')
      .eq('booking_reference', bookingRef)
      .maybeSingle();

    const existingNotes = currentBooking?.special_notes || '';
    const wasCancelled = ['cancelled', 'expired', 'cancelled_pending_expiry', 'needs_manual_review'].includes(existingTx?.status);
    let updatedNotes = existingNotes;
    if (isSandbox) {
      updatedNotes = existingNotes.includes('[TEST') ? existingNotes : `[TEST / RECONCILED] ${existingNotes}`.trim();
    } else {
      if (wasCancelled) {
        updatedNotes = existingNotes.includes('[PROD LIVE TEST / LATE PAYMENT RECONCILED]')
          ? existingNotes
          : `[PROD LIVE TEST / LATE PAYMENT RECONCILED] ${existingNotes.replace('[PROD LIVE TEST]', '').trim()}`.trim();
      } else {
        updatedNotes = (existingNotes.includes('[PROD LIVE TEST') || existingNotes.includes('[LIVE'))
          ? existingNotes
          : `[PROD LIVE TEST / RECONCILED] ${existingNotes}`.trim();
      }
    }

    const { data: bookingUpdatedRows, error: bookingUpdateErr } = await supabaseClient
      .from('booking_requests')
      .update({
        status: 'fully_confirmed',
        special_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_reference', bookingRef)
      .select('booking_reference');

    if (bookingUpdateErr) {
      console.error(`[Reconciliation] Failed to update booking_requests for ${bookingRef}:`, bookingUpdateErr);
      return { success: false, error: bookingUpdateErr };
    }
    if (!bookingUpdatedRows || bookingUpdatedRows.length === 0) {
      console.warn(`[Reconciliation] No booking_requests record found with booking_reference ${bookingRef} to update.`);
      return { success: false, error: 'Booking record not found.' };
    }
    return { success: true };
  }

  // 2. Idempotency Check & Approved Payment Repair
  if (existingTx.status === 'approved') {
    let bookingNeedsRepair = false;
    if (existingTx.booking_reference) {
      const { data: bookingRec } = await supabaseClient
        .from('booking_requests')
        .select('status')
        .eq('booking_reference', existingTx.booking_reference)
        .maybeSingle();
      if (bookingRec && bookingRec.status !== 'fully_confirmed') {
        bookingNeedsRepair = true;
      }
    }

    if (!bookingNeedsRepair) {
      return {
        success: true,
        duplicate: true,
        category: 'approved',
        bookingReference: existingTx.booking_reference,
        operationCode: existingTx.gateway_operation_id || operationCode,
        amountPaid: existingTx.amount_paid || existingTx.expected_amount,
        message: 'Transaction is already recorded and approved. Idempotent check passed.',
        databaseUpdated: false,
      };
    }

    // Approved payment but booking is pending. Revalidate against gateway and check strict relationship validation.
    const opToQuery = existingTx.gateway_operation_id;
    if (!opToQuery) {
      return {
        success: false,
        category: 'needs_manual_review',
        bookingReference: existingTx.booking_reference,
        message: 'Approved payment lacks gateway operation ID to revalidate before repairing booking.',
        error: 'Missing operation code for revalidation.',
      };
    }

    const activeToken = isSandbox
      ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
      : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

    if (!activeToken) {
      return {
        success: false,
        category: 'authentication_failure',
        bookingReference: existingTx.booking_reference,
        message: 'Authoritative transaction revalidation requires PagueloFacil access token.',
        error: 'Missing access token.',
      };
    }

    const verifyUrl = isSandbox
      ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
      : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';

    const filterParam = `codOper::${opToQuery}`;

    try {
      const response = await fetchFn(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
        method: 'GET',
        headers: {
          Authorization: activeToken,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          category: 'parsing_problem',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation API returned HTTP ${response.status}.`,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));
      const matchingRecords = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(opToQuery).trim());

      if (matchingRecords.length !== 1) {
        return {
          success: false,
          category: matchingRecords.length === 0 ? 'absent_records' : 'ambiguous_records',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation failed: Expected exactly 1 gateway record for ${opToQuery}, found ${matchingRecords.length}.`,
          error: 'Gateway record count mismatch.',
        };
      }

      const matched = matchingRecords[0];
      const rawStatus = matched.status !== undefined ? Number(matched.status) : String(matched.estado || '').trim().toLowerCase();
      const isStatusApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
      const txType = String(matched.txType || matched.type || matched.operationType || matched.tipo || '').trim().toUpperCase();
      const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';

      if (!isStatusApproved || !isAuthCapture) {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation failed: Gateway status/type not approved (status=${rawStatus}, txType=${txType}).`,
          error: 'Invalid status or transaction type.',
        };
      }

      const relCheck = validatePaymentRelationship(matched, existingTx);
      if (!relCheck.verified) {
        return {
          success: false,
          category: relCheck.details.includes('conflict') ? 'mismatched_identifiers' : 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Approved payment revalidation relationship check failed: ${relCheck.details}`,
          error: 'Missing or conflicting relationship evidence.',
        };
      }

      // Revalidate amount and currency in approved-payment recovery path (Requirement 4)
      const rawAmount = matched.authAmount ?? matched.totalPagado ?? matched.amount ?? matched.total;
      if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: 'Gateway record missing amount field during revalidation.',
          error: 'Missing amount.',
        };
      }

      const amountPaid = Number(rawAmount);
      if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Invalid amount paid value: ${rawAmount}.`,
          error: 'Invalid amount.',
        };
      }

      const amountCents = Math.round(amountPaid * 100);
      const expectedCents = existingTx.amount_in_cents || Math.round((existingTx.expected_amount || 0) * 100);

      if (amountCents !== expectedCents) {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Exact amount mismatch: Paid ${amountCents} cents does not match expected ${expectedCents} cents.`,
          error: 'Amount mismatch.',
        };
      }

      const rawCurrency = matched.authCurrency ?? matched.currency ?? matched.moneda;
      const currencyStr = String(rawCurrency || '').trim().toUpperCase();
      const isUsd = currencyStr === 'USD' || currencyStr === '840' || currencyStr === 'US_DOLLAR';
      if (!isUsd) {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Invalid or missing currency "${rawCurrency}". USD (840) required.`,
          error: 'Invalid currency.',
        };
      }

      // Merchant account identity revalidation in approved-payment repair path
      const expectedCclwApproved = isSandbox
        ? (env.PAGUELOFACIL_SANDBOX_CCLW || env.PAGUELOFACIL_DEMO_CCLW || '').trim()
        : (env.PAGUELOFACIL_CCLW || '').trim();
      const gwCclwApproved = String(matched.cclw || matched.CCLW || '').trim();
      const gwMerchantIdApproved = String(matched.idMerchant ?? matched.id_merchant ?? matched.merchant ?? '').trim();
      const configuredMerchantIdApproved = String(
        (isSandbox ? (env.PAGUELOFACIL_SANDBOX_MERCHANT_ID || env.PAGUELOFACIL_MERCHANT_ID) : env.PAGUELOFACIL_MERCHANT_ID) || ''
      ).trim();

      let merchantVerifiedApproved = false;
      if (gwCclwApproved && expectedCclwApproved) {
        if (gwCclwApproved === expectedCclwApproved) {
          merchantVerifiedApproved = true;
        } else {
          return {
            success: false,
            category: 'needs_manual_review',
            bookingReference: existingTx.booking_reference,
            operationCode: opToQuery,
            message: 'Merchant account identity mismatch during approved payment revalidation.',
            error: 'Merchant CCLW mismatch.',
          };
        }
      }

      if (!merchantVerifiedApproved && gwMerchantIdApproved && configuredMerchantIdApproved) {
        if (gwMerchantIdApproved === configuredMerchantIdApproved) {
          merchantVerifiedApproved = true;
        } else {
          return {
            success: false,
            category: 'needs_manual_review',
            bookingReference: existingTx.booking_reference,
            operationCode: opToQuery,
            message: 'Merchant account identity mismatch during approved payment revalidation.',
            error: 'Merchant ID mismatch.',
          };
        }
      }

      if (!merchantVerifiedApproved && gwMerchantIdApproved && expectedCclwApproved && gwMerchantIdApproved === expectedCclwApproved) {
        merchantVerifiedApproved = true;
      }

      if (!merchantVerifiedApproved) {
        if (isSandbox && !expectedCclwApproved && !configuredMerchantIdApproved && !gwCclwApproved) {
          merchantVerifiedApproved = true;
        } else {
          const merchantDiagApproved = await diagnoseMerchantIdentity(opToQuery, txEnvironment as any, env, fetchFn);
          return {
            success: false,
            category: 'needs_manual_review',
            bookingReference: existingTx.booking_reference,
            operationCode: opToQuery,
            message: 'Could not establish verified merchant account identity from gateway record during approved payment revalidation.',
            error: `Merchant identity unverified. Rule: ${merchantDiagApproved.failingValidationRule}. ${merchantDiagApproved.verificationDetails}`,
            merchantIdentityDiagnostic: merchantDiagApproved,
          };
        }
      }

      let atomicSuccess = false;
      let rpcErrorMsg = '';

      if (typeof (supabaseClient as any)?.rpc === 'function') {
        try {
          const { data: rpcRes, error: rpcErr } = await (supabaseClient as any).rpc('reconcile_payment_and_booking_atomic', {
            p_transaction_id: existingTx.id,
            p_booking_reference: existingTx.booking_reference,
            p_gateway_operation_id: opToQuery,
            p_amount_paid: amountPaid,
            p_verified_at: new Date().toISOString(),
            p_audit_metadata: {
              ...(existingTx.audit_metadata || {}),
              verified: true,
              verified_via: 'reconciliation_helper_atomic_rpc_repair',
              rereconciled_at: new Date().toISOString(),
              gateway_operation_id: opToQuery,
              auth_code: matched.authCode || matched.authStatus,
              card_type: matched.cardType || matched.Tipo,
              relationship_evidence: relCheck.evidence,
            },
          });

          if (!rpcErr && rpcRes && rpcRes.success) {
            atomicSuccess = true;
          } else {
            rpcErrorMsg = rpcErr?.message || rpcRes?.error || 'RPC returned unsuccessful result';
          }
        } catch (rpcEx: any) {
          rpcErrorMsg = rpcEx.message;
        }
      } else {
        rpcErrorMsg = 'Supabase client RPC method unavailable';
      }

      if (!atomicSuccess) {
        return {
          success: false,
          category: 'partial_synchronization_failure',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Approved payment revalidated but atomic RPC database update failed (${rpcErrorMsg}). No database records modified.`,
          error: `Atomic RPC failure: ${rpcErrorMsg}`,
        };
      }

      return {
        success: true,
        duplicate: true,
        category: 'approved',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        amountPaid: existingTx.amount_paid || existingTx.expected_amount,
        message: 'Approved payment revalidated against gateway and booking_requests record atomically synchronized.',
        databaseUpdated: true,
        audit: existingTx.audit_metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Revalidation exception: ${err.message}`,
        error: err.message,
      };
    }
  }

  // 3. Call PagueloFacil MerchantTransactions API authoritatively
  const activeToken = isSandbox
    ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
    : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

  if (!activeToken) {
    return {
      success: false,
      category: 'authentication_failure',
      bookingReference: existingTx.booking_reference,
      message: 'Authoritative transaction verification requires PagueloFacil REST API access token.',
      error: 'Missing access token.',
    };
  }

  const verifyUrl = isSandbox
    ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
    : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';

  let opToQuery = (operationCode || existingTx.gateway_operation_id || '').trim();
  let matched: any = null;

  try {
    if (opToQuery) {
    const filterParam = `codOper::${opToQuery}`;
    try {
      const response = await fetchFn(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
        method: 'GET',
        headers: {
          Authorization: activeToken, // Direct access token without Bearer prefix
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          category: 'parsing_problem',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Verification API returned HTTP ${response.status}.`,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));
      const matchingRecords = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(opToQuery).trim());

      if (matchingRecords.length === 0) {
        return {
          success: false,
          category: 'absent_records',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `No authoritative record found in gateway for operation ${opToQuery}.`,
          error: 'Record not found in gateway.',
        };
      }

      if (matchingRecords.length > 1) {
        return {
          success: false,
          category: 'ambiguous_records',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Ambiguous gateway response: Multiple records found for operation code ${opToQuery}.`,
          error: 'Ambiguous gateway records.',
        };
      }

      matched = matchingRecords[0];
    } catch (err: any) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Network or parsing error querying MerchantTransactions API: ${err.message}`,
        error: err.message,
      };
    }
  } else {
    // Operation recovery path: when existingTx has gateway_operation_id = NULL
    // Query authenticated PagueloFacil MerchantTransactions endpoint for recent transactions
    try {
      const response = await fetchFn(`${verifyUrl}?limit=25&sort=-dateAdded`, {
        method: 'GET',
        headers: {
          Authorization: activeToken,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          category: 'parsing_problem',
          bookingReference: existingTx.booking_reference,
          message: `Operation recovery API returned HTTP ${response.status}.`,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));

      const candidates: any[] = [];
      let conflictDetected = false;

      for (const rec of records) {
        const relCheck = validatePaymentRelationship(rec, existingTx);
        if (relCheck.diagnosticDetails?.hasConflicts) {
          conflictDetected = true;
        }
        if (relCheck.verified) {
          const rawStatus = rec.status !== undefined ? Number(rec.status) : String(rec.estado || '').trim().toLowerCase();
          const isApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
          const txType = String(rec.txType || rec.type || rec.operationType || rec.tipo || '').trim().toUpperCase();
          const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';
          if (isApproved && isAuthCapture) {
            candidates.push(rec);
          }
        }
      }

      if (conflictDetected) {
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          message: 'Conflicting booking identifiers detected in gateway transaction records. Manual review required.',
          error: 'Identifier conflict.',
        };
      }

      if (candidates.length === 0) {
        return {
          success: false,
          category: 'absent_records',
          bookingReference: existingTx.booking_reference,
          message: `No approved gateway transaction found for booking ${existingTx.booking_reference}. Payment is still pending.`,
          error: 'Record not found in gateway.',
        };
      }

      if (candidates.length > 1) {
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          message: `Ambiguous recovery: Multiple (${candidates.length}) gateway records matched booking ${existingTx.booking_reference}. Cannot automatically select operation. Manual review required.`,
          error: 'Ambiguous recovery.',
        };
      }

      matched = candidates[0];
      opToQuery = String(matched.codOper || matched.oper || matched.id || '').trim();
      if (!opToQuery) {
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          message: 'Gateway record verified but lacks authoritative operation code. Manual review required.',
          error: 'Missing operation code in matched record.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        message: `Network or parsing error querying MerchantTransactions API for recovery: ${err.message}`,
        error: err.message,
      };
    }
  }

    // 4. Validate Authoritative Evidence
    const rawStatus = matched.status !== undefined ? Number(matched.status) : String(matched.estado || '').trim().toLowerCase();
    const isStatusApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
    const isStatusDeclined = rawStatus === 0 || rawStatus === '0' || rawStatus === 'rechazada' || rawStatus === 'declined';

    const txType = String(matched.txType || matched.type || matched.operationType || matched.tipo || '').trim().toUpperCase();
    const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';

    if (isStatusDeclined) {
      return {
        success: false,
        category: 'declined',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: 'Transaction was declined by gateway (status 0).',
        error: 'Gateway status declined.',
      };
    }

    if (!isStatusApproved || !isAuthCapture) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Transaction not fully captured/approved: status=${rawStatus}, txType=${txType}.`,
        error: 'Invalid status or transaction type.',
      };
    }

    // Authoritative relationship validation using shared helper
    const relCheck = validatePaymentRelationship(matched, existingTx);
    if (!relCheck.verified) {
      return {
        success: false,
        category: relCheck.details.includes('conflict') ? 'mismatched_identifiers' : 'needs_manual_review',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Relationship verification failed: ${relCheck.details}`,
        error: 'Missing or conflicting relationship evidence.',
      };
    }

    // Amount validation in integer cents
    const rawAmount = matched.authAmount ?? matched.amount ?? matched.total ?? matched.TotalPagado;
    if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: 'Gateway record missing amount field.',
        error: 'Missing amount.',
      };
    }

    const amountPaid = Number(rawAmount);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Invalid amount paid value: ${rawAmount}.`,
        error: 'Invalid amount.',
      };
    }

    const amountCents = Math.round(amountPaid * 100);
    const expectedCents = existingTx.amount_in_cents || Math.round((existingTx.expected_amount || 0) * 100);

    if (amountCents !== expectedCents) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Exact amount mismatch: Paid ${amountCents} cents does not match expected ${expectedCents} cents.`,
        error: 'Amount mismatch.',
      };
    }

    // Currency validation (840 or USD)
    const rawCurrency = matched.authCurrency ?? matched.currency ?? matched.moneda;
    const currencyStr = String(rawCurrency || '').trim().toUpperCase();
    const isUsd = currencyStr === 'USD' || currencyStr === '840' || currencyStr === 'US_DOLLAR';
    if (!isUsd) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Invalid or missing currency "${rawCurrency}". USD (840) required.`,
        error: 'Invalid currency.',
      };
    }

    // Merchant account identity validation
    const expectedCclw = isSandbox
      ? (env.PAGUELOFACIL_SANDBOX_CCLW || env.PAGUELOFACIL_DEMO_CCLW || '').trim()
      : (env.PAGUELOFACIL_CCLW || '').trim();
    const gwCclw = String(matched.cclw || matched.CCLW || '').trim();
    const gwMerchantId = String(matched.idMerchant ?? matched.id_merchant ?? matched.merchant ?? '').trim();
    const configuredMerchantId = String(
      (isSandbox ? (env.PAGUELOFACIL_SANDBOX_MERCHANT_ID || env.PAGUELOFACIL_MERCHANT_ID) : env.PAGUELOFACIL_MERCHANT_ID) || ''
    ).trim();

    let merchantVerified = false;
    if (gwCclw && expectedCclw) {
      if (gwCclw === expectedCclw) {
        merchantVerified = true;
      } else {
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: 'Merchant account identity mismatch.',
          error: 'Merchant CCLW mismatch.',
        };
      }
    }

    if (!merchantVerified && gwMerchantId && configuredMerchantId) {
      if (gwMerchantId === configuredMerchantId) {
        merchantVerified = true;
      } else {
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: 'Merchant account identity mismatch.',
          error: 'Merchant ID mismatch.',
        };
      }
    }

    if (!merchantVerified && gwMerchantId && expectedCclw && gwMerchantId === expectedCclw) {
      merchantVerified = true;
    }

    if (!merchantVerified) {
      if (isSandbox && !expectedCclw && !configuredMerchantId && !gwCclw) {
        merchantVerified = true;
      } else {
        const merchantDiag = await diagnoseMerchantIdentity(opToQuery, txEnvironment as any, env, fetchFn);
        return {
          success: false,
          category: 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: 'Could not establish verified merchant account identity from gateway record.',
          error: `Merchant identity unverified. Rule: ${merchantDiag.failingValidationRule}. ${merchantDiag.verificationDetails}`,
          merchantIdentityDiagnostic: merchantDiag,
        };
      }
    }

    const isLateReconciliation = ['cancelled', 'expired', 'cancelled_pending_expiry', 'needs_manual_review'].includes(existingTx.status);

    // 5. Persist updates consistently to payment_transactions and booking_requests using Atomic RPC
    let atomicSuccess = false;
    let rpcErrorMsg = '';

    if (typeof (supabaseClient as any)?.rpc === 'function') {
      try {
        const { data: rpcRes, error: rpcErr } = await (supabaseClient as any).rpc('reconcile_payment_and_booking_atomic', {
          p_transaction_id: existingTx.id,
          p_booking_reference: existingTx.booking_reference,
          p_gateway_operation_id: opToQuery,
          p_amount_paid: amountPaid,
          p_verified_at: new Date().toISOString(),
          p_audit_metadata: {
            ...(existingTx.audit_metadata || {}),
            verified: true,
            verified_via: 'reconciliation_helper_atomic_rpc',
            verified_at: new Date().toISOString(),
            gateway_operation_id: opToQuery,
            auth_code: matched.authCode || matched.authStatus,
            card_type: matched.cardType || matched.Tipo,
            relationship_evidence: relCheck.evidence,
            ...(isLateReconciliation ? { late_payment_reconciled: true, previous_status: existingTx.status } : {}),
          },
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          atomicSuccess = true;
        } else {
          rpcErrorMsg = rpcErr?.message || rpcRes?.error || 'RPC returned unsuccessful result';
        }
      } catch (rpcEx: any) {
        rpcErrorMsg = rpcEx.message;
      }
    } else {
      rpcErrorMsg = 'Supabase client RPC method unavailable';
    }

    if (!atomicSuccess) {
      return {
        success: false,
        category: 'partial_synchronization_failure',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Transaction verified but atomic RPC database update failed (${rpcErrorMsg}). No database records were modified.`,
        error: `Atomic RPC failure: ${rpcErrorMsg}`,
      };
    }

    return {
      success: true,
      category: 'approved',
      bookingReference: existingTx.booking_reference,
      operationCode: opToQuery,
      amountPaid,
      message: `Transaction successfully verified and reconciled. Both payment_transactions and booking_requests records updated.`,
      databaseUpdated: true,
      audit: {
        txId: existingTx.id,
        authCode: matched.authCode || matched.authStatus,
        cardType: matched.cardType || matched.Tipo,
        relationshipEvidence: relCheck.evidence,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      category: 'parsing_problem',
      bookingReference: existingTx?.booking_reference || bookingReference,
      operationCode: opToQuery,
      message: `Reconciliation exception: ${err.message}`,
      error: err.message,
    };
  }
}
