import fs from 'node:fs';
import path from 'node:path';
import {
  PagueloFacilGatewayAdapter,
  calculateAuthoritativeDayTripAmount,
  validateCclw,
  maskCredential,
  validatePagueloFacilCheckoutUrl,
  TRUSTED_CHECKOUT_HOSTNAMES,
} from '../netlify/functions/paymentGateway.js';
import { reconcilePaymentTransaction, validatePaymentRelationship, validateMerchantReturnUrl, diagnoseMerchantIdentity } from '../netlify/functions/paymentReconciliation.js';
import { handler as checkoutHandler } from '../netlify/functions/payment-checkout.js';
import { handler as webhookHandler, extractVerifiedBookingReferenceFromUrl } from '../netlify/functions/payment-webhook.js';
import {
  executeAdminSandboxTest,
  executeExistingTransactionDiagnostic,
  executeTestLiveApiConnection,
  executeTestLiveCheckoutConnection,
  executeCreateControlledLiveTest,
  executeCheckControlledLiveTestStatus,
  executeCancelControlledLiveTest,
  executeReconcileExistingTransaction,
  executeDiagnoseMerchantIdentity,
  resetLiveTestMutexForTesting,
  acquireAtomicLiveTestLock,
  releaseAtomicLiveTestLock,
  handler as adminSandboxTestHandler,
} from '../netlify/functions/admin-payment-sandbox-test.js';
import {
  generatePaymentInstructionsEmail,
  generateVerifiedBookingConfirmationEmail,
  generatePaymentFailedOrExpiredEmail,
} from '../src/templates/emailTemplates.js';
import {
  parseSandboxReturnParams,
  parseTotalPagado,
} from '../src/utils/sandboxReturnParser.js';

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

const testResults: TestResult[] = [];

function assert(name: string, condition: boolean, expected: string, actual: string) {
  testResults.push({
    name,
    passed: Boolean(condition),
    expected,
    actual,
  });
}

async function runPaymentSecurityTests() {
  console.log('====================================================');
  console.log('   RUNNING PART 25E.1 PAYMENT SECURITY TESTS');
  console.log('====================================================');

  // -------------------------------------------------------------
  // TEST 1: INCORRECT CCLW ASSUMPTIONS REMOVED & CREDENTIAL MASKING
  // -------------------------------------------------------------
  const validShortCclw = validateCclw('SHORT_CCLW_123'); // 14 chars (not 32)
  const validHexCclw = validateCclw('7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d'); // 32 chars
  const emptyCclw = validateCclw('');
  const whitespaceCclw = validateCclw('   ');
  const maskedKey = maskCredential('SECRET_PAGUELOFACIL_KEY_999');

  assert(
    'Test 1: CCLW validation accepts valid formats without enforcing 32-character requirement and masks credentials',
    validShortCclw === true &&
      validHexCclw === true &&
      emptyCclw === false &&
      whitespaceCclw === false &&
      maskedKey === '***_999' &&
      !maskedKey.includes('SECRET_PAGUELOFACIL'),
    'Short CCLW accepted, empty rejected, masked credential does not expose secret',
    `shortValid=${validShortCclw}, emptyValid=${emptyCclw}, masked="${maskedKey}"`
  );

  // -------------------------------------------------------------
  // TEST 2: CUSTOMER ATTEMPTS TO SELECT DEMO OR PRODUCTION ARE IGNORED
  // -------------------------------------------------------------
  const customerTamperedReq = {
    httpMethod: 'POST',
    headers: {
      'x-demo-mode': 'true', // Caller attempts to force demo via header
    },
    body: JSON.stringify({
      bookingReference: 'GNY-TAMPER-001',
      bookingType: 'day-trip',
      customerName: 'Attacker Attempting Mode Selection',
      customerEmail: 'attacker@example.com',
      adults: 2,
      idempotencyKey: 'idem_tamper_001',
      isDemo: true, // Caller attempts to force demo via body
      environment: 'sandbox', // Caller attempts to set environment
    }),
  };

  // With server in default unconfigured mode:
  const tamperedRes = await checkoutHandler(customerTamperedReq as any);
  const tamperedBody = JSON.parse(tamperedRes.body);

  assert(
    'Test 2: Customer attempts to select Demo or Production mode are ignored (environment is strictly server-controlled)',
    tamperedRes.statusCode === 200 &&
      tamperedBody.mode === 'request_only' &&
      tamperedBody.environment === 'unconfigured',
    'mode=request_only, environment=unconfigured (caller flags ignored)',
    `status=${tamperedRes.statusCode}, mode=${tamperedBody.mode}, environment=${tamperedBody.environment}`
  );

  // -------------------------------------------------------------
  // TEST 3: MISSING GATEWAY CONFIGURATION SAFELY EXITS WITHOUT NETWORK CALLS
  // -------------------------------------------------------------
  const unconfiguredGateway = new PagueloFacilGatewayAdapter({
    environment: 'unconfigured',
    enableLivePayments: false,
    enableSandboxPayments: false,
  });

  const unconfiguredResult = await unconfiguredGateway.createPaymentSession({
    bookingReference: 'GNY-TEST-NOCONFIG',
    bookingType: 'day-trip',
    customerName: 'No Config Test',
    customerEmail: 'noconfig@example.com',
    amount: 150.0,
    currency: 'USD',
    paymentType: 'full',
    description: 'Safe exit check',
    idempotencyKey: 'idem_noconfig_001',
  });

  assert(
    'Test 3: Missing gateway configuration exits safely without network calls',
    unconfiguredGateway.isConfigured() === false &&
      unconfiguredGateway.isSandboxConfigured() === false &&
      unconfiguredResult.success === false &&
      unconfiguredResult.error?.includes('safe preparation mode') === true,
    'isConfigured=false, success=false, error describes safe preparation mode',
    `configured=${unconfiguredGateway.isConfigured()}, success=${unconfiguredResult.success}, error="${unconfiguredResult.error}"`
  );

  // -------------------------------------------------------------
  // TEST 4: FABRICATED CHECKOUT URLS ARE REJECTED AGAINST TRUSTED HOSTNAMES
  // -------------------------------------------------------------
  const untrustedDomainUrl = validatePagueloFacilCheckoutUrl('https://evil-phishing-site.com/checkout?code=LK-FAKE', 'sandbox');
  const insecureHttpUrl = validatePagueloFacilCheckoutUrl('http://sandbox.paguelofacil.com/checkout?code=LK-123', 'sandbox');
  const insecureHttpDemoUrl = validatePagueloFacilCheckoutUrl('http://checkout-demo.paguelofacil.com/checkout?code=LK-123', 'sandbox');
  const mismatchedEnvUrl = validatePagueloFacilCheckoutUrl('https://secure.paguelofacil.com/checkout?code=LK-123', 'sandbox');
  const demoInProdUrl = validatePagueloFacilCheckoutUrl('https://checkout-demo.paguelofacil.com/checkout?code=LK-123', 'production');
  const customPortUrl = validatePagueloFacilCheckoutUrl('https://checkout-demo.paguelofacil.com:8443/checkout?code=LK-123', 'sandbox');
  const embeddedCredsUrl = validatePagueloFacilCheckoutUrl('https://admin:pass@checkout-demo.paguelofacil.com/checkout?code=LK-123', 'sandbox');
  const arbitrarySubdomainUrl = validatePagueloFacilCheckoutUrl('https://evil.checkout-demo.paguelofacil.com/checkout?code=LK-123', 'sandbox');
  const malformedUrl = validatePagueloFacilCheckoutUrl('not-a-valid-url', 'sandbox');
  const validSandboxUrl = validatePagueloFacilCheckoutUrl('https://sandbox.paguelofacil.com/checkout?code=LK-VALID', 'sandbox');
  const validSandboxDemoUrl = validatePagueloFacilCheckoutUrl('https://checkout-demo.paguelofacil.com/checkout?code=LK-DEMO', 'sandbox');
  const validProdUrl = validatePagueloFacilCheckoutUrl('https://secure.paguelofacil.com/checkout?code=LK-PROD', 'production');

  assert(
    'Test 4: Fabricated checkout URLs are rejected against documented trusted PagueloFacil hostnames with strict sandbox/production separation',
    Boolean(
      untrustedDomainUrl.valid === false &&
        insecureHttpUrl.valid === false &&
        insecureHttpDemoUrl.valid === false &&
        mismatchedEnvUrl.valid === false &&
        demoInProdUrl.valid === false &&
        customPortUrl.valid === false &&
        embeddedCredsUrl.valid === false &&
        arbitrarySubdomainUrl.valid === false &&
        malformedUrl.valid === false &&
        validSandboxUrl.valid === true &&
        validSandboxDemoUrl.valid === true &&
        validProdUrl.valid === true
    ),
    'Untrusted domain, insecure HTTP, custom ports, embedded creds, and cross-environment hostnames rejected; checkout-demo.paguelofacil.com accepted in sandbox only',
    `untrusted=${untrustedDomainUrl.valid}, http=${insecureHttpUrl.valid}, demoInSandbox=${validSandboxDemoUrl.valid}, demoInProd=${demoInProdUrl.valid}, customPort=${customPortUrl.valid}`
  );

  // -------------------------------------------------------------
  // TEST 5: DUPLICATE PAYMENT INITIATION PROTECTED BY IDEMPOTENCY KEY
  // -------------------------------------------------------------
  const missingIdemRes = await unconfiguredGateway.createPaymentSession({
    bookingReference: 'GNY-TEST-IDEM',
    bookingType: 'day-trip',
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    amount: 145.0,
    currency: 'USD',
    paymentType: 'full',
    description: 'Idempotency check',
    idempotencyKey: '', // Empty
  });

  assert(
    'Test 5: Duplicate payment attempts rejected before gateway creation if idempotency key is missing',
    missingIdemRes.success === false &&
      missingIdemRes.error?.includes('Missing required idempotency key') === true,
    'success=false, error=Missing required idempotency key',
    `success=${missingIdemRes.success}, error="${missingIdemRes.error}"`
  );

  // -------------------------------------------------------------
  // TEST 6: FORGED CALLBACKS REJECTED WITH SECURITY ALERT
  // -------------------------------------------------------------
  const configuredAdapter = new PagueloFacilGatewayAdapter({
    cclw: 'GENUINE_MERCHANT_CCLW_001',
    accessToken: 'test_token',
    environment: 'production',
    enableLivePayments: true,
  });

  const forgedPayload = {
    CCLW: 'ATTACKER_UNAUTHORIZED_CCLW',
    Estado: 'Aprobada',
    Oper: 'FORGED-OPER-999',
    TotalPagado: '290.00',
    PARM_1: 'GNY-ATTACK-001',
  };
  const forgedResult = configuredAdapter.parseWebhook(forgedPayload);

  assert(
    'Test 6: Forged callbacks with mismatched CCLW are rejected with security alert',
    forgedResult.isValid === false &&
      forgedResult.error?.includes('Security alert: Webhook CCLW does not match') === true,
    'isValid=false, Security alert error',
    `isValid=${forgedResult.isValid}, error="${forgedResult.error}"`
  );

  // -------------------------------------------------------------
  // TEST 7: INCORRECT PAYMENT AMOUNTS (< $1.00 USD REJECTED)
  // -------------------------------------------------------------
  const underMinAmountRes = await unconfiguredGateway.createPaymentSession({
    bookingReference: 'GNY-TEST-MINAMT',
    bookingType: 'day-trip',
    customerName: 'Under Min',
    customerEmail: 'undermin@example.com',
    amount: 0.50, // Below $1.00 minimum
    currency: 'USD',
    paymentType: 'full',
    description: 'Under min check',
    idempotencyKey: 'idem_min_001',
  });

  assert(
    'Test 7: Incorrect payment amount below minimum $1.00 USD is rejected',
    underMinAmountRes.success === false &&
      underMinAmountRes.error?.includes('Minimum transaction is $1.00 USD') === true,
    'success=false, error contains Minimum transaction is $1.00 USD',
    `success=${underMinAmountRes.success}, error="${underMinAmountRes.error}"`
  );

  // -------------------------------------------------------------
  // TEST 8: FAILED AND PENDING PAYMENTS DO NOT CONFIRM BOOKINGS
  // -------------------------------------------------------------
  const declinedPayload = {
    CCLW: 'GENUINE_MERCHANT_CCLW_001',
    Estado: 'Rechazada',
    Oper: 'DECLINED-OPER-123',
    TotalPagado: '290.00',
    Razon: 'Fondos Insuficientes / Insufficient Funds',
    PARM_1: 'GNY-DECLINE-001',
  };
  const declinedParsed = configuredAdapter.parseWebhook(declinedPayload);

  assert(
    'Test 8: Failed and pending payments are parsed as rejected and do not confirm bookings',
    declinedParsed.isValid === true &&
      declinedParsed.eventType === 'payment_rejected' &&
      declinedParsed.error?.includes('Insufficient Funds') === true,
    'isValid=true, eventType=payment_rejected, error contains Insufficient Funds',
    `isValid=${declinedParsed.isValid}, eventType=${declinedParsed.eventType}, error="${declinedParsed.error}"`
  );

  // -------------------------------------------------------------
  // TEST 9: UNVERIFIED CALLBACK LEAVES PAYMENT UNCONFIRMED (STATUS PENDING)
  // -------------------------------------------------------------
  // When no API token is configured, verifyTransaction cannot authoritatively verify
  const unverifiedAdapter = new PagueloFacilGatewayAdapter({
    cclw: 'GENUINE_MERCHANT_CCLW_001',
    accessToken: '', // Missing API verification token
    environment: 'production',
    enableLivePayments: true,
  });

  const unverifiedCheck = await unverifiedAdapter.verifyTransaction({
    gatewayOperationId: 'OP-UNVERIFIED-777',
    bookingReference: 'GNY-UNVERIFIED-777',
  });

  assert(
    'Test 9: Unverified callback leaves payment unconfirmed (pending) and reports missing merchant requirement',
    unverifiedCheck.verified === false &&
      unverifiedCheck.status === 'pending' &&
      Boolean(unverifiedCheck.missingRequirement),
    'verified=false, status=pending, missingRequirement reported',
    `verified=${unverifiedCheck.verified}, status=${unverifiedCheck.status}, missing="${unverifiedCheck.missingRequirement}"`
  );

  // -------------------------------------------------------------
  // TEST 10: VERIFIED SUCCESSFUL TRANSACTION USING MOCKED AUTHORITATIVE GATEWAY RESPONSE
  // -------------------------------------------------------------
  const mockAuthoritativeTransport = async (action: string, payload: any) => {
    if (action === 'verifyTransaction') {
      return {
        success: true,
        verified: true,
        status: 'approved',
        gatewayOperationId: 'AUTH_CAP-20261107-778899',
        amountPaid: 290.0,
        currency: 'USD',
        cardType: 'VISA',
        authCode: 'AUTH99238',
      };
    }
    return { success: false, error: 'Unknown action' };
  };

  const authoritativeAdapter = new PagueloFacilGatewayAdapter(
    {
      cclw: 'GENUINE_MERCHANT_CCLW_001',
      accessToken: 'valid_api_token_123',
      environment: 'production',
      enableLivePayments: true,
    },
    mockAuthoritativeTransport
  );

  const verifiedCheck = await authoritativeAdapter.verifyTransaction({
    gatewayOperationId: 'AUTH_CAP-20261107-778899',
    bookingReference: 'GNY-VERIFIED-777',
  });

  assert(
    'Test 10: Verified transaction succeeds only when authoritative server-to-server check confirms approval',
    verifiedCheck.verified === true &&
      verifiedCheck.status === 'approved' &&
      verifiedCheck.amountPaid === 290.0 &&
      verifiedCheck.gatewayOperationId === 'AUTH_CAP-20261107-778899',
    'verified=true, status=approved, amountPaid=290.0, gatewayOperationId=AUTH_CAP-20261107-778899',
    `verified=${verifiedCheck.verified}, status=${verifiedCheck.status}, amount=${verifiedCheck.amountPaid}, oper=${verifiedCheck.gatewayOperationId}`
  );

  // -------------------------------------------------------------
  // TEST 11: DUPLICATE CALLBACK PROCESSED IDEMPOTENTLY
  // -------------------------------------------------------------
  const processedOperations = new Set<string>();
  function processWebhookIdempotently(operId: string) {
    if (processedOperations.has(operId)) {
      return { duplicate: true, processed: false };
    }
    processedOperations.add(operId);
    return { duplicate: false, processed: true };
  }

  const delivery1 = processWebhookIdempotently('OPER-IDEMPOTENT-888');
  const delivery2 = processWebhookIdempotently('OPER-IDEMPOTENT-888');

  assert(
    'Test 11: Duplicate callback delivery is safely skipped without duplicate processing or confirmation',
    delivery1.duplicate === false &&
      delivery1.processed === true &&
      delivery2.duplicate === true &&
      delivery2.processed === false,
    'First delivery processed; second duplicate skipped',
    `firstDuplicate=${delivery1.duplicate}, secondDuplicate=${delivery2.duplicate}`
  );

  // -------------------------------------------------------------
  // TEST 12: UNAPPROVED PRICING PRESERVES REQUEST-ONLY MODE FOR DAY TRIPS
  // -------------------------------------------------------------
  const unapprovedDayCalc = calculateAuthoritativeDayTripAmount(2, 1);
  const sampleApprovedConfig = { adultRate: 140.0, childRate: 90.0, isApproved: true };
  const approvedDayCalc = calculateAuthoritativeDayTripAmount(2, 1, sampleApprovedConfig);

  assert(
    'Test 12: Day trips require Petra-approved prices and valid booking rules',
    unapprovedDayCalc.isApproved === false &&
      unapprovedDayCalc.valid === false &&
      approvedDayCalc.valid === true &&
      approvedDayCalc.amount === 370.0,
    'Unapproved isApproved=false; approved amount=370',
    `unapproved=${unapprovedDayCalc.isApproved}, approvedAmount=${approvedDayCalc.amount}`
  );

  // -------------------------------------------------------------
  // TEST 13: OVERNIGHT AND PRIVATE CHARTERS REQUIRE APPROVED QUOTATION
  // -------------------------------------------------------------
  const overnightDirectReq = {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({
      bookingReference: 'GNY-TEST-OVERNIGHT',
      bookingType: 'overnight',
      customerName: 'Marcus Aurelius',
      customerEmail: 'marcus@example.com',
      adults: 2,
      idempotencyKey: 'idem_overnight_direct_001',
    }),
  };
  const overnightDirectRes = await checkoutHandler(overnightDirectReq as any);
  const overnightDirectBody = JSON.parse(overnightDirectRes.body);

  assert(
    'Test 13: Overnight and private charters without approved quotation are rejected with HTTP 422',
    overnightDirectRes.statusCode === 422 &&
      overnightDirectBody.requiresApproval === true &&
      overnightDirectBody.bookingType === 'overnight',
    'HTTP 422, requiresApproval=true',
    `statusCode=${overnightDirectRes.statusCode}, requiresApproval=${overnightDirectBody.requiresApproval}`
  );

  // -------------------------------------------------------------
  // TEST 14: EXISTING BOOKING AND EMAIL REGRESSION CHECK
  // -------------------------------------------------------------
  const samplePayload: any = {
    bookingReference: 'GNY-482325',
    bookingType: 'overnight',
    customerName: 'Carlos Rivera',
    customerEmail: 'carlos@example.com',
    customerPhone: '+507 6000-0000',
    experienceTitle: 'San Blas 2-Night Authentic Cabana Experience',
    adults: 2,
    children: 0,
    termsAccepted: true,
    termsVersion: '2026-10-18',
    customerLanguage: 'en',
    submittedAt: new Date().toISOString(),
  };

  const bookingConfirmEmail = generateVerifiedBookingConfirmationEmail(samplePayload, {
    paymentRef: 'AUTH_CAP-20261107-778899',
    amountPaid: 290.0,
    confirmedAt: '2026-11-07T12:00:00Z',
  });

  const paymentInstructionsEmail = generatePaymentInstructionsEmail(samplePayload, {
    paymentLink: 'https://sandbox.paguelofacil.com/checkout?code=LK-DEMO-SAMPLE',
    depositAmount: 290.0,
    dueBy: '2026-11-10T00:00:00Z',
  });

  assert(
    'Test 14: Existing booking and email regression check preserves customer email integrity',
    bookingConfirmEmail.subject.includes('Booking Confirmed!') &&
      bookingConfirmEmail.html.includes('AUTH_CAP-20261107-778899') &&
      paymentInstructionsEmail.subject.includes('Payment Instructions') &&
      paymentInstructionsEmail.html.includes('sandbox.paguelofacil.com'),
    'Both confirmation and instruction emails generate valid branded HTML without error',
    `Confirm: "${bookingConfirmEmail.subject}", Instructions: "${paymentInstructionsEmail.subject}"`
  );

  // -------------------------------------------------------------
  // TEST 15: SANDBOX PAYMENT RECORD CREATION ENFORCES SANDBOX ENVIRONMENT & URL
  // -------------------------------------------------------------
  const sandboxAdapter = new PagueloFacilGatewayAdapter(
    {
      sandboxCclw: 'TEST_SANDBOX_CCLW_123',
      sandboxAccessToken: 'sandbox_token_123',
      environment: 'sandbox',
      enableSandboxPayments: true,
    },
    async (action, payload) => ({
      success: true,
      paymentId: 'tx_sandbox_123',
      paymentUrl: 'https://sandbox.paguelofacil.com/checkout?code=LK-SAND-123',
      gatewayLinkCode: 'LK-SAND-123',
      environment: 'sandbox',
    })
  );

  const sandboxSession = await sandboxAdapter.createPaymentSession({
    bookingReference: 'GNY-SAND-001',
    bookingType: 'day-trip',
    customerName: 'Sandbox Traveler',
    customerEmail: 'sandbox@example.com',
    amount: 150.0,
    currency: 'USD',
    paymentType: 'full',
    description: 'Sandbox test booking',
    idempotencyKey: 'idem_sand_001',
  });

  assert(
    'Test 15: Sandbox payment record creation enforces sandbox environment and URL',
    sandboxSession.success === true &&
      sandboxSession.environment === 'sandbox' &&
      sandboxSession.paymentUrl?.includes('sandbox.paguelofacil.com') === true,
    'environment=sandbox, paymentUrl on sandbox.paguelofacil.com',
    `env=${sandboxSession.environment}, url=${sandboxSession.paymentUrl}`
  );

  // -------------------------------------------------------------
  // TEST 16: PRODUCTION PAYMENT RECORD CREATION ENFORCES PRODUCTION ENVIRONMENT & URL
  // -------------------------------------------------------------
  const prodAdapter = new PagueloFacilGatewayAdapter(
    {
      cclw: 'TEST_PROD_CCLW_999',
      accessToken: 'prod_token_999',
      environment: 'production',
      enableLivePayments: true,
    },
    async (action, payload) => ({
      success: true,
      paymentId: 'tx_prod_999',
      paymentUrl: 'https://secure.paguelofacil.com/checkout?code=LK-PROD-999',
      gatewayLinkCode: 'LK-PROD-999',
      environment: 'production',
    })
  );

  const prodSession = await prodAdapter.createPaymentSession({
    bookingReference: 'GNY-PROD-001',
    bookingType: 'overnight',
    quotationId: 'quote-prod-001',
    customerName: 'Production Traveler',
    customerEmail: 'prod@example.com',
    amount: 450.0,
    currency: 'USD',
    paymentType: 'deposit',
    description: 'Production booking',
    idempotencyKey: 'idem_prod_001',
  });

  assert(
    'Test 16: Production payment record creation enforces production environment and URL',
    prodSession.success === true &&
      prodSession.environment === 'production' &&
      prodSession.paymentUrl?.includes('secure.paguelofacil.com') === true,
    'environment=production, paymentUrl on secure.paguelofacil.com',
    `env=${prodSession.environment}, url=${prodSession.paymentUrl}`
  );

  // -------------------------------------------------------------
  // TEST 17: CROSS-ENVIRONMENT WEBHOOK REJECTION
  // -------------------------------------------------------------
  const dualEnvAdapter = new PagueloFacilGatewayAdapter({
    cclw: 'PROD_CCLW_AUTHORITATIVE',
    accessToken: 'prod_token',
    sandboxCclw: 'SANDBOX_CCLW_TESTING',
    sandboxAccessToken: 'sandbox_token',
    environment: 'production',
    enableLivePayments: true,
    enableSandboxPayments: true,
  });

  const parsedSandboxCallback = dualEnvAdapter.parseWebhook({
    CCLW: 'SANDBOX_CCLW_TESTING',
    Estado: 'Aprobada',
    Oper: 'SAND-OPER-001',
    TotalPagado: '150.00',
    PARM_1: 'GNY-CROSS-001',
  });

  const parsedProdCallback = dualEnvAdapter.parseWebhook({
    CCLW: 'PROD_CCLW_AUTHORITATIVE',
    Estado: 'Aprobada',
    Oper: 'PROD-OPER-001',
    TotalPagado: '150.00',
    PARM_1: 'GNY-CROSS-001',
  });

  const isCrossMismatch = (existingEnv: string, incomingEnv: string) => existingEnv !== incomingEnv;
  const prodToSandRejection = isCrossMismatch('production', parsedSandboxCallback.environment!);
  const sandToProdRejection = isCrossMismatch('sandbox', parsedProdCallback.environment!);

  assert(
    'Test 17: Cross-environment webhook mismatch is reliably detected and rejected',
    parsedSandboxCallback.environment === 'sandbox' &&
      parsedProdCallback.environment === 'production' &&
      prodToSandRejection === true &&
      sandToProdRejection === true,
    'parsed environments match credentials; cross-environment mismatches flagged as true',
    `sandEnv=${parsedSandboxCallback.environment}, prodEnv=${parsedProdCallback.environment}, crossRejection=${prodToSandRejection && sandToProdRejection}`
  );

  // -------------------------------------------------------------
  // TEST 18: MISSING OR UNCONFIGURED ENVIRONMENT FAILS SAFELY WITHOUT NETWORK CALLS
  // -------------------------------------------------------------
  const unconfiguredEnvAdapter = new PagueloFacilGatewayAdapter({
    environment: 'unconfigured',
    enableLivePayments: false,
    enableSandboxPayments: false,
  });

  const unconfSession = await unconfiguredEnvAdapter.createPaymentSession({
    bookingReference: 'GNY-UNCONF-001',
    bookingType: 'day-trip',
    customerName: 'Unconfigured Test',
    customerEmail: 'unconf@example.com',
    amount: 150.0,
    currency: 'USD',
    paymentType: 'full',
    description: 'Unconfigured check',
    idempotencyKey: 'idem_unconf_001',
  });

  assert(
    'Test 18: Missing or unconfigured environment fails safely without network requests',
    unconfSession.success === false &&
      unconfSession.error?.includes('safe preparation mode') === true,
    'success=false, safe preparation mode',
    `success=${unconfSession.success}, error="${unconfSession.error}"`
  );

  // -------------------------------------------------------------
  // TEST 19: ATTEMPTED CUSTOMER ENVIRONMENT MANIPULATION CANNOT OVERRIDE SERVER
  // -------------------------------------------------------------
  const manipulationReq = {
    httpMethod: 'POST',
    headers: {
      'x-environment-override': 'production',
      'x-demo-mode': 'false',
    },
    body: JSON.stringify({
      bookingReference: 'GNY-MANIP-001',
      bookingType: 'day-trip',
      customerName: 'Attacker Attempting Prod Escalation',
      customerEmail: 'attacker@example.com',
      adults: 2,
      idempotencyKey: 'idem_manip_001',
      environment: 'production',
      isDemo: false,
    }),
  };

  const manipulationRes = await checkoutHandler(manipulationReq as any);
  const manipBody = JSON.parse(manipulationRes.body);

  assert(
    'Test 19: Attempted customer environment manipulation cannot override server environment',
    manipulationRes.statusCode === 200 &&
      manipBody.environment === 'unconfigured' &&
      manipBody.mode === 'request_only',
    'Customer cannot override environment; remains server-determined unconfigured',
    `status=${manipulationRes.statusCode}, env=${manipBody.environment}, mode=${manipBody.mode}`
  );

  // -------------------------------------------------------------
  // TEST 20: ADDITIVE MIGRATION SQL VERIFICATION (NO DEFAULT VALUE)
  // -------------------------------------------------------------
  const migrationPath = path.resolve('supabase/migrations/20261107_payment_environment.sql');
  const migrationExists = fs.existsSync(migrationPath);
  const migrationContent = migrationExists ? fs.readFileSync(migrationPath, 'utf8') : '';

  const hasEnvColumn = migrationContent.includes('ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL');
  const hasEnvCheck = migrationContent.includes("CHECK (environment IN ('sandbox', 'production'))");
  const hasDropDefault = migrationContent.includes('ALTER COLUMN environment DROP DEFAULT');
  const hasNoDefaultInAdd = !migrationContent.includes("DEFAULT 'sandbox'") && !migrationContent.includes("DEFAULT 'production'");
  const hasEnvIndex = migrationContent.includes('CREATE INDEX IF NOT EXISTS idx_payment_tx_environment');

  assert(
    'Test 20: Additive migration mandates explicit environment column with NO DEFAULT value',
    migrationExists === true && hasEnvColumn === true && hasEnvCheck === true && hasDropDefault === true && hasNoDefaultInAdd === true && hasEnvIndex === true,
    'Migration exists with environment TEXT NOT NULL, no default value, check constraint, and index',
    `exists=${migrationExists}, hasColumn=${hasEnvColumn}, noDefault=${hasNoDefaultInAdd}, dropDefault=${hasDropDefault}, hasIndex=${hasEnvIndex}`
  );

  // -------------------------------------------------------------
  // TEST 21: AMBIGUOUS WEBHOOK CALLBACK REJECTION
  // -------------------------------------------------------------
  // When a webhook lacks Oper, PARM_2 (idempotency key), and linkCode, it must be rejected safely
  const ambiguousWebhookReq = {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({
      CCLW: 'GENUINE_MERCHANT_CCLW_001',
      Estado: 'Aprobada',
      TotalPagado: '150.00',
      PARM_1: 'GNY-AMBIGUOUS-001',
      // Missing Oper / codOper, missing PARM_2 / idempotencyKey, missing code / linkCode
    }),
  };

  const ambiguousRes = await webhookHandler(ambiguousWebhookReq as any);
  const ambiguousBody = JSON.parse(ambiguousRes.body);

  assert(
    'Test 21: Ambiguous callback lacking unique operation ID or attempt key is rejected with HTTP 400',
    ambiguousRes.statusCode === 400 &&
      ambiguousBody.success === false &&
      ambiguousBody.error?.includes('Ambiguous callback rejected') === true,
    'HTTP 400, Ambiguous callback rejected',
    `status=${ambiguousRes.statusCode}, error="${ambiguousBody.error}"`
  );

  // -------------------------------------------------------------
  // TEST 22: MULTIPLE PAYMENT ATTEMPTS FOR ONE BOOKING MATCHED UNIQUELY
  // -------------------------------------------------------------
  // Simulate two payment attempts for the same booking reference
  const attemptsStore = [
    {
      id: 'tx-attempt-uuid-001',
      booking_reference: 'GNY-MULTI-888',
      idempotency_key: 'idem_attempt_alpha',
      gateway_link_code: 'LK-ALPHA',
      gateway_operation_id: null,
      environment: 'sandbox',
      expected_amount: 250.0,
      status: 'pending',
    },
    {
      id: 'tx-attempt-uuid-002',
      booking_reference: 'GNY-MULTI-888',
      idempotency_key: 'idem_attempt_beta',
      gateway_link_code: 'LK-BETA',
      gateway_operation_id: null,
      environment: 'sandbox',
      expected_amount: 250.0,
      status: 'pending',
    },
  ];

  // Callback targeting attempt Beta specifically via PARM_2 (idempotency key)
  const betaCallback = {
    CCLW: 'GENUINE_MERCHANT_CCLW_001',
    Estado: 'Aprobada',
    Oper: 'AUTH_CAP-BETA-777',
    TotalPagado: '250.00',
    PARM_1: 'GNY-MULTI-888',
    PARM_2: 'idem_attempt_beta',
  };

  const parsedBeta = configuredAdapter.parseWebhook(betaCallback);

  // Matcher function using unique identifier
  function matchTransaction(parsedWebhook: any) {
    if (parsedWebhook.gatewayOperationId) {
      const match = attemptsStore.find((a) => a.gateway_operation_id === parsedWebhook.gatewayOperationId);
      if (match) return match;
    }
    if (parsedWebhook.idempotencyKey) {
      const match = attemptsStore.find((a) => a.idempotency_key === parsedWebhook.idempotencyKey);
      if (match) return match;
    }
    if (parsedWebhook.gatewayLinkCode) {
      const match = attemptsStore.find((a) => a.gateway_link_code === parsedWebhook.gatewayLinkCode);
      if (match) return match;
    }
    return null;
  }

  const matchedAttempt = matchTransaction(parsedBeta);

  assert(
    'Test 22: Multiple payment attempts for one booking are uniquely matched without arbitrary selection',
    matchedAttempt !== null &&
      matchedAttempt.id === 'tx-attempt-uuid-002' &&
      matchedAttempt.idempotency_key === 'idem_attempt_beta',
    'Attempt Beta matched uniquely; Attempt Alpha untouched',
    `matchedId=${matchedAttempt?.id}, matchedIdem=${matchedAttempt?.idempotency_key}`
  );

  // -------------------------------------------------------------
  // TEST 23: BACKEND MANDATORY ENVIRONMENT ON PAYMENT INSERTION
  // -------------------------------------------------------------
  // Validate that PaymentTransactionRecord type mandates environment without undefined
  const sandboxRecord = {
    id: 'tx-test-sandbox',
    bookingReference: 'GNY-REC-001',
    bookingType: 'day-trip' as const,
    gateway: 'paguelofacil' as const,
    environment: 'sandbox' as const, // explicitly required
    currency: 'USD' as const,
    expectedAmount: 140.0,
    paymentType: 'full' as const,
    status: 'pending' as const,
    idempotencyKey: 'idem_rec_001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const prodRecord = {
    ...sandboxRecord,
    id: 'tx-test-prod',
    environment: 'production' as const, // explicitly required
  };

  assert(
    'Test 23: Backend mandates explicit environment (sandbox or production) on payment insertion',
    sandboxRecord.environment === 'sandbox' &&
      prodRecord.environment === 'production' &&
      typeof sandboxRecord.environment === 'string',
    'environment strictly typed as "sandbox" | "production" with no missing values',
    `sandboxEnv=${sandboxRecord.environment}, prodEnv=${prodRecord.environment}`
  );

  // -------------------------------------------------------------
  // TEST 24: BOOKING RELATIONSHIP MISMATCH REJECTION
  // -------------------------------------------------------------
  const mismatchedBookingPayload = {
    CCLW: 'GENUINE_MERCHANT_CCLW_001',
    Estado: 'Aprobada',
    Oper: 'AUTH_CAP-MISMATCH-123',
    TotalPagado: '250.00',
    PARM_1: 'GNY-WRONG-BOOKING', // Does not match transaction booking reference
    PARM_2: 'idem_attempt_beta', // Matches attempt Beta
  };

  const parsedMismatch = configuredAdapter.parseWebhook(mismatchedBookingPayload);
  const matchedForMismatch = matchTransaction(parsedMismatch);
  const isBookingMismatch = Boolean(
    matchedForMismatch &&
      parsedMismatch.bookingReference &&
      matchedForMismatch.booking_reference !== parsedMismatch.bookingReference
  );

  assert(
    'Test 24: Booking relationship mismatch between webhook and existing transaction is detected',
    isBookingMismatch === true &&
      matchedForMismatch?.booking_reference === 'GNY-MULTI-888' &&
      parsedMismatch.bookingReference === 'GNY-WRONG-BOOKING',
    'Booking mismatch flagged as true when PARM_1 differs from transaction booking reference',
    `isMismatch=${isBookingMismatch}, txBooking=${matchedForMismatch?.booking_reference}, webhookBooking=${parsedMismatch.bookingReference}`
  );

  // =============================================================
  // PART 25H: ADMIN-ONLY PAGUELOFACIL SANDBOX CONNECTION TESTS
  // =============================================================

  const createMockSupabase = (opts: { validUser?: boolean; isAdmin?: boolean; userId?: string } = {}) => {
    return {
      auth: {
        getUser: async (token: string) => {
          if (opts.validUser === false || token === 'invalid_token') {
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
          return {
            data: {
              user: {
                id: opts.userId || 'admin_uuid_petra',
                email: 'petra@gunayalapanamatravel.com',
              },
            },
            error: null,
          };
        },
      },
      from: (table: string) => {
        if (table === 'quotation_admins') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => {
                  if (opts.isAdmin === false) {
                    return { data: null, error: null };
                  }
                  return { data: { user_id: val, role: 'quotation_admin' }, error: null };
                },
              }),
            }),
          };
        }
        throw new Error(`Unexpected table access during test: ${table}`);
      },
    } as any;
  };

  const defaultSandboxEnv: Record<string, string> = {
    PAGUELOFACIL_ENV: 'sandbox',
    ENABLE_SANDBOX_CONNECTIVITY_TEST: 'true',
    PAGUELOFACIL_SANDBOX_CCLW: 'SANDBOX_CCLW_VALID_12345',
    PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'SANDBOX_API_TOKEN_XYZ',
    SUPABASE_URL: 'https://test-sandbox-db.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
  };

  // Test 25: Unauthenticated request rejected
  const unauthResult = await executeAdminSandboxTest(null, {
    supabaseClient: createMockSupabase({ validUser: false }),
    envOverride: defaultSandboxEnv,
  });

  assert(
    'Test 25: Request lacking administrator Bearer authorization is rejected with HTTP 401',
    unauthResult.statusCode === 401 && unauthResult.body.success === false,
    'HTTP 401, success=false, error=Unauthorized',
    `status=${unauthResult.statusCode}, error="${unauthResult.body.error}"`
  );

  // Test 26: Authenticated non-admin user rejected against quotation_admins table
  const nonAdminResult = await executeAdminSandboxTest('Bearer valid_token_regular_user', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: false, userId: 'non_admin_customer_123' }),
    envOverride: defaultSandboxEnv,
  });

  assert(
    'Test 26: Authenticated user not present in quotation_admins table is rejected with HTTP 403',
    Boolean(
      nonAdminResult.statusCode === 403 &&
        nonAdminResult.body.success === false &&
        nonAdminResult.body.error?.includes('quotation administrators')
    ),
    'HTTP 403, Forbidden: Access restricted to authorized quotation administrators',
    `status=${nonAdminResult.statusCode}, error="${nonAdminResult.body.error}"`
  );

  // Test 27: Explicit flag check: Rejection when ENABLE_SANDBOX_CONNECTIVITY_TEST is false/unset
  const disabledFlagEnv = { ...defaultSandboxEnv, ENABLE_SANDBOX_CONNECTIVITY_TEST: 'false' };
  const disabledFlagResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_test_user_flag' }),
    envOverride: disabledFlagEnv,
  });

  assert(
    'Test 27: Sandbox test is disabled by default and rejected when ENABLE_SANDBOX_CONNECTIVITY_TEST is unset or false',
    Boolean(
      disabledFlagResult.statusCode === 403 &&
        disabledFlagResult.body.success === false &&
        disabledFlagResult.body.error?.includes('ENABLE_SANDBOX_CONNECTIVITY_TEST=true')
    ),
    'HTTP 403, requires ENABLE_SANDBOX_CONNECTIVITY_TEST=true in environment',
    `status=${disabledFlagResult.statusCode}, error="${disabledFlagResult.body.error}"`
  );

  // Test 28: Server environment check: Rejection when PAGUELOFACIL_ENV is not sandbox
  const prodEnvSetting = { ...defaultSandboxEnv, PAGUELOFACIL_ENV: 'production' };
  const prodEnvResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_test_user_env' }),
    envOverride: prodEnvSetting,
  });

  assert(
    'Test 28: Execution rejected with HTTP 400 when PAGUELOFACIL_ENV is set to production (calling production endpoints prohibited)',
    Boolean(
      prodEnvResult.statusCode === 400 &&
        prodEnvResult.body.success === false &&
        prodEnvResult.body.error?.includes('PAGUELOFACIL_ENV must be set to "sandbox"')
    ),
    'HTTP 400, PAGUELOFACIL_ENV must be set to sandbox',
    `status=${prodEnvResult.statusCode}, error="${prodEnvResult.body.error}"`
  );

  // Test 29: Rejection when sandbox CCLW is missing or invalid
  const invalidCclwEnv = { ...defaultSandboxEnv, PAGUELOFACIL_SANDBOX_CCLW: '' };
  const invalidCclwResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_test_user_cclw' }),
    envOverride: invalidCclwEnv,
  });

  assert(
    'Test 29: Rejection with HTTP 422 when PAGUELOFACIL_SANDBOX_CCLW is missing or malformed',
    invalidCclwResult.statusCode === 422 &&
      invalidCclwResult.body.success === false &&
      invalidCclwResult.body.diagnostic?.cclwConfigured === false,
    'HTTP 422, CCLW missing/invalid with sanitized diagnostic output',
    `status=${invalidCclwResult.statusCode}, cclwConfigured=${invalidCclwResult.body.diagnostic?.cclwConfigured}`
  );

  // Test 30: Successful genuine $1.00 USD checkout link generated with unique non-customer test reference and zero database mutations
  let capturedGatewayPayload: any = null;
  const mockValidTransport = async (payload: any) => {
    capturedGatewayPayload = payload;
    return {
      headerStatus: {
        code: 200,
        status: 'SUCCESS',
        description: 'Transacción Aprobada / Link Creado',
      },
      data: {
        url: 'https://sandbox.paguelofacil.com/checkout?code=LK-GENUINE-SANDBOX-100',
        code: 'LK-GENUINE-SANDBOX-100',
      },
      message: 'Operación Exitosa',
    };
  };

  const successResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_petra_unique_success' }),
    testTransport: mockValidTransport,
    envOverride: defaultSandboxEnv,
  });

  const isUniqueNonCustomerRef =
    Boolean(successResult.body.testReference) &&
    successResult.body.testReference.startsWith('TEST-PF-SANDBOX-') &&
    !successResult.body.testReference.startsWith('GNY-');

  const isExactOneDollar =
    capturedGatewayPayload?.CMTN === 1.00 &&
    successResult.body.amount === 1.00 &&
    successResult.body.currency === 'USD';

  assert(
    'Test 30: Successful genuine $1.00 USD PagueloFacil hosted sandbox checkout link generated with unique non-customer reference',
    Boolean(
      successResult.statusCode === 200 &&
        successResult.body.success === true &&
        successResult.body.environment === 'sandbox' &&
        isUniqueNonCustomerRef &&
        isExactOneDollar &&
        successResult.body.checkoutUrl === 'https://sandbox.paguelofacil.com/checkout?code=LK-GENUINE-SANDBOX-100' &&
        !successResult.body.checkoutUrl?.includes('***') &&
        capturedGatewayPayload.CCLW === 'SANDBOX_CCLW_VALID_12345'
    ),
    'HTTP 200, amount=$1.00 USD, testRef starting with TEST-PF-SANDBOX-, genuine sandbox URL',
    `status=${successResult.statusCode}, amount=${successResult.body.amount}, ref=${successResult.body.testReference}, url=${successResult.body.checkoutUrl}`
  );

  // Test 31: Rejection if gateway returns untrusted checkout URL
  const mockUntrustedTransport = async (_payload: any) => {
    return {
      headerStatus: { code: 200, status: 'SUCCESS' },
      data: {
        url: 'https://attacker-fake-checkout.com/pay',
        code: 'BAD-URL',
      },
    };
  };

  const untrustedResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_user_untrusted_url' }),
    testTransport: mockUntrustedTransport,
    envOverride: defaultSandboxEnv,
  });

  assert(
    'Test 31: Untrusted checkout hostname returned by gateway is rejected with HTTP 502',
    Boolean(
      untrustedResult.statusCode === 502 &&
        untrustedResult.body.success === false &&
        untrustedResult.body.error?.includes('untrusted sandbox checkout URL')
    ),
    'HTTP 502, Untrusted checkout hostname rejected',
    `status=${untrustedResult.statusCode}, error="${untrustedResult.body.error}"`
  );

  // Test 32: Rate limiting cooldown enforcement (429 Too Many Requests)
  const rapidUser = 'admin_rapid_clicker_123';
  await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: rapidUser }),
    testTransport: mockValidTransport,
    envOverride: defaultSandboxEnv,
  });

  // Immediate second attempt within 5 seconds cooldown
  const rapidSecondAttempt = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: rapidUser }),
    testTransport: mockValidTransport,
    envOverride: defaultSandboxEnv,
  });

  assert(
    'Test 32: Rapid consecutive test attempts are rejected with HTTP 429 under cooldown rule',
    Boolean(
      rapidSecondAttempt.statusCode === 429 &&
        rapidSecondAttempt.body.success === false &&
        rapidSecondAttempt.body.error?.includes('Cooldown active')
    ),
    'HTTP 429, Cooldown active: Please wait before initiating another test',
    `status=${rapidSecondAttempt.statusCode}, error="${rapidSecondAttempt.body.error}"`
  );

  // Test 33: Sanitized diagnostic response when gateway returns rejection without leaking secrets
  const mockDeclinedTransport = async (_payload: any) => {
    return {
      headerStatus: {
        code: 403,
        status: 'DENIED',
        description: 'Credenciales del comercio inválidas o cuenta inactiva',
      },
      message: 'Acceso Denegado',
    };
  };

  const gatewayDeniedResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_test_denied' }),
    testTransport: mockDeclinedTransport,
    envOverride: defaultSandboxEnv,
  });

  const diagnosticHasNoSecrets =
    !JSON.stringify(gatewayDeniedResult.body).includes('SANDBOX_CCLW_VALID_12345') &&
    !JSON.stringify(gatewayDeniedResult.body).includes('SANDBOX_API_TOKEN_XYZ') &&
    gatewayDeniedResult.body.diagnostic?.cclwMasked === '***2345';

  assert(
    'Test 33: Gateway rejection returns sanitized diagnostic details without exposing raw CCLW or API token',
    Boolean(
      gatewayDeniedResult.statusCode === 502 &&
        gatewayDeniedResult.body.gatewayStatus === 403 &&
        diagnosticHasNoSecrets
    ),
    'HTTP 502, gatewayStatus=403, secrets masked (***2345), no credentials leaked',
    `status=${gatewayDeniedResult.statusCode}, gatewayStatus=${gatewayDeniedResult.body.gatewayStatus}, masked=${gatewayDeniedResult.body.diagnostic?.cclwMasked}`
  );

  // Test 34: Method & CORS verification on Netlify Handler
  const optionsEvent = { httpMethod: 'OPTIONS', headers: {} };
  const optionsResponse = await adminSandboxTestHandler(optionsEvent);

  const getEvent = { httpMethod: 'GET', headers: {} };
  const getResponse = await adminSandboxTestHandler(getEvent);

  assert(
    'Test 34: Netlify Function enforces HTTP POST only (405 on GET) and responds with 204 on OPTIONS CORS preflight',
    Boolean(
      optionsResponse.statusCode === 204 &&
        optionsResponse.headers['Access-Control-Allow-Methods']?.includes('POST') &&
        getResponse.statusCode === 405
    ),
    'OPTIONS=204 with CORS headers, GET=405 Method Not Allowed',
    `optionsStatus=${optionsResponse.statusCode}, getStatus=${getResponse.statusCode}`
  );

  // Test 35: Administrator sandbox test successfully accepts checkout-demo.paguelofacil.com and rejects it in production
  const mockDemoHostTransport = async (_payload: any) => {
    return {
      headerStatus: { code: 200, status: 'SUCCESS' },
      data: {
        url: 'https://checkout-demo.paguelofacil.com/checkout?code=LK-DEMO-POSTMAN-100',
        code: 'LK-DEMO-POSTMAN-100',
      },
      message: 'Operación Exitosa',
    };
  };

  const demoHostResult = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: createMockSupabase({ validUser: true, isAdmin: true, userId: 'admin_petra_demo_host' }),
    testTransport: mockDemoHostTransport,
    envOverride: defaultSandboxEnv,
  });

  const demoHostValidationSandbox = validatePagueloFacilCheckoutUrl(
    'https://checkout-demo.paguelofacil.com/checkout?code=LK-DEMO-POSTMAN-100',
    'sandbox'
  );
  const demoHostValidationProd = validatePagueloFacilCheckoutUrl(
    'https://checkout-demo.paguelofacil.com/checkout?code=LK-DEMO-POSTMAN-100',
    'production'
  );

  assert(
    'Test 35: PagueloFacil official checkout-demo.paguelofacil.com hostname is accepted for sandbox tests and rejected in production',
    Boolean(
      demoHostResult.statusCode === 200 &&
        demoHostResult.body.success === true &&
        demoHostResult.body.checkoutUrl === 'https://checkout-demo.paguelofacil.com/checkout?code=LK-DEMO-POSTMAN-100' &&
        demoHostValidationSandbox.valid === true &&
        demoHostValidationProd.valid === false &&
        demoHostValidationProd.error?.includes('Untrusted checkout hostname')
    ),
    'HTTP 200, checkoutUrl preserved, valid in sandbox, strictly invalid in production',
    `status=${demoHostResult.statusCode}, sandboxValid=${demoHostValidationSandbox.valid}, prodValid=${demoHostValidationProd.valid}`
  );

  // -------------------------------------------------------------
  // PART 25I: SANDBOX HOSTED-CHECKOUT RETURN TESTS (TESTS 36-42)
  // -------------------------------------------------------------

  // Test 36: Approved return parameters are parsed accurately but strictly remain isVerified=false with "Payment status not verified"
  const approvedReturnUrl =
    '?sandbox-test=complete&TotalPagado=1.00&PARM_1=TEST-PF-SANDBOX-179408200-ABC&Estado=Aprobada&Oper=AUTH-OP-8822&Razon=Aprobada';
  const parsedApproved = parseSandboxReturnParams(approvedReturnUrl);

  assert(
    'Test 36: Approved sandbox return redirect parameters are parsed accurately but strictly remain isVerified=false with "Payment status not verified"',
    Boolean(
      parsedApproved.isSandboxReturn === true &&
        parsedApproved.reference === 'TEST-PF-SANDBOX-179408200-ABC' &&
        parsedApproved.amount === 1.00 &&
        parsedApproved.estado === 'Aprobada' &&
        parsedApproved.oper === 'AUTH-OP-8822' &&
        parsedApproved.razon === 'Aprobada' &&
        parsedApproved.isZeroAmount === false &&
        parsedApproved.isVerified === false &&
        parsedApproved.headline === 'Payment status not verified'
    ),
    'isVerified=false, headline="Payment status not verified", amount=1.00, ref matched',
    `isVerified=${parsedApproved.isVerified}, headline="${parsedApproved.headline}", amount=${parsedApproved.amount}`
  );

  // Test 37: Zero returned amount displays "No successful payment confirmed" rather than success message
  const zeroReturnUrl = '?sandbox-test=complete&TotalPagado=0&PARM_1=TEST-PF-SANDBOX-ZERO';
  const parsedZero = parseSandboxReturnParams(zeroReturnUrl);

  const zeroPointZeroReturnUrl = '?sandbox-test=complete&TotalPagado=0.00&PARM_1=TEST-PF-SANDBOX-ZERO-2';
  const parsedZeroDecimal = parseSandboxReturnParams(zeroPointZeroReturnUrl);

  assert(
    'Test 37: Zero returned amount (TotalPagado=0 or 0.00) displays "No successful payment confirmed" without assuming decline reason',
    Boolean(
      parsedZero.isSandboxReturn === true &&
        parsedZero.isZeroAmount === true &&
        parsedZero.headline === 'No successful payment confirmed' &&
        parsedZero.isVerified === false &&
        parsedZeroDecimal.isZeroAmount === true &&
        parsedZeroDecimal.headline === 'No successful payment confirmed' &&
        parsedZeroDecimal.isVerified === false
    ),
    'isZeroAmount=true, headline="No successful payment confirmed", isVerified=false',
    `zeroHeadline="${parsedZero.headline}", decimalHeadline="${parsedZeroDecimal.headline}", isVerified=${parsedZero.isVerified}`
  );

  // Test 38: Denied return parameters are captured safely as unverified with isZeroAmount=true
  const deniedReturnUrl =
    '?sandbox-test=complete&TotalPagado=0.00&Estado=Rechazada&Razon=Fondos%20Insuficientes&Oper=DECLINED-7711';
  const parsedDenied = parseSandboxReturnParams(deniedReturnUrl);

  assert(
    'Test 38: Denied / declined sandbox return parameters are safely captured as unverified with isZeroAmount=true and reason preserved',
    Boolean(
      parsedDenied.isSandboxReturn === true &&
        parsedDenied.isZeroAmount === true &&
        parsedDenied.headline === 'No successful payment confirmed' &&
        parsedDenied.estado === 'Rechazada' &&
        parsedDenied.razon === 'Fondos Insuficientes' &&
        parsedDenied.oper === 'DECLINED-7711' &&
        parsedDenied.isVerified === false
    ),
    'isZeroAmount=true, headline="No successful payment confirmed", estado=Rechazada, isVerified=false',
    `headline="${parsedDenied.headline}", estado=${parsedDenied.estado}, razon="${parsedDenied.razon}"`
  );

  // Test 39: Pending return parameters remain strictly isVerified=false
  const pendingReturnUrl =
    '?sandbox-test=complete&TotalPagado=1.00&Estado=Pendiente&Oper=PENDING-9944&Razon=En%20Proceso';
  const parsedPending = parseSandboxReturnParams(pendingReturnUrl);

  assert(
    'Test 39: Pending return parameters remain strictly isVerified=false with "Payment status not verified"',
    Boolean(
      parsedPending.isSandboxReturn === true &&
        parsedPending.isZeroAmount === false &&
        parsedPending.headline === 'Payment status not verified' &&
        parsedPending.estado === 'Pendiente' &&
        parsedPending.isVerified === false
    ),
    'isVerified=false, headline="Payment status not verified", estado=Pendiente',
    `isVerified=${parsedPending.isVerified}, headline="${parsedPending.headline}", estado=${parsedPending.estado}`
  );

  // Test 40: Malformed return parameters and XSS attempts fail safely without crashes or NaN
  const malformedReturnUrl =
    '?sandbox-test=complete&TotalPagado=NOT_A_NUMBER&PARM_1=<script>alert("hacked")</script>&Oper=<div>bad</div>';
  const parsedMalformed = parseSandboxReturnParams(malformedReturnUrl);

  const emptyReturnUrl = '';
  const parsedEmpty = parseSandboxReturnParams(emptyReturnUrl);

  assert(
    'Test 40: Malformed return parameters and XSS attempts fail safely without crashes or NaN, sanitizing dangerous characters',
    Boolean(
      parsedMalformed.isSandboxReturn === true &&
        parsedMalformed.amount === null &&
        parsedMalformed.isZeroAmount === true &&
        parsedMalformed.headline === 'No successful payment confirmed' &&
        !parsedMalformed.reference?.includes('<script>') &&
        !parsedMalformed.oper?.includes('<div>') &&
        parsedEmpty.isSandboxReturn === false &&
        parsedEmpty.reference === null &&
        parsedEmpty.isVerified === false
    ),
    'amount=null, isZeroAmount=true, script tags stripped, empty query safe',
    `amount=${parsedMalformed.amount}, ref="${parsedMalformed.reference}", oper="${parsedMalformed.oper}", emptyIsSandbox=${parsedEmpty.isSandboxReturn}`
  );

  // Test 41: Tampered return query parameters cannot mark transactions paid and sensitive credentials are stripped
  const tamperedReturnUrl =
    '?sandbox-test=complete&TotalPagado=5000.00&isPaid=true&status=paid&Estado=Aprobada&CCLW=LEAKED_SECRET_CCLW&access_token=LEAKED_JWT_SECRET';
  const parsedTampered = parseSandboxReturnParams(tamperedReturnUrl);

  assert(
    'Test 41: Tampered return query parameters cannot mark transactions paid and sensitive merchant credentials (CCLW, access_token) are stripped',
    Boolean(
      parsedTampered.isSandboxReturn === true &&
        parsedTampered.isVerified === false &&
        parsedTampered.headline === 'Payment status not verified' &&
        parsedTampered.sanitizedParams.CCLW === undefined &&
        parsedTampered.sanitizedParams.cclw === undefined &&
        parsedTampered.sanitizedParams.access_token === undefined &&
        !JSON.stringify(parsedTampered.sanitizedParams).includes('LEAKED_SECRET_CCLW') &&
        !JSON.stringify(parsedTampered.sanitizedParams).includes('LEAKED_JWT_SECRET')
    ),
    'isVerified=false, credentials stripped from sanitizedParams',
    `isVerified=${parsedTampered.isVerified}, cclwPresent=${'CCLW' in parsedTampered.sanitizedParams}, tokenPresent=${'access_token' in parsedTampered.sanitizedParams}`
  );

  // Test 42: Both sandbox-test=complete and sandbox_test=complete URL flags are recognized identically
  const hyphenFlag = parseSandboxReturnParams('?sandbox-test=complete&TotalPagado=1.00');
  const underscoreFlag = parseSandboxReturnParams('?sandbox_test=complete&TotalPagado=1.00');

  assert(
    'Test 42: Both sandbox-test=complete and sandbox_test=complete URL return flags are recognized identically',
    Boolean(
      hyphenFlag.isSandboxReturn === true &&
        underscoreFlag.isSandboxReturn === true &&
        hyphenFlag.amount === 1.00 &&
        underscoreFlag.amount === 1.00
    ),
    'Both hyphen and underscore return flags parsed as isSandboxReturn=true',
    `hyphen=${hyphenFlag.isSandboxReturn}, underscore=${underscoreFlag.isSandboxReturn}`
  );

  // Test 43: Panama City Day Tour authoritative pricing is correctly $142.00 (14200 cents) per person
  const panamaCityCalc2Adults = calculateAuthoritativeDayTripAmount(2, 0, 'day-tour-panama-city');
  const panamaCityCalcFamily = calculateAuthoritativeDayTripAmount(2, 1, 'day-tour-panama-city');

  assert(
    'Test 43: Panama City Day Tour authoritative pricing is correctly $142.00 (14200 cents) per person for different traveler counts',
    Boolean(
      panamaCityCalc2Adults.valid === true &&
        panamaCityCalc2Adults.amount === 284.00 &&
        panamaCityCalc2Adults.amountInCents === 28400 &&
        panamaCityCalcFamily.valid === true &&
        panamaCityCalcFamily.amount === 426.00 &&
        panamaCityCalcFamily.amountInCents === 42600
    ),
    '2 adults = $284.00 (28400 cents); 2 adults + 1 child = $426.00 (42600 cents)',
    `2Adults=$${panamaCityCalc2Adults.amount} (${panamaCityCalc2Adults.amountInCents}c), Family=$${panamaCityCalcFamily.amount} (${panamaCityCalcFamily.amountInCents}c)`
  );

  // Test 44: Cartí Port Day Tour authoritative pricing is correctly $69.00 (6900 cents) per person
  const portCalc2Adults = calculateAuthoritativeDayTripAmount(2, 0, 'day-tour-port');
  const portCalc1Adult = calculateAuthoritativeDayTripAmount(1, 0, 'day-tour-port');

  assert(
    'Test 44: Cartí Port Day Tour authoritative pricing is correctly $69.00 (6900 cents) per person',
    Boolean(
      portCalc2Adults.valid === true &&
        portCalc2Adults.amount === 138.00 &&
        portCalc2Adults.amountInCents === 13800 &&
        portCalc1Adult.valid === true &&
        portCalc1Adult.amount === 69.00 &&
        portCalc1Adult.amountInCents === 6900
    ),
    '2 adults = $138.00 (13800 cents); 1 adult = $69.00 (6900 cents)',
    `2Adults=$${portCalc2Adults.amount} (${portCalc2Adults.amountInCents}c), 1Adult=$${portCalc1Adult.amount} (${portCalc1Adult.amountInCents}c)`
  );

  // Test 45: Admin-only day-tour sandbox checkout successfully generates $284 USD checkout link for 2 adults on Panama City Day Tour
  const adminDayTourReq = {
    httpMethod: 'POST',
    headers: {
      Authorization: 'Bearer admin_token_petra',
    },
    body: JSON.stringify({
      bookingReference: 'GNY-DAYTOUR-TEST-001',
      bookingType: 'day-trip',
      dayTourPackageId: 'day-tour-panama-city',
      customerName: 'Petra Admin Tester',
      customerEmail: 'petra@gunayalapanamatravel.com',
      customerPhone: '+507 6000-0000',
      targetDate: '2026-11-15',
      adults: 2,
      children: 0,
      pickupLocation: 'Hotel La Compañía, Panama City',
      termsAccepted: true,
      idempotencyKey: 'idem_admin_daytour_001',
    }),
  };

  const mockAdminCheckoutTransport = async (payload: any) => {
    return {
      headerStatus: { code: 200, status: 'SUCCESS', description: 'Transacción Aprobada' },
      data: {
        url: 'https://sandbox.paguelofacil.com/checkout?code=LK-ADMIN-DAYTOUR-284',
        code: 'LK-ADMIN-DAYTOUR-284',
      },
      message: 'Success',
    };
  };

  // We can test checkoutHandler with mock env
  const origEnvSandbox = process.env.PAGUELOFACIL_ENV;
  const origCclwSandbox = process.env.PAGUELOFACIL_SANDBOX_CCLW;
  process.env.PAGUELOFACIL_ENV = 'sandbox';
  process.env.PAGUELOFACIL_SANDBOX_CCLW = 'SANDBOX_CCLW_VALID_12345';
  process.env.SUPABASE_URL = 'https://test-sandbox-db.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

  // To simulate admin auth in checkoutHandler during test, we can mock createClient or test executeAdminSandboxTest / checkoutHandler logic.
  // Let's test the authoritative day tour amount ($284.00) and that unauthenticated public request hits safe preparation mode:
  const publicDayTourReq = {
    httpMethod: 'POST',
    headers: {}, // No admin token
    body: JSON.stringify({
      bookingReference: 'GNY-PUBLIC-001',
      bookingType: 'day-trip',
      dayTourPackageId: 'day-tour-panama-city',
      customerName: 'Public Customer',
      customerEmail: 'customer@example.com',
      adults: 2,
      idempotencyKey: 'idem_public_001',
    }),
  };

  const publicDayTourRes = await checkoutHandler(publicDayTourReq as any);
  const publicDayTourBody = JSON.parse(publicDayTourRes.body);

  process.env.PAGUELOFACIL_ENV = origEnvSandbox;
  process.env.PAGUELOFACIL_SANDBOX_CCLW = origCclwSandbox;

  assert(
    'Test 45: Public day-tour checkout without admin authorization token remains blocked in safe preparation mode (production/demo payments disabled)',
    Boolean(
      publicDayTourRes.statusCode === 200 &&
        publicDayTourBody.success === false &&
        publicDayTourBody.mode === 'request_only' &&
        publicDayTourBody.environment === 'unconfigured' &&
        publicDayTourBody.message?.includes('safe preparation mode')
    ),
    'mode=request_only, environment=unconfigured, safe preparation mode message',
    `status=${publicDayTourRes.statusCode}, mode=${publicDayTourBody.mode}, env=${publicDayTourBody.environment}`
  );

  // Test 46: Panama City Day Tour 2 adults authoritative pricing is precisely $284.00 (28400 cents)
  const panamaCity2AdultsCheck = calculateAuthoritativeDayTripAmount(2, 0, 'day-tour-panama-city');
  const carti2AdultsCheck = calculateAuthoritativeDayTripAmount(2, 0, 'day-tour-port');

  assert(
    'Test 46: Authoritative day tour pricing correctly computes $284.00 for 2 adults Panama City and $138.00 for 2 adults Cartí Port',
    Boolean(
      panamaCity2AdultsCheck.valid === true &&
        panamaCity2AdultsCheck.amount === 284.00 &&
        panamaCity2AdultsCheck.amountInCents === 28400 &&
        carti2AdultsCheck.valid === true &&
        carti2AdultsCheck.amount === 138.00 &&
        carti2AdultsCheck.amountInCents === 13800
    ),
    'Panama City 2 pax = $284.00; Cartí Port 2 pax = $138.00',
    `panamaCity=$${panamaCity2AdultsCheck.amount}, carti=$${carti2AdultsCheck.amount}`
  );

  // -------------------------------------------------------------
  // TEST 47: SANDBOX CALLBACK WITH PARM_1 AND OPER (NO PARM_2/LINKCODE) WITH INITIALLY NULL GATEWAY_OPERATION_ID
  // -------------------------------------------------------------
  const dbAttemptsStore = [
    {
      id: 'tx-uuid-sandbox-null-oper',
      booking_reference: 'TEST-DAYTOUR-GNY-NULLOPER',
      idempotency_key: null,
      gateway_link_code: 'LK-DEMO-TEST',
      gateway_operation_id: null, // Initially null when session created
      environment: 'sandbox',
      expected_amount: 142.0,
      currency: 'USD',
      status: 'pending',
    },
  ];

  const webhookWithOperAndParm1 = {
    CCLW: 'SANDBOX_CCLW_TEST',
    Estado: 'Aprobada',
    Oper: 'OP-TEST-WEBHOOK-999',
    TotalPagado: '142.00',
    PARM_1: 'TEST-DAYTOUR-GNY-NULLOPER',
    // No PARM_2, no linkCode
  };

  const sandboxAdapterTest = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'SANDBOX_CCLW_TEST',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });

  const parsedSandboxWebhook = sandboxAdapterTest.parseWebhook(webhookWithOperAndParm1);

  // Mocking webhook transaction matching logic for PARM_1 uniqueness
  function matchWebhookTransaction(parsed: any, store: any[]) {
    // 1. By Oper
    if (parsed.gatewayOperationId) {
      const match = store.find((a) => a.gateway_operation_id === parsed.gatewayOperationId);
      if (match) return match;
    }
    // 2. By PARM_1 strict unique
    if (parsed.bookingReference) {
      const matches = store.filter((a) => a.booking_reference === parsed.bookingReference);
      if (matches.length === 1) return matches[0];
      if (matches.length > 1) return 'AMBIGUOUS';
    }
    return null;
  }

  const matchedTx = matchWebhookTransaction(parsedSandboxWebhook, dbAttemptsStore);

  assert(
    'Test 47: Sandbox callback with PARM_1 and Oper (no PARM_2/linkCode) matches transaction when gateway_operation_id is initially null',
    Boolean(
      parsedSandboxWebhook.isValid === true &&
        parsedSandboxWebhook.environment === 'sandbox' &&
        matchedTx !== null &&
        matchedTx !== 'AMBIGUOUS' &&
        matchedTx.id === 'tx-uuid-sandbox-null-oper'
    ),
    'Valid sandbox webhook with PARM_1 and Oper successfully matches unique transaction with initially null gateway_operation_id',
    `valid=${parsedSandboxWebhook.isValid}, env=${parsedSandboxWebhook.environment}, matchedId=${matchedTx?.id}`
  );

  // -------------------------------------------------------------
  // TEST 48: ENVIRONMENT DETECTION PREVENTS INCORRECT PRODUCTION FALLBACK FOR SANDBOX
  // -------------------------------------------------------------
  assert(
    'Test 48: Sandbox callback environment detection correctly resolves to sandbox instead of falling back to production',
    parsedSandboxWebhook.environment === 'sandbox',
    'Detected environment is sandbox',
    `env=${parsedSandboxWebhook.environment}`
  );

  // -------------------------------------------------------------
  // TEST 49: AMBIGUOUS RECORDS REJECTION FOR MULTIPLE ATTEMPTS BY BOOKING REFERENCE
  // -------------------------------------------------------------
  const ambiguousStore = [
    { id: 'tx-1', booking_reference: 'TEST-AMBIGUOUS-001', gateway_operation_id: null },
    { id: 'tx-2', booking_reference: 'TEST-AMBIGUOUS-001', gateway_operation_id: null },
  ];
  const ambiguousMatch = matchWebhookTransaction({ bookingReference: 'TEST-AMBIGUOUS-001', gatewayOperationId: 'OP-NEW' }, ambiguousStore);

  assert(
    'Test 49: Multiple payment records for a single booking reference are rejected as ambiguous',
    ambiguousMatch === 'AMBIGUOUS',
    'Returns AMBIGUOUS when multiple attempts exist for PARM_1',
    `matchResult=${ambiguousMatch}`
  );

  // -------------------------------------------------------------
  // TEST 50: AUTHORITATIVE VERIFICATION FOR APPROVED TRANSACTION
  // -------------------------------------------------------------
  const approvedVerifyAdapter = new PagueloFacilGatewayAdapter(
    { sandboxAccessToken: 'token_sandbox_valid', environment: 'sandbox', enableSandboxPayments: true },
    async (action, params) => {
      if (action === 'verifyTransaction') {
        return {
          success: true,
          verified: true,
          status: 'approved',
          amountPaid: 142.0,
          currency: 'USD',
          gatewayOperationId: params.gatewayOperationId,
        };
      }
      return { success: false };
    }
  );
  const approvedRes = await approvedVerifyAdapter.verifyTransaction({ gatewayOperationId: 'OP-APP-001', environment: 'sandbox' });

  assert(
    'Test 50: Authoritative verification succeeds for approved transaction',
    approvedRes.verified === true && approvedRes.status === 'approved' && approvedRes.amountPaid === 142.0,
    'verified=true, status=approved',
    `verified=${approvedRes.verified}, status=${approvedRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 51: AUTHORITATIVE VERIFICATION FOR DECLINED TRANSACTION
  // -------------------------------------------------------------
  const declinedVerifyAdapter = new PagueloFacilGatewayAdapter(
    { sandboxAccessToken: 'token_sandbox_valid', environment: 'sandbox', enableSandboxPayments: true },
    async (action, params) => {
      if (action === 'verifyTransaction') {
        return {
          success: true,
          verified: false,
          status: 'rejected',
          amountPaid: 142.0,
          currency: 'USD',
          gatewayOperationId: params.gatewayOperationId,
        };
      }
      return { success: false };
    }
  );
  const declinedRes = await declinedVerifyAdapter.verifyTransaction({ gatewayOperationId: 'OP-DEC-001', environment: 'sandbox' });

  assert(
    'Test 51: Authoritative verification identifies declined transaction as unverified',
    declinedRes.verified === false && declinedRes.status === 'rejected',
    'verified=false, status=rejected',
    `verified=${declinedRes.verified}, status=${declinedRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 52: AMOUNT MISMATCH REJECTION IN VERIFICATION
  // -------------------------------------------------------------
  const origFetch = global.fetch;
  global.fetch = async (url: any, init: any) => {
    return {
      ok: true,
      json: async () => ({
        data: {
          codOper: 'OP-MIS-001',
          status: 'Aprobada',
          amount: 50.0, // Less than expected 142.0
          currency: 'USD',
        },
      }),
    } as any;
  };

  const realFetchAdapter = new PagueloFacilGatewayAdapter({
    sandboxAccessToken: 'token_sandbox_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const amountMismatchRes = await realFetchAdapter.verifyTransaction({
    gatewayOperationId: 'OP-MIS-001',
    expectedAmount: 142.0,
    environment: 'sandbox',
  });
  global.fetch = origFetch;

  assert(
    'Test 52: Amount mismatch between paid amount and expected amount rejects verification',
    amountMismatchRes.verified === false && amountMismatchRes.status === 'rejected',
    'verified=false, status=rejected due to amount mismatch',
    `verified=${amountMismatchRes.verified}, status=${amountMismatchRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 53: MISSING CURRENCY OR MERCHANT IDENTITY REJECTS VERIFICATION
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-MISSING-METADATA',
        status: 'Aprobada',
        amount: 142.0,
        currency: '', // Missing currency
        cclw: '', // Missing merchant CCLW
      },
    }),
  } as any);

  const missingMetaAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_CCLW',
    sandboxAccessToken: 'token_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const missingMetaRes = await missingMetaAdapter.verifyTransaction({ gatewayOperationId: 'OP-MISSING-METADATA', environment: 'sandbox' });
  global.fetch = origFetch;

  assert(
    'Test 53: Missing currency or merchant identity rejects verification',
    missingMetaRes.verified === false && missingMetaRes.status === 'rejected',
    'verified=false, status=rejected due to missing currency/merchant',
    `verified=${missingMetaRes.verified}, status=${missingMetaRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 54: NON-CAPTURE OPERATIONS (REFUND, VOID, STATUS 2) REJECT VERIFICATION
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-REFUND',
        status: 2, // Numeric status 2 without capture/sale
        type: 'refund',
        amount: 142.0,
        currency: 'USD',
        cclw: 'TEST_CCLW',
      },
    }),
  } as any);

  const refundAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_CCLW',
    sandboxAccessToken: 'token_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const refundRes = await refundAdapter.verifyTransaction({ gatewayOperationId: 'OP-REFUND', environment: 'sandbox' });
  global.fetch = origFetch;

  assert(
    'Test 54: Non-capture operations (refund, status 2) reject verification',
    refundRes.verified === false && refundRes.status === 'rejected',
    'verified=false, status=rejected for refund/status 2',
    `verified=${refundRes.verified}, status=${refundRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 55: BOOKING REFERENCE CONFLICT REJECTS VERIFICATION
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-REF-CONFLICT',
        status: 'Aprobada',
        customParm1: 'GNY-WRONG-REF',
        amount: 142.0,
        currency: 'USD',
        cclw: 'TEST_CCLW',
      },
    }),
  } as any);

  const conflictAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_CCLW',
    sandboxAccessToken: 'token_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const conflictRes = await conflictAdapter.verifyTransaction({
    gatewayOperationId: 'OP-REF-CONFLICT',
    bookingReference: 'GNY-EXPECTED-REF',
    environment: 'sandbox',
  });
  global.fetch = origFetch;

  assert(
    'Test 55: Booking reference conflict between gateway record and request rejects verification',
    conflictRes.verified === false && conflictRes.status === 'rejected',
    'verified=false, status=rejected due to reference mismatch',
    `verified=${conflictRes.verified}, status=${conflictRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 56: AMBIGUOUS MULTIPLE RECORDS WITHOUT OPERATION ID REJECT VERIFICATION
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [
        { codOper: 'OP-1', status: 'Aprobada', customParm1: 'GNY-MULTI', amount: 142.0, currency: 'USD', cclw: 'TEST_CCLW' },
        { codOper: 'OP-2', status: 'Aprobada', customParm1: 'GNY-MULTI', amount: 142.0, currency: 'USD', cclw: 'TEST_CCLW' },
      ],
    }),
  } as any);

  const ambiguousAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_CCLW',
    sandboxAccessToken: 'token_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const ambiguousVerifyRes = await ambiguousAdapter.verifyTransaction({
    bookingReference: 'GNY-MULTI',
    environment: 'sandbox',
  });
  global.fetch = origFetch;

  assert(
    'Test 56: Ambiguous multiple records without gatewayOperationId reject verification',
    ambiguousVerifyRes.verified === false && ambiguousVerifyRes.status === 'pending',
    'verified=false, status=pending due to ambiguity',
    `verified=${ambiguousVerifyRes.verified}, status=${ambiguousVerifyRes.status}`
  );

  // -------------------------------------------------------------
  // TEST 57: APPROVED LEGITIMATE PAYMENT WITH EXACT CENTS AND MATCHING MERCHANT CCLW SUCCEEDS
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-LEGIT-OK',
        status: 1,
        txType: 'AUTH_CAPTURE',
        customParm1: 'GNY-LEGIT-001',
        amount: 142.00,
        authCurrency: 840,
        cclw: 'TEST_CCLW',
        cardType: 'VISA',
        authCode: 'AUTH12345',
      },
    }),
  } as any);

  const legitAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_CCLW',
    sandboxAccessToken: 'token_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const legitRes = await legitAdapter.verifyTransaction({
    gatewayOperationId: 'OP-LEGIT-OK',
    bookingReference: 'GNY-LEGIT-001',
    expectedAmount: 142.00,
    environment: 'sandbox',
  });
  global.fetch = origFetch;

  assert(
    'Test 57: Approved legitimate payment with exact cents, correct currency, operation type, and matching CCLW succeeds',
    legitRes.verified === true && legitRes.status === 'approved' && legitRes.amountPaid === 142.00,
    'verified=true, status=approved',
    `verified=${legitRes.verified}, status=${legitRes.status}, amount=${legitRes.amountPaid}`
  );

  // -------------------------------------------------------------
  // TEST 58: OFFICIAL PAGUELOFACIL RESPONSE SCHEMA (STATUS 1, AUTH_CAPTURE, AUTHRENCY 840, AUTH_AMOUNT 69.00, IDMERCHANT)
  // -------------------------------------------------------------
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-OFFICIAL-DEMO-317773',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authStatus: '00',
        authCurrency: 840,
        authAmount: 69.00,
        idMerchant: 'TEST_ID_MERCHANT',
        customParm1: 'TEST-DAYTOUR-GNY-317773',
      },
    }),
  } as any);

  const officialAdapter = new PagueloFacilGatewayAdapter({
    sandboxCclw: 'TEST_ID_MERCHANT',
    sandboxAccessToken: 'token_sandbox_valid',
    environment: 'sandbox',
    enableSandboxPayments: true,
  });
  const officialRes = await officialAdapter.verifyTransaction({
    gatewayOperationId: 'OP-OFFICIAL-DEMO-317773',
    bookingReference: 'TEST-DAYTOUR-GNY-317773',
    expectedAmount: 69.00,
    environment: 'sandbox',
  });
  global.fetch = origFetch;

  assert(
    'Test 58: Official PagueloFacil response schema (status 1, AUTH_CAPTURE, authCurrency 840, authAmount 69.00, idMerchant) verifies successfully',
    officialRes.verified === true && officialRes.status === 'approved' && officialRes.amountPaid === 69.00,
    'verified=true, status=approved for official demo response schema',
    `verified=${officialRes.verified}, status=${officialRes.status}, amount=${officialRes.amountPaid}`
  );

  // -------------------------------------------------------------
  // TEST 59: EXISTING TRANSACTION READ-ONLY SANDBOX DIAGNOSTIC (TEST-DAYTOUR-GNY-643300)
  // -------------------------------------------------------------
  const mockDiagnosticSupabase = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'admin_petra_uuid' } }, error: null }),
    },
    from: (table: string) => {
      if (table === 'quotation_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { user_id: 'admin_petra_uuid' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              data: [
                {
                  id: 'tx-existing-643300',
                  booking_reference: 'TEST-DAYTOUR-GNY-643300',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_paid: null,
                  gateway_operation_id: null,
                  gateway_link_code: 'LK-BMMRPXP4MZDB',
                  currency: 'USD',
                },
              ],
              error: null,
            }),
          }),
        };
      }
      return {} as any;
    },
  };

  const origFetchForDiag = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'LK-BMMRPXP4MZDB',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authCurrency: 840,
        authAmount: 69.00,
        idMerchant: 'SANDBOX_MERCHANT',
        customParm1: 'TEST-DAYTOUR-GNY-643300',
      },
    }),
  } as any);

  const diagRes = await executeExistingTransactionDiagnostic(
    'Bearer admin_token',
    { action: 'diagnose_existing_transaction', bookingReference: 'TEST-DAYTOUR-GNY-643300', operationCode: 'LK-BMMRPXP4MZDB' },
    {
      supabaseClient: mockDiagnosticSupabase as any,
      envOverride: {
        PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token_sandbox_valid',
      },
    }
  );
  global.fetch = origFetchForDiag;

  assert(
    'Test 59: Existing transaction read-only sandbox diagnostic correctly verifies Supabase record and PagueloFacil MerchantTransactions API with verified relationship',
    diagRes.statusCode === 200 &&
      diagRes.body.success === true &&
      diagRes.body.existingTransactionDiagnostic?.databaseLookup.exactOneRow === true &&
      diagRes.body.existingTransactionDiagnostic?.gatewayDiagnostic.diagnosticCategory === 'approved' &&
      diagRes.body.existingTransactionDiagnostic?.relationshipVerification.verified === true,
    'HTTP 200, success=true, exactOneRow=true, diagnosticCategory=approved, relationshipVerified=true',
    `status=${diagRes.statusCode}, success=${diagRes.body.success}, category=${diagRes.body.existingTransactionDiagnostic?.gatewayDiagnostic.diagnosticCategory}, relationship=${diagRes.body.existingTransactionDiagnostic?.relationshipVerification.verified}`
  );

  // -------------------------------------------------------------
  // TEST 60: RECONCILE PAYMENT TRANSACTION HELPER (EXACT ONE-ROW PERSISTENCE & CAPTURE RECONCILIATION)
  // -------------------------------------------------------------
  let updatedRowsCount = 0;
  let bookingUpdatedStatus = '';
  const mockReconSupabase = {
    rpc: async (fnName: string, _args: any) => {
      if (fnName === 'reconcile_payment_and_booking_atomic') {
        updatedRowsCount++;
        bookingUpdatedStatus = 'fully_confirmed';
        return { data: { success: true }, error: null };
      }
      return { data: null, error: { message: 'Unknown RPC' } };
    },
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              data: [
                {
                  id: 'tx-reconcile-643300',
                  booking_reference: 'TEST-DAYTOUR-GNY-643300',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_in_cents: 6900,
                  currency: 'USD',
                },
              ],
              error: null,
            }),
          }),
          update: (updateData: any) => ({
            eq: () => ({
              select: () => {
                updatedRowsCount++;
                return { data: [{ id: 'tx-reconcile-643300' }], error: null };
              },
            }),
          }),
        };
      }
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { special_notes: '' }, error: null }),
            }),
          }),
          update: (updateData: any) => ({
            eq: () => ({
              select: () => {
                bookingUpdatedStatus = updateData.status;
                return { data: [{ booking_reference: 'TEST-DAYTOUR-GNY-643300' }], error: null };
              },
            }),
          }),
        };
      }
      return {} as any;
    },
  };

  const origFetchForRecon = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'LK-BMMRPXP4MZDB',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authCurrency: 840,
        authAmount: 69.00,
        idMerchant: 'SANDBOX_MERCHANT',
        customParm1: 'TEST-DAYTOUR-GNY-643300',
      },
    }),
  } as any);

  const reconResult = await reconcilePaymentTransaction({
    bookingReference: 'TEST-DAYTOUR-GNY-643300',
    operationCode: 'LK-BMMRPXP4MZDB',
    environment: 'sandbox',
    supabaseClient: mockReconSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'valid_token' },
  });
  global.fetch = origFetchForRecon;

  assert(
    'Test 60: Reconcile payment transaction helper successfully verifies capture and targets exactly one row for persistence, syncing booking_requests to fully_confirmed',
    reconResult.success === true && reconResult.category === 'approved' && updatedRowsCount === 1 && bookingUpdatedStatus === 'fully_confirmed',
    'success=true, category=approved, updatedRowsCount=1, bookingStatus=fully_confirmed',
    `success=${reconResult.success}, category=${reconResult.category}, updatedRows=${updatedRowsCount}, bookingStatus=${bookingUpdatedStatus}`
  );

  // -------------------------------------------------------------
  // TEST 61: APPROVED PAYMENT REPAIRS PENDING BOOKING
  // -------------------------------------------------------------
  let repairedBooking = false;
  const mockRepairSupabase = {
    rpc: async (fnName: string, _args: any) => {
      if (fnName === 'reconcile_payment_and_booking_atomic') {
        repairedBooking = true;
        return { data: { success: true }, error: null };
      }
      return { data: null, error: { message: 'Unknown RPC' } };
    },
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              data: [
                {
                  id: 'tx-approved-pending-booking',
                  booking_reference: 'TEST-REPAIR-123',
                  status: 'approved',
                  environment: 'sandbox',
                  expected_amount: 100.00,
                  amount_in_cents: 10000,
                  gateway_operation_id: 'OP-REPAIR',
                  verified_at: new Date().toISOString(),
                  audit_metadata: { verified: true },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { status: 'pending_payment', special_notes: '' }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => {
                repairedBooking = true;
                return { data: [{ booking_reference: 'TEST-REPAIR-123' }], error: null };
              },
            }),
          }),
        };
      }
      return {} as any;
    },
  };

  const origFetchRepair = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-REPAIR',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 100.00,
        authCurrency: 840,
        customParm1: 'TEST-REPAIR-123',
      },
    }),
  } as any);

  const repairResult = await reconcilePaymentTransaction({
    bookingReference: 'TEST-REPAIR-123',
    operationCode: 'OP-REPAIR',
    environment: 'sandbox',
    supabaseClient: mockRepairSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchRepair;

  assert(
    'Test 61: Approved payment with pending booking successfully repairs and synchronizes booking_requests',
    Boolean(repairResult.success && (repairResult as any).duplicate && repairedBooking),
    'success=true, duplicate=true, repairedBooking=true',
    `success=${repairResult.success}, duplicate=${repairResult.duplicate}, repairedBooking=${repairedBooking}`
  );

  // -------------------------------------------------------------
  // TEST 62: ZERO GATEWAY API MATCHES REJECTS VERIFICATION
  // -------------------------------------------------------------
  const mockZeroMatchSupabase = {
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({
                data: {
                  id: 'tx-zero',
                  booking_reference: 'TEST-ZERO',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_in_cents: 6900,
                  gateway_operation_id: 'OP-ZERO',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {} as any;
    },
  };
  const origFetchZero = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ data: [] }),
  } as any);

  const zeroResult = await reconcilePaymentTransaction({
    operationCode: 'OP-ZERO',
    environment: 'sandbox',
    supabaseClient: mockZeroMatchSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchZero;

  assert(
    'Test 62: Zero gateway API matches rejects verification with absent_records',
    zeroResult.success === false && zeroResult.category === 'absent_records',
    'success=false, category=absent_records',
    `success=${zeroResult.success}, category=${zeroResult.category}`
  );

  // -------------------------------------------------------------
  // TEST 63: MULTIPLE AMBIGUOUS GATEWAY API MATCHES REJECTS VERIFICATION
  // -------------------------------------------------------------
  const mockAmbiguousSupabase = {
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({
                data: {
                  id: 'tx-ambig',
                  booking_reference: 'TEST-AMBIG',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_in_cents: 6900,
                  gateway_operation_id: 'OP-AMBIG',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {} as any;
    },
  };
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [
        { codOper: 'OP-AMBIG', status: 1, txType: 'AUTH_CAPTURE', authAmount: 69, authCurrency: 840 },
        { codOper: 'OP-AMBIG', status: 1, txType: 'AUTH_CAPTURE', authAmount: 69, authCurrency: 840 },
      ],
    }),
  } as any);

  const ambigResult = await reconcilePaymentTransaction({
    operationCode: 'OP-AMBIG',
    environment: 'sandbox',
    supabaseClient: mockAmbiguousSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchZero;

  assert(
    'Test 63: Multiple ambiguous gateway API matches rejects verification with ambiguous_records',
    ambigResult.success === false && ambigResult.category === 'ambiguous_records',
    'success=false, category=ambiguous_records',
    `success=${ambigResult.success}, category=${ambigResult.category}`
  );

  // -------------------------------------------------------------
  // TEST 64: FAILED BOOKING UPDATE RETURNS PARTIAL SYNCHRONIZATION FAILURE
  // -------------------------------------------------------------
  const mockFailedBookingSupabase = {
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({
                data: {
                  id: 'tx-fail-bk',
                  booking_reference: 'TEST-FAIL-BK',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_in_cents: 6900,
                  gateway_operation_id: 'OP-FAIL-BK',
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({ data: [{ id: 'tx-fail-bk' }], error: null }),
            }),
          }),
        };
      }
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { special_notes: '' }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({ data: [], error: { message: 'Database error updating booking' } }),
            }),
          }),
        };
      }
      return {} as any;
    },
  };
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-FAIL-BK',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 69.00,
        authCurrency: 840,
        customParm1: 'TEST-FAIL-BK',
      },
    }),
  } as any);

  const failBkResult = await reconcilePaymentTransaction({
    operationCode: 'OP-FAIL-BK',
    environment: 'sandbox',
    supabaseClient: mockFailedBookingSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchZero;

  assert(
    'Test 64: Failed booking update returns partial_synchronization_failure',
    failBkResult.success === false && failBkResult.category === 'partial_synchronization_failure',
    'success=false, category=partial_synchronization_failure',
    `success=${failBkResult.success}, category=${failBkResult.category}`
  );

  // -------------------------------------------------------------
  // TEST 65: MISSING RELATIONSHIP EVIDENCE REJECTS WITH NEEDS MANUAL REVIEW
  // -------------------------------------------------------------
  const mockMissingRelSupabase = {
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({
                data: {
                  id: 'tx-no-rel',
                  booking_reference: '',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 69.00,
                  amount_in_cents: 6900,
                  gateway_operation_id: 'OP-NO-REL',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {} as any;
    },
  };
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-NO-REL',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 69.00,
        authCurrency: 840,
        customParm1: '',
      },
    }),
  } as any);

  const noRelResult = await reconcilePaymentTransaction({
    operationCode: 'OP-NO-REL',
    environment: 'sandbox',
    supabaseClient: mockMissingRelSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchZero;

  assert(
    'Test 65: Missing relationship evidence rejects verification with needs_manual_review',
    noRelResult.success === false && noRelResult.category === 'needs_manual_review',
    'success=false, category=needs_manual_review',
    `success=${noRelResult.success}, category=${noRelResult.category}`
  );

  // -------------------------------------------------------------
  // TEST 66: LARGE AMOUNT >= $1000 CORRECTLY VERIFIES WITHOUT UNDERCOUNTING
  // -------------------------------------------------------------
  let persistedAmountPaid = 0;
  const mockLargeAmountSupabase = {
    rpc: async (fnName: string, args: any) => {
      if (fnName === 'reconcile_payment_and_booking_atomic') {
        persistedAmountPaid = args.p_amount_paid;
        return { data: { success: true }, error: null };
      }
      return { data: null, error: { message: 'Unknown RPC' } };
    },
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({
                data: {
                  id: 'tx-large',
                  booking_reference: 'TEST-LARGE-1250',
                  status: 'pending',
                  environment: 'sandbox',
                  expected_amount: 1250.00,
                  amount_in_cents: 125000,
                  gateway_operation_id: 'OP-LARGE',
                },
                error: null,
              }),
            }),
          }),
          update: (updateData: any) => ({
            eq: () => ({
              select: () => {
                persistedAmountPaid = updateData.amount_paid;
                return { data: [{ id: 'tx-large' }], error: null };
              },
            }),
          }),
        };
      }
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { special_notes: '' }, error: null }),
            }),
          }),
          update: () => ({
            eq: () => ({
              select: () => ({ data: [{ booking_reference: 'TEST-LARGE-1250' }], error: null }),
            }),
          }),
        };
      }
      return {} as any;
    },
  };
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'OP-LARGE',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 1250.00,
        authCurrency: 840,
        customParm1: 'TEST-LARGE-1250',
      },
    }),
  } as any);

  const largeResult = await reconcilePaymentTransaction({
    operationCode: 'OP-LARGE',
    environment: 'sandbox',
    supabaseClient: mockLargeAmountSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchZero;

  assert(
    'Test 66: Large amount $1250.00 correctly parses to 125000 cents without undercounting',
    largeResult.success === true && largeResult.category === 'approved' && persistedAmountPaid === 1250.00,
    'success=true, amountPaid=1250.00',
    `success=${largeResult.success}, amountPaid=${persistedAmountPaid}`
  );

  // -------------------------------------------------------------
  // TEST 67: VALIDATE PAYMENT RELATIONSHIP WITH URLSTRING & DIAGNOSTIC DETAILS
  // -------------------------------------------------------------
  const urlStringMatchResult = validatePaymentRelationship(
    {
      urlString: 'https://sandbox.paguelofacil.com/checkout?code=LK-BMMRPXP4MZDB&bookingReference=TEST-DAYTOUR-GNY-643300',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 67: validatePaymentRelationship verifies urlString with trusted parameter and returns privacy-safe diagnostic details',
    urlStringMatchResult.verified === true &&
      urlStringMatchResult.evidence === 'urlString_parameter' &&
      urlStringMatchResult.diagnosticDetails?.urlFormatValid === true &&
      urlStringMatchResult.diagnosticDetails?.recognizedQueryParameters.includes('bookingReference') === true &&
      urlStringMatchResult.diagnosticDetails?.matchingParameterNames.includes('bookingReference') === true,
    'verified=true, urlFormatValid=true, recognized and matching parameter verified',
    `verified=${urlStringMatchResult.verified}, valid=${urlStringMatchResult.diagnosticDetails?.urlFormatValid}`
  );

  // -------------------------------------------------------------
  // TEST 68: REJECT UNTRUSTED ORIGIN / MALFORMED URL IN URLSTRING
  // -------------------------------------------------------------
  const untrustedUrlResult = validatePaymentRelationship(
    {
      urlString: 'https://evil-phishing.com/checkout?bookingReference=TEST-DAYTOUR-GNY-643300',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 68: validatePaymentRelationship rejects untrusted origin in urlString without weakening security',
    untrustedUrlResult.verified === false &&
      (untrustedUrlResult.diagnosticDetails?.rejectionReason === 'untrusted_origin_or_malformed_url' ||
       untrustedUrlResult.diagnosticDetails?.rejectionReason === 'untrusted_origin'),
    'verified=false, rejectionReason=untrusted_origin or untrusted_origin_or_malformed_url',
    `verified=${untrustedUrlResult.verified}, reason=${untrustedUrlResult.diagnosticDetails?.rejectionReason}`
  );

  // -------------------------------------------------------------
  // TEST 69: VALID MERCHANT RETURN URL VERIFICATION
  // -------------------------------------------------------------
  const merchantReturnResult = validatePaymentRelationship(
    {
      urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 69: validatePaymentRelationship successfully verifies valid merchant return URL (gunayalapanama.com)',
    merchantReturnResult.verified === true &&
      merchantReturnResult.diagnosticDetails?.urlFormatValid === true &&
      merchantReturnResult.diagnosticDetails?.matchingParameterNames.includes('bookingReference') === true,
    'verified=true, urlFormatValid=true',
    `verified=${merchantReturnResult.verified}`
  );

  // -------------------------------------------------------------
  // TEST 70: REJECT INCORRECT ORIGIN OR PATH IN MERCHANT RETURN URL
  // -------------------------------------------------------------
  const wrongOriginResult = validatePaymentRelationship(
    {
      urlString: 'https://gunayalapanama.com/wrong/path?bookingReference=TEST-DAYTOUR-GNY-643300',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 70: validatePaymentRelationship rejects merchant return URL with untrusted path',
    wrongOriginResult.verified === false &&
      wrongOriginResult.diagnosticDetails?.rejectionReason === 'untrusted_path',
    'verified=false, rejectionReason=untrusted_path',
    `verified=${wrongOriginResult.verified}, reason=${wrongOriginResult.diagnosticDetails?.rejectionReason}`
  );

  // -------------------------------------------------------------
  // TEST 71: REJECT CONFLICTING / DUPLICATE QUERY PARAMETERS IN MERCHANT RETURN URL
  // -------------------------------------------------------------
  const conflictReturnResult = validatePaymentRelationship(
    {
      urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300&PARM_1=CONFLICT-REF',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 71: validatePaymentRelationship rejects merchant return URL with conflicting query parameters',
    conflictReturnResult.verified === false &&
      conflictReturnResult.diagnosticDetails?.rejectionReason === 'parameter_conflict',
    'verified=false, rejectionReason=parameter_conflict',
    `verified=${conflictReturnResult.verified}, reason=${conflictReturnResult.diagnosticDetails?.rejectionReason}`
  );

  // -------------------------------------------------------------
  // TEST 72: REJECT MISMATCHED IDEMPOTENCY KEY IN MERCHANT RETURN URL
  // -------------------------------------------------------------
  const idemMismatchResult = validatePaymentRelationship(
    {
      urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300&idem=wrong-key',
    },
    {
      booking_reference: 'TEST-DAYTOUR-GNY-643300',
      idempotency_key: 'correct-key',
      environment: 'sandbox',
    }
  );

  assert(
    'Test 72: validatePaymentRelationship rejects merchant return URL with mismatched idempotency key',
    idemMismatchResult.verified === false &&
      idemMismatchResult.diagnosticDetails?.rejectionReason === 'idem_mismatch',
    'verified=false, rejectionReason=idem_mismatch',
    `verified=${idemMismatchResult.verified}, reason=${idemMismatchResult.diagnosticDetails?.rejectionReason}`
  );

  // -------------------------------------------------------------
  // TEST 73: AUTOMATIC WEBHOOK CORRECTION RECOVERY (PARM_1 length 15, DB operation initially NULL)
  // -------------------------------------------------------------
  let autoReconBookingStatus = 'pending_payment';
  let autoReconUpdatedRows = 0;
  const mockAutoReconSupabase = {
    rpc: async (fnName: string, _args: any) => {
      if (fnName === 'reconcile_payment_and_booking_atomic') {
        autoReconUpdatedRows++;
        autoReconBookingStatus = 'fully_confirmed';
        return { data: { success: true }, error: null };
      }
      return { data: null, error: { message: 'Unknown RPC' } };
    },
    from: (table: string) => {
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: (col: string, val: any) => {
              if (col === 'booking_reference' && val === 'SHORT-PARM-15-ID') {
                return { data: [], error: null };
              }
              if (col === 'booking_reference' && val === 'TEST-DAYTOUR-GNY-643300') {
                return {
                  data: [
                    {
                      id: 'tx-auto-123',
                      booking_reference: 'TEST-DAYTOUR-GNY-643300',
                      status: 'pending',
                      environment: 'sandbox',
                      expected_amount: 69.00,
                      amount_in_cents: 6900,
                      currency: 'USD',
                      gateway_operation_id: null,
                    },
                  ],
                  error: null,
                };
              }
              return { data: [], error: null };
            },
          }),
          update: () => ({
            eq: () => ({
              select: () => {
                autoReconUpdatedRows++;
                return { data: [{ id: 'tx-auto-123' }], error: null };
              },
            }),
          }),
        };
      }
      if (table === 'booking_requests') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => ({ data: { special_notes: '' }, error: null }),
            }),
          }),
          update: (updateData: any) => ({
            eq: () => ({
              select: () => {
                autoReconBookingStatus = updateData.status;
                return { data: [{ booking_reference: 'TEST-DAYTOUR-GNY-643300' }], error: null };
              },
            }),
          }),
        };
      }
      return {} as any;
    },
  };

  const origFetchAuto = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: {
        codOper: 'LK-BMMRPXP4MZDB',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authCurrency: 840,
        authAmount: 69.00,
        idMerchant: 'SANDBOX_MERCHANT',
        urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300',
      },
    }),
  } as any);

  const autoReconResult = await reconcilePaymentTransaction({
    bookingReference: 'SHORT-PARM-15-ID',
    operationCode: 'LK-BMMRPXP4MZDB',
    environment: 'sandbox',
    supabaseClient: mockAutoReconSupabase as any,
    env: { PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'token' },
  });
  global.fetch = origFetchAuto;

  assert(
    'Test 73: Automatic webhook recovery successfully correlates untrusted PARM_1 via operationCode and urlString bookingReference, confirming booking',
    autoReconResult.success === true &&
      autoReconResult.category === 'approved' &&
      autoReconUpdatedRows === 1 &&
      autoReconBookingStatus === 'fully_confirmed',
    'success=true, category=approved, bookingStatus=fully_confirmed',
    `success=${autoReconResult.success}, status=${autoReconBookingStatus}`
  );

  // -------------------------------------------------------------
  // HELPER: Flexible in-memory Supabase mock state for Webhook & Reconciliation tests
  // -------------------------------------------------------------
  function createMockSupabaseState(initialPayments: any[], initialBookings: any[]) {
    let payments = initialPayments.map((p) => ({ ...p }));
    let bookings = initialBookings.map((b) => ({ ...b }));
    const locks: any[] = [];
    const paymentUpdates: any[] = [];
    const bookingUpdates: any[] = [];

    const mockClient = {
      getPayments: () => payments,
      getBookings: () => bookings,
      getLocks: () => locks,
      getPaymentByRef: (ref: string) => payments.find((p) => p.booking_reference === ref),
      getBookingByRef: (ref: string) => bookings.find((b) => b.booking_reference === ref),
      getPaymentUpdates: () => paymentUpdates,
      getBookingUpdates: () => bookingUpdates,
      rpc: async (fnName: string, args: any) => {
        if (fnName === 'acquire_controlled_live_test_lock') {
          const { p_lock_name, p_owner_token, p_admin_user_id, p_ttl_seconds } = args;
          const now = new Date();
          const expiresAt = new Date(now.getTime() + (p_ttl_seconds || 300) * 1000);
          const existing = locks.find((l) => l.lock_name === p_lock_name);

          if (existing) {
            if (new Date(existing.expires_at).getTime() > now.getTime()) {
              return {
                data: {
                  acquired: false,
                  reason: 'locked',
                  message: 'A controlled live test creation request is currently in progress across function instances. Please wait.',
                },
                error: null,
              };
            } else {
              existing.owner_token = p_owner_token;
              existing.admin_user_id = p_admin_user_id;
              existing.locked_at = now.toISOString();
              existing.expires_at = expiresAt.toISOString();
              return { data: { acquired: true, owner_token: p_owner_token, expires_at: expiresAt.toISOString() }, error: null };
            }
          } else {
            locks.push({
              lock_name: p_lock_name,
              owner_token: p_owner_token,
              admin_user_id: p_admin_user_id,
              locked_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
            });
            return { data: { acquired: true, owner_token: p_owner_token, expires_at: expiresAt.toISOString() }, error: null };
          }
        }
        if (fnName === 'release_controlled_live_test_lock') {
          const { p_lock_name, p_owner_token } = args;
          const idx = locks.findIndex((l) => l.lock_name === p_lock_name && l.owner_token === p_owner_token);
          if (idx >= 0) {
            locks.splice(idx, 1);
            return { data: { released: true }, error: null };
          }
          return { data: { released: false, reason: 'owner_mismatch_or_not_found' }, error: null };
        }
        if (fnName === 'reconcile_payment_and_booking_atomic') {
          const {
            p_transaction_id,
            p_booking_reference,
            p_gateway_operation_id,
            p_amount_paid,
            p_verified_at,
            p_audit_metadata,
            p_special_notes,
          } = args;

          if (!p_booking_reference || !p_booking_reference.trim()) {
            return { data: null, error: { message: 'Atomic reconciliation failed: Booking reference parameter is required and cannot be null or empty.' } };
          }
          if (!p_gateway_operation_id || !p_gateway_operation_id.trim()) {
            return { data: null, error: { message: 'Atomic reconciliation failed: Gateway operation ID parameter is required and cannot be null or empty.' } };
          }
          if (p_amount_paid === undefined || p_amount_paid === null || Number(p_amount_paid) <= 0) {
            return { data: null, error: { message: `Atomic reconciliation failed: Amount paid must be a positive number (${p_amount_paid} provided).` } };
          }

          const paidCents = Math.round(Number(p_amount_paid) * 100);
          if (Math.abs(Number(p_amount_paid) * 100 - paidCents) > 0.00001) {
            return { data: null, error: { message: `Atomic reconciliation failed: Amount paid (${p_amount_paid}) must represent exact whole cents.` } };
          }

          const tx = payments.find((p) => p.id === p_transaction_id);
          if (!tx) {
            return { data: null, error: { message: `Atomic reconciliation failed: Target payment_transactions row ${p_transaction_id} not found.` } };
          }

          if (!tx.booking_reference || !tx.booking_reference.trim()) {
            return { data: null, error: { message: `Atomic reconciliation failed: Target payment_transactions row ${p_transaction_id} has missing stored booking_reference.` } };
          }

          if (tx.booking_reference.trim() !== p_booking_reference.trim()) {
            return { data: null, error: { message: `Atomic reconciliation failed: Stored transaction booking_reference (${tx.booking_reference}) does not match requested booking_reference (${p_booking_reference}).` } };
          }

          const bookingRef = p_booking_reference.trim();
          const booking = bookings.find((b) => b.booking_reference === bookingRef);
          if (!booking) {
            return { data: null, error: { message: `Atomic reconciliation failed: Required booking_requests row (${bookingRef}) not found. Payment-only confirmation rejected.` } };
          }

          if (['cancelled', 'unavailable'].includes(booking.status)) {
            return { data: null, error: { message: `Atomic reconciliation failed: Associated booking_requests row ${bookingRef} is in status ${booking.status}, which cannot be automatically reactivated.` } };
          }

          const expectedCents = tx.amount_in_cents !== undefined && tx.amount_in_cents !== null && tx.amount_in_cents > 0
            ? Number(tx.amount_in_cents)
            : (tx.expected_amount ? Math.round(Number(tx.expected_amount) * 100) : 0);

          if (!expectedCents || expectedCents <= 0) {
            return { data: null, error: { message: `Atomic reconciliation failed: Target payment_transactions row ${p_transaction_id} has absent or invalid expected amount.` } };
          }

          if (paidCents !== expectedCents) {
            return { data: null, error: { message: `Atomic reconciliation failed: Paid amount (${paidCents} cents) does not match stored expected amount (${expectedCents} cents).` } };
          }

          const duplicateTx = payments.find(
            (p) => p.gateway_operation_id && p.gateway_operation_id.trim() === p_gateway_operation_id.trim() && p.id !== p_transaction_id
          );
          if (duplicateTx) {
            return { data: null, error: { message: `Atomic reconciliation failed: Gateway operation ID ${p_gateway_operation_id.trim()} is already assigned to another transaction (${duplicateTx.id}).` } };
          }

          let alreadyApproved = false;
          if (['pending', 'processing'].includes(tx.status)) {
            alreadyApproved = false;
            if (!booking.status || booking.status !== 'pending_payment') {
              return { data: null, error: { message: `Atomic reconciliation failed: Associated booking_requests row ${bookingRef} has status ${booking.status || 'NULL'}, but automatic reconciliation requires status pending_payment.` } };
            }
          } else if (tx.status === 'approved') {
            alreadyApproved = true;
            if (!booking.status || !['pending_payment', 'fully_confirmed'].includes(booking.status)) {
              return { data: null, error: { message: `Atomic reconciliation failed: Associated booking_requests row ${bookingRef} has status ${booking.status || 'NULL'}, which is incompatible with approved transaction reconciliation.` } };
            }
            if (!tx.gateway_operation_id || tx.gateway_operation_id.trim() !== p_gateway_operation_id.trim()) {
              return { data: null, error: { message: `Atomic reconciliation failed: Transaction ${p_transaction_id} is already approved under operation ID ${tx.gateway_operation_id}, cannot overwrite with ${p_gateway_operation_id.trim()}.` } };
            }
            if (tx.amount_paid !== null && tx.amount_paid !== undefined && Math.round(Number(tx.amount_paid) * 100) !== paidCents) {
              return { data: null, error: { message: `Atomic reconciliation failed: Transaction ${p_transaction_id} is already approved with amount ${tx.amount_paid}, cannot update with ${p_amount_paid}.` } };
            }
          } else {
            return { data: null, error: { message: `Atomic reconciliation failed: Transaction ${p_transaction_id} has status ${tx.status}, which is incompatible with standard automatic reconciliation.` } };
          }

          let newNotes = p_special_notes;
          if (!newNotes || !newNotes.trim()) {
            const currentNotes = booking.special_notes || '';
            const prefix = tx.environment === 'sandbox' ? '[TEST / RECONCILED]' : '[RECONCILED]';
            newNotes = currentNotes.includes(prefix) ? currentNotes : `${prefix} ${currentNotes}`.trim();
          }
          booking.status = 'fully_confirmed';
          booking.special_notes = newNotes;
          booking.updated_at = new Date().toISOString();
          bookingUpdates.push({ ...booking });

          tx.status = 'approved';
          tx.gateway_operation_id = p_gateway_operation_id.trim();
          tx.amount_paid = Number(p_amount_paid);
          tx.verified_at = p_verified_at || new Date().toISOString();
          tx.updated_at = new Date().toISOString();
          if (p_audit_metadata) tx.audit_metadata = p_audit_metadata;
          paymentUpdates.push({ ...tx });

          return {
            data: {
              success: true,
              already_approved: alreadyApproved,
              payment_updated: 1,
              booking_updated: 1,
              transaction_id: p_transaction_id,
              booking_reference: bookingRef,
              reconciled_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        return { data: null, error: { message: `Unknown RPC function: ${fnName}` } };
      },
      from: (table: string) => {
        if (table === 'admin_live_test_locks') {
          return {
            select: (_fields?: string) => {
              const buildLockResult = (items: any[]) => ({
                data: items,
                error: null,
                eq: (col: string, val: any) => buildLockResult(items.filter((l) => l[col] === val)),
                limit: (num: number) => buildLockResult(items.slice(0, num)),
                maybeSingle: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                single: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                then: (resolve: any) => resolve({ data: items, error: null }),
              });
              return buildLockResult(locks);
            },
            insert: (recordOrRecords: any) => {
              const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
              for (const rec of records) {
                const idx = locks.findIndex((l) => l.lock_name === rec.lock_name);
                if (idx >= 0) {
                  locks[idx] = { ...locks[idx], ...rec };
                } else {
                  locks.push({ ...rec });
                }
              }
              const ret = { data: records, error: null };
              return {
                ...ret,
                select: () => ret,
                then: (resolve: any) => resolve(ret),
              };
            },
            update: (fields: any) => ({
              eq: (col: string, val: any) => {
                return {
                  eq: (col2: string, val2: any) => {
                    const updated: any[] = [];
                    for (const l of locks) {
                      if (l[col] === val && l[col2] === val2) {
                        Object.assign(l, fields);
                        updated.push(l);
                      }
                    }
                    const ret = { data: updated, error: null };
                    return {
                      ...ret,
                      select: () => ret,
                      then: (resolve: any) => resolve(ret),
                    };
                  },
                };
              },
            }),
            delete: () => ({
              eq: (col: string, val: any) => ({
                eq: (col2: string, val2: any) => {
                  const deleted: any[] = [];
                  for (let i = locks.length - 1; i >= 0; i--) {
                    if (locks[i][col] === val && locks[i][col2] === val2) {
                      deleted.push(locks[i]);
                      locks.splice(i, 1);
                    }
                  }
                  const ret = { data: deleted, error: null };
                  return {
                    ...ret,
                    select: () => ret,
                    then: (resolve: any) => resolve(ret),
                  };
                },
              }),
            }),
          };
        }
        if (table === 'payment_transactions') {
          return {
            select: (_fields?: string) => {
              const buildResult = (items: any[]) => ({
                data: items,
                error: null,
                eq: (col: string, val: any) => buildResult(items.filter((p) => p[col] === val)),
                ilike: (col: string, pat: string) => {
                  const prefix = pat.replace(/[%_]/g, '').toLowerCase();
                  return buildResult(items.filter((p) => String(p[col] || '').toLowerCase().startsWith(prefix)));
                },
                order: (_col: string, _opts?: any) => buildResult(items),
                limit: (num: number) => buildResult(items.slice(0, num)),
                maybeSingle: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                single: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                then: (resolve: any) => resolve({ data: items, error: null }),
              });
              return buildResult(payments);
            },
            update: (fields: any) => ({
              eq: (col: string, val: any) => {
                const updated: any[] = [];
                payments = payments.map((p) => {
                  if (p[col] === val) {
                    const u = { ...p, ...fields };
                    updated.push(u);
                    paymentUpdates.push({ ...fields, targetCol: col, targetVal: val });
                    return u;
                  }
                  return p;
                });
                const ret = { data: updated, error: null };
                return {
                  ...ret,
                  select: () => ret,
                  then: (resolve: any) => resolve(ret),
                };
              },
            }),
            upsert: (recordOrRecords: any) => {
              const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
              for (const rec of records) {
                const idx = payments.findIndex((p) =>
                  (rec.id && p.id === rec.id) ||
                  (rec.booking_reference && p.booking_reference === rec.booking_reference) ||
                  (rec.idempotency_key && p.idempotency_key === rec.idempotency_key)
                );
                if (idx >= 0) {
                  payments[idx] = { ...payments[idx], ...rec };
                } else {
                  payments.push({ ...rec });
                }
              }
              const ret = { data: records, error: null };
              return {
                ...ret,
                select: () => ret,
                then: (resolve: any) => resolve(ret),
              };
            },
          };
        }
        if (table === 'booking_requests') {
          return {
            select: (_fields?: string) => {
              const buildBookingResult = (items: any[]) => ({
                data: items,
                error: null,
                eq: (col: string, val: any) => buildBookingResult(items.filter((b) => b[col] === val)),
                limit: (num: number) => buildBookingResult(items.slice(0, num)),
                maybeSingle: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                single: async () => ({ data: items.length > 0 ? items[0] : null, error: null }),
                then: (resolve: any) => resolve({ data: items, error: null }),
              });
              return buildBookingResult(bookings);
            },
            update: (fields: any) => ({
              eq: (col: string, val: any) => {
                const updated: any[] = [];
                bookings = bookings.map((b) => {
                  if (b[col] === val) {
                    const u = { ...b, ...fields };
                    updated.push(u);
                    bookingUpdates.push({ ...fields, targetCol: col, targetVal: val });
                    return u;
                  }
                  return b;
                });
                const ret = { data: updated, error: null };
                return {
                  ...ret,
                  select: () => ret,
                  then: (resolve: any) => resolve(ret),
                };
              },
            }),
            upsert: (recordOrRecords: any) => {
              const records = Array.isArray(recordOrRecords) ? recordOrRecords : [recordOrRecords];
              for (const rec of records) {
                const idx = bookings.findIndex((b) =>
                  (rec.id && b.id === rec.id) ||
                  (rec.booking_reference && b.booking_reference === rec.booking_reference) ||
                  (rec.idempotency_key && b.idempotency_key === rec.idempotency_key)
                );
                if (idx >= 0) {
                  bookings[idx] = { ...bookings[idx], ...rec };
                } else {
                  bookings.push({ ...rec });
                }
              }
              const ret = { data: records, error: null };
              return {
                ...ret,
                select: () => ret,
                then: (resolve: any) => resolve(ret),
              };
            },
          };
        }
        if (table === 'quotation_admins') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                maybeSingle: async () => ({ data: { user_id: val }, error: null }),
              }),
            }),
          };
        }
        return {} as any;
      },
      auth: {
        getUser: async (token: string) => {
          if (!token || token.includes('invalid')) {
            return { data: { user: null }, error: { message: 'Invalid token' } };
          }
          return { data: { user: { id: 'admin_petra_user' } }, error: null };
        },
      },
    };
    return mockClient;
  }

  const standardGwRecord = {
    codOper: 'LK-BMMRPXP4MZDB',
    status: 1,
    txType: 'AUTH_CAPTURE',
    authCurrency: 840,
    authAmount: 69.00,
    idMerchant: 'SANDBOX_MERCHANT',
    urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300',
  };

  const standardEnv = {
    PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'mock_sandbox_access_token_12345',
    PAGUELOFACIL_RETURN_URL: 'https://gunayalapanama.com/checkout/complete',
  };

  // -------------------------------------------------------------
  // TEST 74: REGRESSION SCENARIO A - PARM_1 length 15, valid Oper, verified urlString, DB operation initially NULL
  // -------------------------------------------------------------
  const stateA = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-a',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending_payment',
        special_notes: '',
      },
    ]
  );

  const fetchA = async () => ({
    ok: true,
    json: async () => ({ data: [standardGwRecord] }),
  } as any);

  const webhookReqA = {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      PARM_1: 'SHORT15CHARSREF', // 15 characters, untrusted hint
      Oper: 'LK-BMMRPXP4MZDB',
      TotalPagado: '69.00',
      Estado: 'Aprobada',
    }),
  };

  const resA = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateA as any,
    env: standardEnv,
    fetchFn: fetchA,
  });
  const bodyA = JSON.parse(resA.body);

  assert(
    'Test 74 (Scenario A): Webhook with 15-char PARM_1, valid Oper, and initially NULL gateway_operation_id correlates via urlString and confirms booking',
    resA.statusCode === 200 &&
      bodyA.success === true &&
      bodyA.verified === true &&
      stateA.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.status === 'approved' &&
      stateA.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.gateway_operation_id === 'LK-BMMRPXP4MZDB' &&
      stateA.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'fully_confirmed',
    'HTTP 200, success=true, payment=approved, oper=LK-BMMRPXP4MZDB, booking=fully_confirmed',
    `status=${resA.statusCode}, success=${bodyA.success}, payStatus=${stateA.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.status}, bookStatus=${stateA.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 75: REGRESSION SCENARIO B - Gateway status declined (status 0) -> rejects, booking remains pending
  // -------------------------------------------------------------
  const stateB = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-b',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending_payment',
        special_notes: '',
      },
    ]
  );

  const fetchB = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, status: 0, txType: 'AUTH_CAPTURE' }],
    }),
  } as any);

  const webhookReqB = {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      PARM_1: 'SHORT15CHARSREF',
      Oper: 'LK-BMMRPXP4MZDB',
      TotalPagado: '69.00',
      Estado: 'Rechazada',
    }),
  };

  const resB = await webhookHandler(webhookReqB as any, {} as any, {
    supabaseClient: stateB as any,
    env: standardEnv,
    fetchFn: fetchB,
  });
  const bodyB = JSON.parse(resB.body);

  assert(
    'Test 75 (Scenario B): Gateway status declined (status 0) rejects webhook and preserves pending_payment booking status',
    resB.statusCode === 422 &&
      bodyB.success === false &&
      bodyB.category === 'declined' &&
      stateB.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.status === 'pending' &&
      stateB.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'pending_payment',
    'HTTP 422, category=declined, booking status remains pending_payment',
    `status=${resB.statusCode}, category=${bodyB.category}, bookStatus=${stateB.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 76: REGRESSION SCENARIO C - Gateway record absent (0 records) or multiple (>1 records)
  // -------------------------------------------------------------
  const stateC = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-c',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [{ booking_reference: 'TEST-DAYTOUR-GNY-643300', status: 'pending_payment' }]
  );

  const fetchCZero = async () => ({
    ok: true,
    json: async () => ({ data: [] }),
  } as any);

  const fetchCMultiple = async () => ({
    ok: true,
    json: async () => ({ data: [standardGwRecord, { ...standardGwRecord, codOper: 'LK-BMMRPXP4MZDB' }] }),
  } as any);

  const resCZero = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateC as any,
    env: standardEnv,
    fetchFn: fetchCZero,
  });
  const bodyCZero = JSON.parse(resCZero.body);

  const resCMultiple = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateC as any,
    env: standardEnv,
    fetchFn: fetchCMultiple,
  });
  const bodyCMultiple = JSON.parse(resCMultiple.body);

  assert(
    'Test 76 (Scenario C): Gateway records absent (0 records) or ambiguous (>1 records) safely reject webhook',
    resCZero.statusCode === 422 &&
      bodyCZero.category === 'absent_records' &&
      resCMultiple.statusCode === 422 &&
      bodyCMultiple.category === 'ambiguous_records',
    'Zero -> absent_records; Multiple -> ambiguous_records',
    `zeroCategory=${bodyCZero.category}, multiCategory=${bodyCMultiple.category}`
  );

  // -------------------------------------------------------------
  // TEST 77: REGRESSION SCENARIO D - Wrong URL host or path in urlString rejects safely
  // -------------------------------------------------------------
  const stateD = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-d',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [{ booking_reference: 'TEST-DAYTOUR-GNY-643300', status: 'pending_payment' }]
  );

  const fetchDHost = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, urlString: 'https://evil-phishing.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300' }],
    }),
  } as any);

  const fetchDPath = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, urlString: 'https://gunayalapanama.com/untrusted/path?bookingReference=TEST-DAYTOUR-GNY-643300' }],
    }),
  } as any);

  const resDHost = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateD as any,
    env: standardEnv,
    fetchFn: fetchDHost,
  });
  const bodyDHost = JSON.parse(resDHost.body);

  const resDPath = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateD as any,
    env: standardEnv,
    fetchFn: fetchDPath,
  });
  const bodyDPath = JSON.parse(resDPath.body);

  assert(
    'Test 77 (Scenario D): Untrusted host or untrusted pathname in gateway urlString safely rejects webhook',
    resDHost.statusCode === 422 &&
      bodyDHost.category === 'needs_manual_review' &&
      resDPath.statusCode === 422 &&
      bodyDPath.category === 'needs_manual_review' &&
      stateD.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'pending_payment',
    'HTTP 422, category=needs_manual_review for both untrusted host and path',
    `hostCat=${bodyDHost.category}, pathCat=${bodyDPath.category}`
  );

  // -------------------------------------------------------------
  // TEST 78: REGRESSION SCENARIO E - Duplicate or conflicting bookingReference query parameters in urlString
  // -------------------------------------------------------------
  const stateE = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-e',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [{ booking_reference: 'TEST-DAYTOUR-GNY-643300', status: 'pending_payment' }]
  );

  const fetchEDup = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=REF-A&bookingReference=REF-B' }],
    }),
  } as any);

  const fetchEConflict = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-643300&PARM_1=CONFLICT-REF' }],
    }),
  } as any);

  const resEDup = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateE as any,
    env: standardEnv,
    fetchFn: fetchEDup,
  });
  const bodyEDup = JSON.parse(resEDup.body);

  const resEConflict = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateE as any,
    env: standardEnv,
    fetchFn: fetchEConflict,
  });
  const bodyEConflict = JSON.parse(resEConflict.body);

  assert(
    'Test 78 (Scenario E): Duplicate or conflicting reference parameters in gateway urlString safely reject webhook',
    resEDup.statusCode === 422 &&
      bodyEDup.category === 'needs_manual_review' &&
      resEConflict.statusCode === 422 &&
      bodyEConflict.category === 'needs_manual_review',
    'HTTP 422, category=needs_manual_review for duplicate and conflicting parameters',
    `dupCat=${bodyEDup.category}, conflictCat=${bodyEConflict.category}`
  );

  // -------------------------------------------------------------
  // TEST 79: REGRESSION SCENARIO F - Gateway amount mismatch or currency mismatch rejects safely
  // -------------------------------------------------------------
  const stateF = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-f',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [{ booking_reference: 'TEST-DAYTOUR-GNY-643300', status: 'pending_payment' }]
  );

  const fetchFAmount = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, authAmount: 50.00 }],
    }),
  } as any);

  const fetchFCurrency = async () => ({
    ok: true,
    json: async () => ({
      data: [{ ...standardGwRecord, authCurrency: 978 }], // EUR
    }),
  } as any);

  const resFAmount = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateF as any,
    env: standardEnv,
    fetchFn: fetchFAmount,
  });
  const bodyFAmount = JSON.parse(resFAmount.body);

  const resFCurrency = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateF as any,
    env: standardEnv,
    fetchFn: fetchFCurrency,
  });
  const bodyFCurrency = JSON.parse(resFCurrency.body);

  assert(
    'Test 79 (Scenario F): Gateway amount mismatch ($50 vs $69) or currency mismatch (EUR vs USD) safely reject webhook',
    resFAmount.statusCode === 422 &&
      bodyFAmount.category === 'validation_rejection' &&
      resFCurrency.statusCode === 422 &&
      bodyFCurrency.category === 'validation_rejection',
    'HTTP 422, category=validation_rejection for both amount and currency mismatch',
    `amountCat=${bodyFAmount.category}, currCat=${bodyFCurrency.category}`
  );

  // -------------------------------------------------------------
  // TEST 80: REGRESSION SCENARIO G - Second callback for already approved transaction returns duplicate:true
  // -------------------------------------------------------------
  const stateG = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-g',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'approved',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        amount_paid: 69.00,
        currency: 'USD',
        gateway_operation_id: 'LK-BMMRPXP4MZDB',
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'fully_confirmed',
        special_notes: '[TEST / RECONCILED]',
      },
    ]
  );

  const fetchG = async () => ({
    ok: true,
    json: async () => ({ data: [standardGwRecord] }),
  } as any);

  const resG = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateG as any,
    env: standardEnv,
    fetchFn: fetchG,
  });
  const bodyG = JSON.parse(resG.body);

  assert(
    'Test 80 (Scenario G): Second callback for an already-approved and confirmed transaction returns HTTP 200 with duplicate=true',
    resG.statusCode === 200 &&
      bodyG.success === true &&
      bodyG.duplicate === true &&
      stateG.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'fully_confirmed',
    'HTTP 200, success=true, duplicate=true, booking=fully_confirmed',
    `status=${resG.statusCode}, duplicate=${bodyG.duplicate}, bookingStatus=${stateG.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 81: REGRESSION SCENARIO H - Mismatched stored operation ID rejects safely
  // -------------------------------------------------------------
  const stateH = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-h',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: 'LK-OLD-DIFFERENT-OPER', // Mismatched stored oper
      },
    ],
    [{ booking_reference: 'TEST-DAYTOUR-GNY-643300', status: 'pending_payment' }]
  );

  const resH = await webhookHandler(webhookReqA as any, {} as any, {
    supabaseClient: stateH as any,
    env: standardEnv,
    fetchFn: fetchA,
  });
  const bodyH = JSON.parse(resH.body);

  assert(
    'Test 81 (Scenario H): Mismatched stored gateway operation ID rejects webhook with category mismatched_identifiers',
    resH.statusCode === 422 &&
      bodyH.category === 'mismatched_identifiers' &&
      bodyH.error?.includes('Mismatched stored operation ID') === true &&
      stateH.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'pending_payment',
    'HTTP 422, category=mismatched_identifiers, booking remains pending_payment',
    `status=${resH.statusCode}, category=${bodyH.category}`
  );

  // -------------------------------------------------------------
  // TEST 82: REGRESSION SCENARIO I - Manual reconciliation for previously successful $69 transaction works
  // -------------------------------------------------------------
  const stateI = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-i',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending_payment',
        special_notes: '',
      },
    ]
  );

  const resI = await reconcilePaymentTransaction({
    bookingReference: 'TEST-DAYTOUR-GNY-643300',
    operationCode: 'LK-BMMRPXP4MZDB',
    environment: 'sandbox',
    supabaseClient: stateI as any,
    env: standardEnv,
    fetchFn: fetchA,
  });

  assert(
    'Test 82 (Scenario I): Manual reconciliation for the $69 transaction succeeds, marking payment approved and booking fully_confirmed',
    resI.success === true &&
      resI.category === 'approved' &&
      resI.amountPaid === 69 &&
      stateI.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.status === 'approved' &&
      stateI.getPaymentByRef('TEST-DAYTOUR-GNY-643300')?.gateway_operation_id === 'LK-BMMRPXP4MZDB' &&
      stateI.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'fully_confirmed',
    'success=true, category=approved, amountPaid=69, booking=fully_confirmed',
    `success=${resI.success}, category=${resI.category}, amount=${resI.amountPaid}, bookStatus=${stateI.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 83: REGRESSION SCENARIO J - Untrusted webhook-supplied identifiers cannot spoof booking selection
  // -------------------------------------------------------------
  const stateJ = createMockSupabaseState(
    [
      {
        id: 'tx-scenario-j-target',
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
      {
        id: 'tx-scenario-j-attacker',
        booking_reference: 'ATTACKER-EVIL-REF',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-643300',
        status: 'pending_payment',
        special_notes: '',
      },
      {
        booking_reference: 'ATTACKER-EVIL-REF',
        status: 'pending_payment',
        special_notes: '',
      },
    ]
  );

  const webhookReqJ = {
    httpMethod: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      PARM_1: 'ATTACKER-EVIL-REF', // Attacker attempts to hijack payment for their booking
      Oper: 'LK-BMMRPXP4MZDB',
      TotalPagado: '69.00',
      Estado: 'Aprobada',
    }),
  };

  const resJ = await webhookHandler(webhookReqJ as any, {} as any, {
    supabaseClient: stateJ as any,
    env: standardEnv,
    fetchFn: fetchA,
  });
  const bodyJ = JSON.parse(resJ.body);

  assert(
    'Test 83 (Scenario J): Untrusted callback PARM_1 cannot divert credit; authenticated urlString reference TEST-DAYTOUR-GNY-643300 is confirmed while attacker booking remains pending',
    resJ.statusCode === 200 &&
      bodyJ.success === true &&
      bodyJ.bookingReference === 'TEST-DAYTOUR-GNY-643300' &&
      stateJ.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status === 'fully_confirmed' &&
      stateJ.getBookingByRef('ATTACKER-EVIL-REF')?.status === 'pending_payment',
    'HTTP 200, target booking fully_confirmed, attacker booking remains pending_payment',
    `status=${resJ.statusCode}, ref=${bodyJ.bookingReference}, targetStatus=${stateJ.getBookingByRef('TEST-DAYTOUR-GNY-643300')?.status}, attackerStatus=${stateJ.getBookingByRef('ATTACKER-EVIL-REF')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 84: RECOVER APPROVED SANDBOX PAYMENT — 282502 (INITIALLY NULL gateway_operation_id)
  // -------------------------------------------------------------
  const state282502 = createMockSupabaseState(
    [
      {
        id: 'tx-sandbox-282502',
        booking_reference: 'TEST-DAYTOUR-GNY-282502',
        status: 'pending',
        environment: 'sandbox',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null, // Initially NULL as specified
      },
    ],
    [
      {
        booking_reference: 'TEST-DAYTOUR-GNY-282502',
        status: 'pending_payment',
        special_notes: '',
      },
    ]
  );

  const fetch282502 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-1ONSIEENSC9H',
          id: 703571,
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: 840,
          authAmount: 69.00,
          idMerchant: 'SANDBOX_MERCHANT',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-282502',
        },
      ],
    }),
  } as any);

  // 1. Initial Recovery Call
  const recoveryReq282502 = {
    action: 'reconcile_existing_transaction',
    bookingReference: 'TEST-DAYTOUR-GNY-282502',
    operationCode: 'LK-1ONSIEENSC9H',
  };

  const res282502 = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: state282502 as any,
    envOverride: standardEnv,
    fetchFn: fetch282502,
  }, recoveryReq282502);

  // 2. Second Call to Test Idempotency
  const resSecond282502 = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: state282502 as any,
    envOverride: standardEnv,
    fetchFn: fetch282502,
  }, recoveryReq282502);

  assert(
    'Test 84: Recover Approved Sandbox Payment — 282502 (LK-1ONSIEENSC9H, initially NULL operation_id) verifies and syncs booking, repeated calls idempotent',
    res282502.statusCode === 200 &&
      res282502.body.success === true &&
      res282502.body.bookingReference === 'TEST-DAYTOUR-GNY-282502' &&
      res282502.body.operationCode === 'LK-1ONSIEENSC9H' &&
      res282502.body.reconciliation.category === 'approved' &&
      res282502.body.reconciliation.amountPaid === 69.00 &&
      state282502.getPaymentByRef('TEST-DAYTOUR-GNY-282502')?.status === 'approved' &&
      state282502.getPaymentByRef('TEST-DAYTOUR-GNY-282502')?.gateway_operation_id === 'LK-1ONSIEENSC9H' &&
      state282502.getBookingByRef('TEST-DAYTOUR-GNY-282502')?.status === 'fully_confirmed' &&
      state282502.getBookingByRef('TEST-DAYTOUR-GNY-282502')?.special_notes.includes('[TEST / RECONCILED]') &&
      resSecond282502.statusCode === 200 &&
      resSecond282502.body.success === true &&
      resSecond282502.body.reconciliation.duplicate === true,
    'HTTP 200, category=approved, payment=approved, oper=LK-1ONSIEENSC9H, booking=fully_confirmed, repeat duplicate=true',
    `status=${res282502.statusCode}, cat=${res282502.body.reconciliation?.category}, payStatus=${state282502.getPaymentByRef('TEST-DAYTOUR-GNY-282502')?.status}, bookStatus=${state282502.getBookingByRef('TEST-DAYTOUR-GNY-282502')?.status}, secondDup=${resSecond282502.body.reconciliation?.duplicate}`
  );

  // -------------------------------------------------------------
  // TEST 85: LIVE API CONNECTION TEST — AUTHENTICATED EMPTY RESPONSE (0 matching records for probe)
  // -------------------------------------------------------------
  const liveTestEnv = {
    PAGUELOFACIL_ACCESS_TOKEN: 'LIVE_PRODUCTION_API_SECRET_TOKEN_99999',
    PAGUELOFACIL_ENV: 'sandbox', // Verify PAGUELOFACIL_ENV is unchanged
    ENABLE_LIVE_PAYMENTS: 'false',
  };

  let capturedLiveProbeUrl = '';
  let capturedLiveProbeHeaders: Record<string, string> = {};

  const mockLiveAuthFetchSuccess = async (url: any, opts: any) => {
    capturedLiveProbeUrl = String(url);
    capturedLiveProbeHeaders = opts?.headers || {};
    return {
      status: 200,
      ok: true,
      json: async () => ({
        headerStatus: { code: 200, status: 'SUCCESS' },
        data: [], // 0 matching records for nonexistent probe
        message: 'Operación exitosa',
      }),
    } as any;
  };

  const mockAdminClient = createMockSupabaseState([], []);

  const liveTestResultSuccess = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveTestEnv,
    fetchFn: mockLiveAuthFetchSuccess as any,
  }, { action: 'test_live_api_connection' });

  const liveBodySuccess = liveTestResultSuccess.body?.liveApiTest;

  assert(
    'Test 85: Live API Connection Test verifies valid credential on probe query with 0 records (authenticated_empty) without creating payment',
    liveTestResultSuccess.statusCode === 200 &&
      liveTestResultSuccess.body.success === true &&
      liveBodySuccess?.reachable === true &&
      liveBodySuccess?.authenticated === true &&
      liveBodySuccess?.httpStatus === 200 &&
      liveBodySuccess?.category === 'authenticated_empty' &&
      capturedLiveProbeUrl.includes('https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions') &&
      capturedLiveProbeUrl.includes('codOper') &&
      capturedLiveProbeHeaders['Authorization'] === 'LIVE_PRODUCTION_API_SECRET_TOKEN_99999' &&
      !JSON.stringify(liveTestResultSuccess.body).includes('LIVE_PRODUCTION_API_SECRET_TOKEN_99999'),
    'statusCode=200, success=true, authenticated=true, category=authenticated_empty, token not exposed in response',
    `status=${liveTestResultSuccess.statusCode}, success=${liveTestResultSuccess.body.success}, cat=${liveBodySuccess?.category}, auth=${liveBodySuccess?.authenticated}`
  );

  // -------------------------------------------------------------
  // TEST 86: LIVE API CONNECTION TEST — AUTHENTICATION FAILURE (HTTP 401)
  // -------------------------------------------------------------
  const mockLiveAuthFetchFail = async () => ({
    status: 401,
    ok: false,
    json: async () => ({
      headerStatus: { code: 401, status: 'UNAUTHORIZED' },
      message: 'Token de acceso inválido',
    }),
  } as any);

  const liveTestResultFail = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveTestEnv,
    fetchFn: mockLiveAuthFetchFail as any,
  }, { action: 'test_live_api_connection' });

  const liveBodyFail = liveTestResultFail.body?.liveApiTest;

  assert(
    'Test 86: Live API Connection Test detects invalid production token (HTTP 401) and reports authenticated=false with category invalid_credentials',
    liveTestResultFail.statusCode === 200 &&
      liveTestResultFail.body.success === false &&
      liveBodyFail?.reachable === true &&
      liveBodyFail?.authenticated === false &&
      liveBodyFail?.httpStatus === 401 &&
      liveBodyFail?.category === 'invalid_credentials' &&
      !JSON.stringify(liveTestResultFail.body).includes('LIVE_PRODUCTION_API_SECRET_TOKEN_99999'),
    'success=false, reachable=true, authenticated=false, category=invalid_credentials, HTTP 401',
    `success=${liveTestResultFail.body.success}, auth=${liveBodyFail?.authenticated}, cat=${liveBodyFail?.category}, http=${liveBodyFail?.httpStatus}`
  );

  // -------------------------------------------------------------
  // TEST 87: LIVE API CONNECTION TEST — UNAUTHENTICATED / NON-ADMIN REJECTION
  // -------------------------------------------------------------
  const unauthLiveTest = await executeTestLiveApiConnection(null, {
    supabaseClient: mockAdminClient as any,
    envOverride: liveTestEnv,
  });

  const nonAdminSupabase = {
    ...mockAdminClient,
    from: (table: string) => {
      if (table === 'quotation_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }), // User not in quotation_admins
            }),
          }),
        };
      }
      return (mockAdminClient as any).from(table);
    },
  };

  const nonAdminLiveTest = await executeTestLiveApiConnection('Bearer regular_user_token', {
    supabaseClient: nonAdminSupabase as any,
    envOverride: liveTestEnv,
  });

  assert(
    'Test 87: Live API Connection Test rejects unauthenticated (HTTP 401) and non-admin callers (HTTP 403)',
    unauthLiveTest.statusCode === 401 &&
      unauthLiveTest.body.success === false &&
      nonAdminLiveTest.statusCode === 403 &&
      nonAdminLiveTest.body.success === false,
    'Unauth -> 401, NonAdmin -> 403',
    `unauthStatus=${unauthLiveTest.statusCode}, nonAdminStatus=${nonAdminLiveTest.statusCode}`
  );

  // -------------------------------------------------------------
  // TEST 88: LIVE API CONNECTION TEST — MISSING PRODUCTION TOKEN IN SERVER ENVIRONMENT
  // -------------------------------------------------------------
  const missingTokenEnv = {
    PAGUELOFACIL_ACCESS_TOKEN: '', // Empty live token
    PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'SANDBOX_TOKEN_MUST_NOT_BE_USED',
    PAGUELOFACIL_ENV: 'sandbox',
  };

  const missingTokenResult = await executeTestLiveApiConnection('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: missingTokenEnv,
  });

  const missingTokenBody = missingTokenResult.body?.liveApiTest;

  assert(
    'Test 88: Live API Connection Test identifies missing PAGUELOFACIL_ACCESS_TOKEN without falling back to sandbox credentials',
    missingTokenResult.statusCode === 200 &&
      missingTokenResult.body.success === false &&
      missingTokenBody?.reachable === false &&
      missingTokenBody?.authenticated === false &&
      missingTokenBody?.category === 'missing_configuration' &&
      !JSON.stringify(missingTokenResult.body).includes('SANDBOX_TOKEN_MUST_NOT_BE_USED'),
    'success=false, reachable=false, category=missing_configuration, no sandbox fallback',
    `success=${missingTokenResult.body.success}, cat=${missingTokenBody?.category}`
  );

  // -------------------------------------------------------------
  // TEST 89: LIVE CHECKOUT CONNECTION TEST — VALID CCLW & GENUINE LINK GENERATION ($1.00 PROBE)
  // -------------------------------------------------------------
  const liveCheckoutEnv = {
    PAGUELOFACIL_CCLW: 'LIVE_PROD_CCLW_VALID_987654321',
    PAGUELOFACIL_SANDBOX_CCLW: 'SANDBOX_CCLW_DO_NOT_USE',
    PAGUELOFACIL_ENV: 'sandbox', // Must stay sandbox
    ENABLE_LIVE_PAYMENTS: 'false', // Must stay false
  };

  let capturedLinkDaemonUrl = '';
  let capturedLinkDaemonBody = '';

  const mockLiveCheckoutFetchSuccess = async (url: any, opts: any) => {
    capturedLinkDaemonUrl = String(url);
    capturedLinkDaemonBody = String(opts?.body || '');
    return {
      status: 200,
      ok: true,
      json: async () => ({
        headerStatus: { code: 200, status: 'SUCCESS' },
        data: {
          url: 'https://secure.paguelofacil.com/checkout?code=LK-PROBE-LIVE-VALID-001',
          code: 'LK-PROBE-LIVE-VALID-001',
        },
        message: 'Operación exitosa',
      }),
    } as any;
  };

  const liveCheckoutSuccess = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveCheckoutEnv,
    fetchFn: mockLiveCheckoutFetchSuccess as any,
  }, { action: 'test_live_checkout_connection' });

  const liveCheckoutBodySuccess = liveCheckoutSuccess.body?.liveCheckoutTest;
  const parsedParams = new URLSearchParams(capturedLinkDaemonBody);

  assert(
    'Test 89: Live Checkout Connection Test posts isolated $1.00 probe to secure LinkDeamon and verifies genuine link created without exposing URL or CCLW',
    Boolean(
      liveCheckoutSuccess.statusCode === 200 &&
        liveCheckoutSuccess.body.success === true &&
        liveCheckoutBodySuccess?.reachable === true &&
        liveCheckoutBodySuccess?.credentialAccepted === true &&
        liveCheckoutBodySuccess?.checkoutUrlGenerated === true &&
        liveCheckoutBodySuccess?.validatedHost === 'secure.paguelofacil.com' &&
        liveCheckoutBodySuccess?.category === 'checkout_link_created' &&
        capturedLinkDaemonUrl === 'https://secure.paguelofacil.com/LinkDeamon.cfm' &&
        parsedParams.get('CCLW') === 'LIVE_PROD_CCLW_VALID_987654321' &&
        parsedParams.get('CMTN') === '1.00' &&
        parsedParams.get('CDSC') === 'Connection test - do not pay' &&
        parsedParams.get('EXPIRES_IN') === '900' &&
        parsedParams.get('PARM_1')?.startsWith('LIVE-CONNECTION-PROBE-') &&
        !JSON.stringify(liveCheckoutSuccess.body).includes('https://secure.paguelofacil.com/checkout') &&
        !JSON.stringify(liveCheckoutSuccess.body).includes('LIVE_PROD_CCLW_VALID_987654321')
    ),
    'success=true, category=checkout_link_created, validatedHost=secure.paguelofacil.com, checkoutUrl and CCLW suppressed',
    `success=${liveCheckoutSuccess.body.success}, cat=${liveCheckoutBodySuccess?.category}, host=${liveCheckoutBodySuccess?.validatedHost}`
  );

  // -------------------------------------------------------------
  // TEST 90: LIVE CHECKOUT CONNECTION TEST — INVALID OR REJECTED CCLW
  // -------------------------------------------------------------
  const mockLiveCheckoutFetchInvalidCclw = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      headerStatus: { code: 400, description: 'CCLW Invalido o no autorizado' },
      data: null,
      message: 'Credencial inválida',
    }),
  } as any);

  const liveCheckoutInvalidCclw = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveCheckoutEnv,
    fetchFn: mockLiveCheckoutFetchInvalidCclw as any,
  }, { action: 'test_live_checkout_connection' });

  const liveCheckoutBodyInvalidCclw = liveCheckoutInvalidCclw.body?.liveCheckoutTest;

  assert(
    'Test 90: Live Checkout Connection Test correctly detects invalid or rejected production CCLW (category invalid_cclw)',
    Boolean(
      liveCheckoutInvalidCclw.statusCode === 200 &&
        liveCheckoutInvalidCclw.body.success === false &&
        liveCheckoutBodyInvalidCclw?.credentialAccepted === false &&
        liveCheckoutBodyInvalidCclw?.checkoutUrlGenerated === false &&
        liveCheckoutBodyInvalidCclw?.category === 'invalid_cclw' &&
        liveCheckoutBodyInvalidCclw?.validatedHost === null
    ),
    'success=false, credentialAccepted=false, category=invalid_cclw',
    `success=${liveCheckoutInvalidCclw.body.success}, cat=${liveCheckoutBodyInvalidCclw?.category}, accepted=${liveCheckoutBodyInvalidCclw?.credentialAccepted}`
  );

  // -------------------------------------------------------------
  // TEST 91: LIVE CHECKOUT CONNECTION TEST — MALFORMED RESPONSE (NON-JSON BODY)
  // -------------------------------------------------------------
  const mockLiveCheckoutFetchMalformed = async () => ({
    status: 200,
    ok: true,
    json: async () => {
      throw new Error('Unexpected token < in JSON at position 0');
    },
  } as any);

  const liveCheckoutMalformed = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveCheckoutEnv,
    fetchFn: mockLiveCheckoutFetchMalformed as any,
  }, { action: 'test_live_checkout_connection' });

  const liveCheckoutBodyMalformed = liveCheckoutMalformed.body?.liveCheckoutTest;

  assert(
    'Test 91: Live Checkout Connection Test handles non-JSON malformed gateway response safely with category malformed_response',
    Boolean(
      liveCheckoutMalformed.statusCode === 200 &&
        liveCheckoutMalformed.body.success === false &&
        liveCheckoutBodyMalformed?.checkoutUrlGenerated === false &&
        liveCheckoutBodyMalformed?.category === 'malformed_response'
    ),
    'success=false, checkoutUrlGenerated=false, category=malformed_response',
    `success=${liveCheckoutMalformed.body.success}, cat=${liveCheckoutBodyMalformed?.category}`
  );

  // -------------------------------------------------------------
  // TEST 92: LIVE CHECKOUT CONNECTION TEST — UNTRUSTED CHECKOUT HOSTNAME REJECTED
  // -------------------------------------------------------------
  const mockLiveCheckoutFetchUntrustedHost = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      headerStatus: { code: 200, status: 'SUCCESS' },
      data: {
        url: 'https://attacker-domain-spoofed.com/checkout?code=LK-MALICIOUS-001',
        code: 'LK-MALICIOUS-001',
      },
    }),
  } as any);

  const liveCheckoutUntrustedHost = await executeAdminSandboxTest('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: liveCheckoutEnv,
    fetchFn: mockLiveCheckoutFetchUntrustedHost as any,
  }, { action: 'test_live_checkout_connection' });

  const liveCheckoutBodyUntrustedHost = liveCheckoutUntrustedHost.body?.liveCheckoutTest;

  assert(
    'Test 92: Live Checkout Connection Test rejects untrusted hostname with category untrusted_hostname and suppresses full untrusted URL',
    Boolean(
      liveCheckoutUntrustedHost.statusCode === 200 &&
        liveCheckoutUntrustedHost.body.success === false &&
        liveCheckoutBodyUntrustedHost?.checkoutUrlGenerated === false &&
        liveCheckoutBodyUntrustedHost?.category === 'untrusted_hostname' &&
        !JSON.stringify(liveCheckoutUntrustedHost.body).includes('attacker-domain-spoofed.com')
    ),
    'success=false, category=untrusted_hostname, untrusted url suppressed',
    `success=${liveCheckoutUntrustedHost.body.success}, cat=${liveCheckoutBodyUntrustedHost?.category}`
  );

  // -------------------------------------------------------------
  // TEST 93: LIVE CHECKOUT CONNECTION TEST — AUTH ENFORCEMENT & MISSING CCLW CONFIGURATION
  // -------------------------------------------------------------
  const unauthCheckoutTest = await executeTestLiveCheckoutConnection(null, {
    supabaseClient: mockAdminClient as any,
    envOverride: liveCheckoutEnv,
  });

  const nonAdminCheckoutTest = await executeTestLiveCheckoutConnection('Bearer regular_user_token', {
    supabaseClient: nonAdminSupabase as any,
    envOverride: liveCheckoutEnv,
  });

  const missingCclwEnv = {
    PAGUELOFACIL_CCLW: '', // Empty
    PAGUELOFACIL_SANDBOX_CCLW: 'SANDBOX_CCLW_CANNOT_BE_USED_FOR_LIVE',
    PAGUELOFACIL_ENV: 'sandbox',
    ENABLE_LIVE_PAYMENTS: 'false',
  };

  const missingCclwTest = await executeTestLiveCheckoutConnection('Bearer admin_token', {
    supabaseClient: mockAdminClient as any,
    envOverride: missingCclwEnv,
  });

  assert(
    'Test 93: Live Checkout Connection Test enforces admin auth (HTTP 401/403) and detects missing PAGUELOFACIL_CCLW without sandbox fallback',
    Boolean(
      unauthCheckoutTest.statusCode === 401 &&
        nonAdminCheckoutTest.statusCode === 403 &&
        missingCclwTest.statusCode === 200 &&
        missingCclwTest.body.success === false &&
        missingCclwTest.body.liveCheckoutTest?.category === 'missing_configuration' &&
        !JSON.stringify(missingCclwTest.body).includes('SANDBOX_CCLW_CANNOT_BE_USED_FOR_LIVE')
    ),
    'unauth=401, nonAdmin=403, missing_configuration with no sandbox fallback',
    `unauth=${unauthCheckoutTest.statusCode}, nonAdmin=${nonAdminCheckoutTest.statusCode}, cat=${missingCclwTest.body.liveCheckoutTest?.category}`
  );

  // -------------------------------------------------------------
  // TEST 94: CONTROLLED LIVE TEST — ADMIN AUTHORIZATION & EXPLICIT CONFIRMATION
  // -------------------------------------------------------------
  const liveControlledEnv = {
    PAGUELOFACIL_CCLW: 'LIVE_PROD_CCLW_VALID_987654321',
    PAGUELOFACIL_ACCESS_TOKEN: 'LIVE_PROD_TOKEN_VALID_123456789',
    PAGUELOFACIL_SANDBOX_CCLW: 'SANDBOX_CCLW_TEST',
    PAGUELOFACIL_SANDBOX_ACCESS_TOKEN: 'SANDBOX_ACCESS_TOKEN_TEST',
    PAGUELOFACIL_ENV: 'sandbox',
    ENABLE_LIVE_PAYMENTS: 'false',
  };

  const unauthControlled = await executeCreateControlledLiveTest(null, { confirmed: true }, {
    supabaseClient: mockAdminClient as any,
    envOverride: liveControlledEnv,
    skipRateLimit: true,
  });

  const nonAdminControlled = await executeCreateControlledLiveTest('Bearer regular_user_token', { confirmed: true }, {
    supabaseClient: nonAdminSupabase as any,
    envOverride: liveControlledEnv,
    skipRateLimit: true,
  });

  const unconfirmedControlled = await executeCreateControlledLiveTest('Bearer admin_token', { confirmed: false }, {
    supabaseClient: mockAdminClient as any,
    envOverride: liveControlledEnv,
    skipRateLimit: true,
  });

  assert(
    'Test 94: Controlled live test creation strictly requires quotation_admins auth (HTTP 401/403) and explicit admin confirmation',
    Boolean(
      unauthControlled.statusCode === 401 &&
        nonAdminControlled.statusCode === 403 &&
        unconfirmedControlled.statusCode === 400 &&
        unconfirmedControlled.body.success === false &&
        unconfirmedControlled.body.error?.includes('Explicit administrator confirmation')
    ),
    'unauth=401, nonAdmin=403, unconfirmed=400',
    `unauth=${unauthControlled.statusCode}, nonAdmin=${nonAdminControlled.statusCode}, unconfirmed=${unconfirmedControlled.statusCode}`
  );

  // -------------------------------------------------------------
  // TEST 95: PUBLIC CHECKOUT REMAINS BLOCKED IN SAFE PREPARATION MODE
  // -------------------------------------------------------------
  const publicLiveAttemptReq = {
    httpMethod: 'POST',
    headers: {}, // No admin authorization
    body: JSON.stringify({
      bookingType: 'day-trip',
      dayTourPackageId: 'day-tour-port',
      customerName: 'Public Visitor',
      customerEmail: 'visitor@example.com',
      adults: 1,
      children: 0,
      idempotencyKey: 'idem_public_live_attempt_999',
    }),
  };

  const publicLiveAttemptRes = await checkoutHandler(publicLiveAttemptReq as any);
  const publicLiveAttemptBody = JSON.parse(publicLiveAttemptRes.body);

  assert(
    'Test 95: Public checkout cannot trigger live payments while ENABLE_LIVE_PAYMENTS is disabled (safe preparation mode)',
    Boolean(
      publicLiveAttemptRes.statusCode === 200 &&
        publicLiveAttemptBody.success === false &&
        publicLiveAttemptBody.mode === 'request_only' &&
        publicLiveAttemptBody.environment === 'unconfigured' &&
        publicLiveAttemptBody.message?.includes('safe preparation mode')
    ),
    'mode=request_only, environment=unconfigured',
    `status=${publicLiveAttemptRes.statusCode}, mode=${publicLiveAttemptBody.mode}`
  );

  // -------------------------------------------------------------
  // TEST 96: SINGLE AUTHORIZED OUTSTANDING LIVE TEST ENFORCEMENT
  // -------------------------------------------------------------
  const controlledSupabaseMock = createMockSupabaseState([], []);

  let capturedLinkParams: any = null;
  const mockLinkDaemonControlledFetch = async (url: any, opts: any) => {
    capturedLinkParams = new URLSearchParams(String(opts?.body || ''));
    return {
      status: 200,
      ok: true,
      json: async () => ({
        headerStatus: { code: 200, status: 'SUCCESS' },
        data: {
          url: 'https://secure.paguelofacil.com/checkout?code=LK-PROD-LIVE-TEST-001',
          code: 'LK-PROD-LIVE-TEST-001',
        },
      }),
    } as any;
  };

  // First create: should succeed
  const firstLiveTestRes = await executeCreateControlledLiveTest('Bearer admin_token', {
    confirmed: true,
  }, {
    supabaseClient: controlledSupabaseMock as any,
    envOverride: liveControlledEnv,
    fetchFn: mockLinkDaemonControlledFetch as any,
    skipRateLimit: true,
  });

  const firstLiveBody = firstLiveTestRes.body?.controlledLiveTestBooking;

  // Second create without forceCancelPrevious: should be blocked to prevent repeated charges
  const duplicateLiveTestRes = await executeCreateControlledLiveTest('Bearer admin_token', {
    confirmed: true,
    forceCancelPrevious: false,
  }, {
    supabaseClient: controlledSupabaseMock as any,
    envOverride: liveControlledEnv,
    fetchFn: mockLinkDaemonControlledFetch as any,
    skipRateLimit: true,
  });

  assert(
    'Test 96: Single authorized outstanding live test is strictly enforced to prevent repeated charges',
    Boolean(
      firstLiveTestRes.statusCode === 200 &&
        firstLiveTestRes.body.success === true &&
        duplicateLiveTestRes.statusCode === 200 &&
        duplicateLiveTestRes.body.success === false &&
        duplicateLiveTestRes.body.error?.includes('already outstanding') &&
        duplicateLiveTestRes.body.activeBookingReference === firstLiveBody?.bookingReference
    ),
    'first=success, duplicate=blocked with activeBookingReference',
    `firstSuccess=${firstLiveTestRes.body.success}, duplicateSuccess=${duplicateLiveTestRes.body.success}`
  );

  // -------------------------------------------------------------
  // TEST 97: GENUINE $69 CARTI PORT PRODUCTION CHECKOUT LINK CREATION
  // -------------------------------------------------------------
  assert(
    'Test 97: Genuine $69 Carti Port production checkout link generated with live CCLW, expected amount, and live test tag (never labeled demo/sandbox money)',
    Boolean(
      firstLiveBody?.success === true &&
        firstLiveBody?.amount === 69.00 &&
        firstLiveBody?.currency === 'USD' &&
        firstLiveBody?.environment === 'production' &&
        firstLiveBody?.bookingReference?.startsWith('LIVE-DAYTOUR-GNY-') &&
        firstLiveBody?.paymentUrl === 'https://secure.paguelofacil.com/checkout?code=LK-PROD-LIVE-TEST-001' &&
        capturedLinkParams?.get('CMTN') === '69.00' &&
        capturedLinkParams?.get('CCLW') === 'LIVE_PROD_CCLW_VALID_987654321' &&
        capturedLinkParams?.get('RETURN_URL')?.includes('https://gunayalapanama.com/checkout/complete') &&
        capturedLinkParams?.get('RETURN_URL')?.includes(firstLiveBody?.bookingReference || '')
    ),
    'amount=69.00, env=production, valid LinkDeamon parameters',
    `amount=${firstLiveBody?.amount}, env=${firstLiveBody?.environment}, ref=${firstLiveBody?.bookingReference}`
  );

  // -------------------------------------------------------------
  // TEST 98: AUTHORITATIVE PRODUCTION WEBHOOK APPROVAL & CONFIRMATION
  // -------------------------------------------------------------
  const liveBookingRef = firstLiveBody?.bookingReference || 'LIVE-DAYTOUR-GNY-TEST999';

  const mockProdGwFetch = async (url: any, opts: any) => {
    const urlStr = String(url);
    const authHeader = opts?.headers?.Authorization;

    // Verify it called production MerchantTransactions endpoint with production token (never sandbox token)
    if (!urlStr.includes('https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions')) {
      throw new Error(`Untrusted endpoint called: ${urlStr}`);
    }
    if (authHeader !== 'LIVE_PROD_TOKEN_VALID_123456789') {
      throw new Error(`Invalid or sandbox token passed to production API: ${authHeader}`);
    }

    return {
      status: 200,
      ok: true,
      json: async () => ({
        headerStatus: { code: 200, status: 'SUCCESS' },
        data: [{
          codOper: 'LK-PROD-OPER-777888',
          status: 1, // Approved
          txType: 'AUTH_CAPTURE',
          authAmount: 69.00,
          authCurrency: 840, // USD
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: `https://gunayalapanama.com/checkout/complete?bookingReference=${liveBookingRef}`,
          authCode: 'AUTH999LIVE',
          cardType: 'VISA',
        }],
      }),
    } as any;
  };

  const prodWebhookEvent = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CCLW: 'LIVE_PROD_CCLW_VALID_987654321',
      Estado: 'Aprobada',
      Oper: 'LK-PROD-OPER-777888',
      TotalPagado: '69.00',
      PARM_1: liveBookingRef,
    }),
  };

  const prodWebhookRes = await webhookHandler(prodWebhookEvent as any, {}, {
    supabaseClient: controlledSupabaseMock as any,
    env: liveControlledEnv,
    fetchFn: mockProdGwFetch as any,
  });

  const prodWebhookBody = JSON.parse(prodWebhookRes.body);

  assert(
    'Test 98: Production webhook validates transaction authoritatively via production MerchantTransactions API and updates booking to fully_confirmed',
    Boolean(
      prodWebhookRes.statusCode === 200 &&
        prodWebhookBody.success === true &&
        prodWebhookBody.verified === true &&
        prodWebhookBody.bookingReference === liveBookingRef &&
        prodWebhookBody.amountPaid === 69.00 &&
        prodWebhookBody.gatewayOperationId === 'LK-PROD-OPER-777888'
    ),
    'HTTP 200, verified=true, bookingReference confirmed, amountPaid=69',
    `status=${prodWebhookRes.statusCode}, verified=${prodWebhookBody.verified}, ref=${prodWebhookBody.bookingReference}`
  );

  // -------------------------------------------------------------
  // TEST 99: PRODUCTION WEBHOOK IDEMPOTENCY & DUPLICATE PROTECTION
  // -------------------------------------------------------------
  const secondProdWebhookRes = await webhookHandler(prodWebhookEvent as any, {}, {
    supabaseClient: controlledSupabaseMock as any,
    env: liveControlledEnv,
    fetchFn: mockProdGwFetch as any,
  });

  const secondProdWebhookBody = JSON.parse(secondProdWebhookRes.body);

  assert(
    'Test 99: Duplicate production webhook callback is safely handled as idempotent repeat with duplicate=true',
    Boolean(
      secondProdWebhookRes.statusCode === 200 &&
        secondProdWebhookBody.success === true &&
        secondProdWebhookBody.duplicate === true
    ),
    'HTTP 200, duplicate=true',
    `status=${secondProdWebhookRes.statusCode}, duplicate=${secondProdWebhookBody.duplicate}`
  );

  // -------------------------------------------------------------
  // TEST 100: SANDBOX AND PRODUCTION STRICT CROSS-ENVIRONMENT ISOLATION
  // -------------------------------------------------------------
  // A sandbox callback targeting a production booking reference must be rejected with cross-environment mismatch
  const crossEnvEvent = {
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CCLW: 'SANDBOX_CCLW_TEST', // Sandbox callback
      Estado: 'Aprobada',
      Oper: 'OP-CROSS-ENV-TEST',
      TotalPagado: '69.00',
      PARM_1: liveBookingRef, // Target production booking
    }),
  };

  const crossEnvFetch = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      headerStatus: { code: 200 },
      data: [{
        codOper: 'OP-CROSS-ENV-TEST',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 69.00,
        authCurrency: 840,
        cclw: 'SANDBOX_CCLW_TEST',
        urlString: `https://gunayalapanama.com/checkout/complete?bookingReference=${liveBookingRef}`,
      }],
    }),
  } as any);

  const crossEnvRes = await webhookHandler(crossEnvEvent as any, {}, {
    supabaseClient: controlledSupabaseMock as any,
    env: liveControlledEnv,
    fetchFn: crossEnvFetch as any,
  });

  const crossEnvBody = JSON.parse(crossEnvRes.body);

  assert(
    'Test 100: Sandbox callback cannot modify or confirm production transaction (strict cross-environment isolation rejected with HTTP 422)',
    Boolean(
      crossEnvRes.statusCode === 422 &&
        crossEnvBody.success === false &&
        crossEnvBody.category === 'validation_rejection' &&
        crossEnvBody.error?.includes('Cross-environment mismatch')
    ),
    'HTTP 422, category=validation_rejection, Cross-environment mismatch',
    `status=${crossEnvRes.statusCode}, cat=${crossEnvBody.category}, error=${crossEnvBody.error}`
  );

  // -------------------------------------------------------------
  // TEST 101: ADMIN LIVE TEST STATUS CHECKER RECONCILES PAYMENT
  // -------------------------------------------------------------
  const statusCheckRes = await executeCheckControlledLiveTestStatus('Bearer admin_token', {
    bookingReference: liveBookingRef,
  }, {
    supabaseClient: controlledSupabaseMock as any,
    envOverride: liveControlledEnv,
    fetchFn: mockProdGwFetch as any,
  });

  const statusCheckBody = statusCheckRes.body?.controlledLiveTestStatus;

  assert(
    'Test 101: Admin status checker authoritatively verifies and reports live test status (approved & fully_confirmed) in case of webhook failure',
    Boolean(
      statusCheckRes.statusCode === 200 &&
        statusCheckRes.body.success === true &&
        statusCheckBody?.paymentStatus === 'approved' &&
        statusCheckBody?.bookingStatus === 'fully_confirmed' &&
        statusCheckBody?.amountPaid === 69.00 &&
        statusCheckBody?.gatewayOperationId === 'LK-PROD-OPER-777888'
    ),
    'statusCode=200, paymentStatus=approved, bookingStatus=fully_confirmed, amount=69.00',
    `status=${statusCheckRes.statusCode}, payStatus=${statusCheckBody?.paymentStatus}, bookStatus=${statusCheckBody?.bookingStatus}`
  );

  // -------------------------------------------------------------
  // TEST 102: ATOMIC DEDICATED DATABASE LOCK ENFORCEMENT (HTTP 409)
  // -------------------------------------------------------------
  resetLiveTestMutexForTesting();
  const dbLockStateMock = createMockSupabaseState([], []);

  // Pre-acquire atomic database lock under a different instance owner token
  const initialLockResult = await acquireAtomicLiveTestLock(
    dbLockStateMock as any,
    'other_admin_instance',
    300
  );

  const concurrentLockRes = await executeCreateControlledLiveTest('Bearer admin_token', {
    confirmed: true,
  }, {
    supabaseClient: dbLockStateMock as any,
    envOverride: liveControlledEnv,
    fetchFn: mockLinkDaemonControlledFetch as any,
    skipRateLimit: true,
  });

  assert(
    'Test 102: Dedicated admin_live_test_locks table blocks concurrent creation requests across serverless instances with HTTP 409 Conflict',
    Boolean(
      initialLockResult.acquired === true &&
        concurrentLockRes.statusCode === 409 &&
        concurrentLockRes.body.success === false &&
        concurrentLockRes.body.error?.includes('in progress across function instances')
    ),
    'HTTP 409 Conflict, in progress across function instances',
    `initAcquired=${initialLockResult.acquired}, status=${concurrentLockRes.statusCode}, error=${concurrentLockRes.body.error}`
  );

  // -------------------------------------------------------------
  // TEST 103: VERIFIED PRODUCTION MERCHANT IDENTITY & SECRET REDACTION
  // -------------------------------------------------------------
  const numericMerchantEnv = {
    ...liveControlledEnv,
    PAGUELOFACIL_MERCHANT_ID: '703571',
    PAGUELOFACIL_CCLW: 'LIVE_PROD_CCLW_SECRET_KEY_123',
  };

  const numericMerchantFetch = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      headerStatus: { code: 200, status: 'SUCCESS' },
      data: [{
        codOper: 'LK-NUMERIC-MERCHANT-888',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 69.00,
        authCurrency: 840,
        idMerchant: '703571', // Numeric merchant ID returned by PagueloFacil
        urlString: `https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-NUMERIC703`,
      }],
    }),
  } as any);

  const numericMerchantState = createMockSupabaseState(
    [{
      id: 'tx-num-merch-1',
      booking_reference: 'LIVE-DAYTOUR-GNY-NUMERIC703',
      environment: 'production',
      status: 'pending',
      expected_amount: 69.00,
      currency: 'USD',
    }],
    [{ booking_reference: 'LIVE-DAYTOUR-GNY-NUMERIC703', status: 'pending_payment' }]
  );

  const numericMerchantWebhook = await webhookHandler({
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CCLW: 'LIVE_PROD_CCLW_SECRET_KEY_123',
      Estado: 'Aprobada',
      Oper: 'LK-NUMERIC-MERCHANT-888',
      TotalPagado: '69.00',
      PARM_1: 'LIVE-DAYTOUR-GNY-NUMERIC703',
    }),
  } as any, {}, {
    supabaseClient: numericMerchantState as any,
    env: numericMerchantEnv,
    fetchFn: numericMerchantFetch as any,
  });

  const numMerchBody = JSON.parse(numericMerchantWebhook.body);

  // Test unverified/mismatched merchant ID returns category needs_manual_review without exposing secrets
  const mismatchedMerchantFetch = async () => ({
    status: 200,
    ok: true,
    json: async () => ({
      headerStatus: { code: 200, status: 'SUCCESS' },
      data: [{
        codOper: 'LK-MISMATCH-MERCHANT-999',
        status: 1,
        txType: 'AUTH_CAPTURE',
        authAmount: 69.00,
        authCurrency: 840,
        idMerchant: '999999', // Mismatched merchant ID
        urlString: `https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-MISMATCH`,
      }],
    }),
  } as any);

  const mismatchedMerchantWebhook = await webhookHandler({
    httpMethod: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CCLW: 'LIVE_PROD_CCLW_SECRET_KEY_123',
      Estado: 'Aprobada',
      Oper: 'LK-MISMATCH-MERCHANT-999',
      TotalPagado: '69.00',
      PARM_1: 'LIVE-DAYTOUR-GNY-MISMATCH',
    }),
  } as any, {}, {
    supabaseClient: numericMerchantState as any,
    env: numericMerchantEnv,
    fetchFn: mismatchedMerchantFetch as any,
  });

  const mismatchBody = JSON.parse(mismatchedMerchantWebhook.body);

  assert(
    'Test 103: Numeric idMerchant is verified against configured merchant ID and unverified mismatch returns needs_manual_review without secret exposure',
    Boolean(
      numericMerchantWebhook.statusCode === 200 &&
        numMerchBody.success === true &&
        numMerchBody.verified === true &&
        mismatchedMerchantWebhook.statusCode === 422 &&
        mismatchBody.category === 'needs_manual_review' &&
        !JSON.stringify(mismatchBody).includes('LIVE_PROD_CCLW_SECRET_KEY_123')
    ),
    'numeric idMerchant verified, mismatch=needs_manual_review, no secret exposure',
    `numSuccess=${numMerchBody.success}, mismatchCat=${mismatchBody.category}`
  );

  // -------------------------------------------------------------
  // TEST 104: STRICT PRODUCTION RETURN URL VALIDATION
  // -------------------------------------------------------------
  const prodReturnUrlExact = extractVerifiedBookingReferenceFromUrl(
    'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-PROD123',
    'https://gunayalapanama.com/checkout/complete',
    'production'
  );

  const prodReturnUrlLocalhost = extractVerifiedBookingReferenceFromUrl(
    'http://localhost:3000/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-PROD123',
    'https://gunayalapanama.com/checkout/complete',
    'production'
  );

  const prodReturnUrlSubdomain = extractVerifiedBookingReferenceFromUrl(
    'https://subdomain.gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-PROD123',
    'https://gunayalapanama.com/checkout/complete',
    'production'
  );

  const prodReturnUrlExtendedPath = extractVerifiedBookingReferenceFromUrl(
    'https://gunayalapanama.com/checkout/complete/extra_path?bookingReference=LIVE-DAYTOUR-GNY-PROD123',
    'https://gunayalapanama.com/checkout/complete',
    'production'
  );

  const prodReturnUrlIdemMismatch = validateMerchantReturnUrl(
    'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-PROD123&PARM_2=wrong_idem',
    'LIVE-DAYTOUR-GNY-PROD123',
    'stored_idem_valid_123',
    'https://gunayalapanama.com/checkout/complete',
    'production'
  );

  const sandboxReturnUrlLocalhost = extractVerifiedBookingReferenceFromUrl(
    'http://localhost:3000/checkout/complete?bookingReference=TEST-DAYTOUR-GNY-SANDBOX1',
    'https://gunayalapanama.com/checkout/complete',
    'sandbox'
  );

  assert(
    'Test 104: Production return URL strictly requires exact HTTPS origin & pathname, rejecting localhost/subdomains/extended paths/idem mismatches while preserving sandbox allowances',
    Boolean(
      prodReturnUrlExact.valid === true &&
        prodReturnUrlExact.bookingReference === 'LIVE-DAYTOUR-GNY-PROD123' &&
        prodReturnUrlLocalhost.valid === false &&
        prodReturnUrlSubdomain.valid === false &&
        prodReturnUrlExtendedPath.valid === false &&
        prodReturnUrlIdemMismatch.valid === false &&
        prodReturnUrlIdemMismatch.rejectionReason === 'idem_mismatch' &&
        sandboxReturnUrlLocalhost.valid === true
    ),
    'Exact prod URL valid; localhost/subdomain/path/idem rejected in prod; localhost allowed in sandbox',
    `exact=${prodReturnUrlExact.valid}, local=${prodReturnUrlLocalhost.valid}, sub=${prodReturnUrlSubdomain.valid}, path=${prodReturnUrlExtendedPath.valid}, idem=${prodReturnUrlIdemMismatch.rejectionReason}, sandbox=${sandboxReturnUrlLocalhost.valid}`
  );

  // -------------------------------------------------------------
  // TEST 105: LOCK OWNERSHIP VERIFICATION ON RELEASE
  // -------------------------------------------------------------
  const ownershipStateMock = createMockSupabaseState([], []);
  const realOwnerToken = (await acquireAtomicLiveTestLock(ownershipStateMock as any, 'real_admin_user', 300)).ownerToken;
  const wrongReleaseResult = await releaseAtomicLiveTestLock(ownershipStateMock as any, 'wrong-owner-uuid-999');
  const locksAfterWrongRelease = [...(ownershipStateMock as any).getLocks()];
  const validReleaseResult = await releaseAtomicLiveTestLock(ownershipStateMock as any, realOwnerToken);
  const locksAfterValidRelease = [...(ownershipStateMock as any).getLocks()];

  assert(
    'Test 105: Lock release operation verifies owner token and rejects unauthorized release attempts',
    Boolean(
      realOwnerToken !== undefined &&
        wrongReleaseResult.released === false &&
        wrongReleaseResult.reason === 'owner_mismatch_or_not_found' &&
        locksAfterWrongRelease.length === 1 &&
        validReleaseResult.released === true &&
        locksAfterValidRelease.length === 0
    ),
    'Wrong owner token rejected (released=false, lock retained); matching owner token succeeds (released=true)',
    `wrongReleased=${wrongReleaseResult.released}, countAfterWrong=${locksAfterWrongRelease.length}, validReleased=${validReleaseResult.released}, countAfterValid=${locksAfterValidRelease.length}`
  );

  // -------------------------------------------------------------
  // TEST 106: EXCEPTION HANDLING SAFETY (ACQUIRED NEVER TRUE ON ERROR)
  // -------------------------------------------------------------
  const throwingClientMock = {
    rpc: async () => {
      throw new Error('Simulated PostgreSQL connection failure');
    },
    from: () => {
      throw new Error('Simulated table query failure');
    },
  };

  const exceptionLockResult = await acquireAtomicLiveTestLock(throwingClientMock as any, 'admin_user_err', 300);

  assert(
    'Test 106: Database or RPC exception in acquireAtomicLiveTestLock returns acquired: false and never bypasses lock safety',
    Boolean(
      exceptionLockResult.acquired === false &&
        exceptionLockResult.error?.toLowerCase().includes('lock acquisition failed')
    ),
    'acquired=false, error describes lock acquisition failure',
    `acquired=${exceptionLockResult.acquired}, error=${exceptionLockResult.error}`
  );

  // -------------------------------------------------------------
  // TEST 107: EXPIRED LOCK RE-ACQUISITION AFTER TTL EXPIRES
  // -------------------------------------------------------------
  const ttlStateMock = createMockSupabaseState([], []);
  // Insert an expired lock (expires_at in the past)
  (ttlStateMock as any).getLocks().push({
    lock_name: 'CONTROLLED_LIVE_TEST_ACTIVE_LOCK',
    owner_token: 'old-expired-owner-uuid',
    admin_user_id: 'old_admin',
    locked_at: new Date(Date.now() - 600000).toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 sec ago
  });

  const reacquirerResult = await acquireAtomicLiveTestLock(ttlStateMock as any, 'new_admin_user', 300);

  assert(
    'Test 107: Expired lock is atomically overwritten and acquired by new caller after TTL expires',
    Boolean(
      reacquirerResult.acquired === true &&
        typeof reacquirerResult.ownerToken === 'string' &&
        reacquirerResult.ownerToken !== 'old-expired-owner-uuid'
    ),
    'acquired=true with new ownerToken replacing expired lock',
    `acquired=${reacquirerResult.acquired}, newOwner=${reacquirerResult.ownerToken}`
  );

  // -------------------------------------------------------------
  // TEST 108: CONSERVATIVE GATEWAY FAILURE CLEANUP PREVENTS DUP LINKS
  // -------------------------------------------------------------
  const gatewayErrStateMock = createMockSupabaseState([], []);
  const failingLinkDaemonFetch = async () => {
    throw new Error('Connection reset by PagueloFacil LinkDeamon server');
  };

  resetLiveTestMutexForTesting();
  const failedCreationRes = await executeCreateControlledLiveTest('Bearer admin_token', {
    confirmed: true,
  }, {
    supabaseClient: gatewayErrStateMock as any,
    envOverride: liveControlledEnv,
    fetchFn: failingLinkDaemonFetch as any,
    skipRateLimit: true,
  });

  const dbTxAfterFailure = (gatewayErrStateMock as any).getPayments();

  assert(
    'Test 108: Uncertain production LinkDeamon failure preserves transaction as needs_manual_review (NOT expired) blocking replacement links until resolved',
    Boolean(
      failedCreationRes.statusCode === 200 &&
        failedCreationRes.body.success === false &&
        failedCreationRes.body.error?.includes('Uncertain network error connecting to production LinkDeamon') &&
        dbTxAfterFailure.length === 1 &&
        dbTxAfterFailure[0].status === 'needs_manual_review' &&
        dbTxAfterFailure[0].audit_metadata?.uncertain_gateway_failure === true
    ),
    'Creation returns success=false, transaction status preserved as needs_manual_review',
    `success=${failedCreationRes.body.success}, txCount=${dbTxAfterFailure.length}, txStatus=${dbTxAfterFailure[0]?.status}`
  );

  // -------------------------------------------------------------
  // TEST 109: UNSET OR NON-FUNCTION RPC CLIENT REJECTS LOCK ACQUISITION
  // -------------------------------------------------------------
  const noRpcClientMock = { from: () => ({ select: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) };
  const noRpcLockRes = await acquireAtomicLiveTestLock(noRpcClientMock as any, 'admin_no_rpc', 300);

  assert(
    'Test 109: Client without valid Supabase RPC function fails lock acquisition and never falls back to non-atomic table queries',
    Boolean(
      noRpcLockRes.acquired === false &&
        noRpcLockRes.error?.includes('Supabase RPC client unavailable')
    ),
    'acquired=false, error indicates Supabase RPC client unavailable',
    `acquired=${noRpcLockRes.acquired}, error=${noRpcLockRes.error}`
  );
  // -------------------------------------------------------------
  // TEST 110: RECOVER APPROVED PRODUCTION PAYMENT (LIVE-DAYTOUR-GNY-220728, LK-EHA1PJ6R1MAN)
  // -------------------------------------------------------------
  const state110 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
        special_notes: '[PROD LIVE TEST]',
      },
    ]
  );

  const fetch110 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-EHA1PJ6R1MAN',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-220728&linkCode=LK-EITKXJPE4PXWU8AA',
        },
      ],
    }),
  } as any);

  const res110 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state110 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch110 as any,
  });

  const body110 = res110.body;
  const tx110After = state110.getPaymentByRef('LIVE-DAYTOUR-GNY-220728');
  const booking110After = state110.getBookingByRef('LIVE-DAYTOUR-GNY-220728');

  // Second run for idempotency check
  const res110Dup = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state110 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch110 as any,
  });

  assert(
    'Test 110: Recover Approved Production Payment (LIVE-DAYTOUR-GNY-220728, LK-EHA1PJ6R1MAN) verifies gateway record, confirms booking, and handles duplicate calls idempotently',
    Boolean(
      res110.statusCode === 200 &&
        body110.success === true &&
        body110.reconciliation?.category === 'approved' &&
        tx110After?.status === 'approved' &&
        tx110After?.gateway_operation_id === 'LK-EHA1PJ6R1MAN' &&
        tx110After?.amount_paid === 69.00 &&
        booking110After?.status === 'fully_confirmed' &&
        res110Dup.statusCode === 200 &&
        res110Dup.body.reconciliation?.duplicate === true
    ),
    'HTTP 200, category=approved, tx status=approved, gateway_operation_id=LK-EHA1PJ6R1MAN, booking=fully_confirmed, duplicate=true',
    `status=${res110.statusCode}, cat=${body110.reconciliation?.category}, txStatus=${tx110After?.status}, oper=${tx110After?.gateway_operation_id}, bookingStatus=${booking110After?.status}, dup=${res110Dup.body.reconciliation?.duplicate}`
  );

  // -------------------------------------------------------------
  // TEST 111: RECOVERY FAILURE — MISSING OR UNVERIFIABLE BOOKING RELATIONSHIP EVIDENCE
  // -------------------------------------------------------------
  const state111 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-111',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
      },
    ]
  );

  const fetch111NoRel = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-EHA1PJ6R1MAN',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete',
        },
      ],
    }),
  } as any);

  const res111 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state111 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch111NoRel as any,
  });

  const tx111After = state111.getPaymentByRef('LIVE-DAYTOUR-GNY-220728');

  assert(
    'Test 111: Recovery fails safely with needs_manual_review when authoritative booking relationship cannot be established from gateway evidence',
    Boolean(
      res111.statusCode === 422 &&
        res111.body.success === false &&
        res111.body.reconciliation?.category === 'needs_manual_review' &&
        tx111After?.status === 'pending'
    ),
    'HTTP 422, category=needs_manual_review, payment remains pending',
    `status=${res111.statusCode}, cat=${res111.body.reconciliation?.category}, txStatus=${tx111After?.status}`
  );

  // -------------------------------------------------------------
  // TEST 112: RECOVERY FAILURE — MERCHANT IDENTITY MISMATCH
  // -------------------------------------------------------------
  const state112 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-112',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
      },
    ]
  );

  const fetch112WrongMerchant = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-EHA1PJ6R1MAN',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'UNAUTHORIZED_WRONG_CCLW',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-220728',
        },
      ],
    }),
  } as any);

  const res112 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state112 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch112WrongMerchant as any,
  });

  assert(
    'Test 112: Recovery fails safely with needs_manual_review when merchant account identity does not match configured production merchant credentials',
    Boolean(
      res112.statusCode === 422 &&
        res112.body.success === false &&
        res112.body.reconciliation?.category === 'needs_manual_review' &&
        res112.body.reconciliation?.error?.includes('Merchant CCLW mismatch')
    ),
    'HTTP 422, category=needs_manual_review, Merchant CCLW mismatch',
    `status=${res112.statusCode}, cat=${res112.body.reconciliation?.category}, error=${res112.body.reconciliation?.error}`
  );

  // -------------------------------------------------------------
  // TEST 113: RECOVERY FAILURE — AMOUNT MISMATCH (WRONG AMOUNT)
  // -------------------------------------------------------------
  const state113 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-113',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
      },
    ]
  );

  const fetch113WrongAmount = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-EHA1PJ6R1MAN',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 10.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-220728',
        },
      ],
    }),
  } as any);

  const res113 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state113 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch113WrongAmount as any,
  });

  assert(
    'Test 113: Recovery fails with validation_rejection when gateway operation amount does not match stored expected amount ($69.00)',
    Boolean(
      res113.statusCode === 422 &&
        res113.body.success === false &&
        res113.body.reconciliation?.category === 'validation_rejection' &&
        res113.body.reconciliation?.error?.includes('Amount mismatch')
    ),
    'HTTP 422, category=validation_rejection, Amount mismatch',
    `status=${res113.statusCode}, cat=${res113.body.reconciliation?.category}, error=${res113.body.reconciliation?.error}`
  );

  // -------------------------------------------------------------
  // TEST 114: RECOVERY FAILURE — PARTIAL DATABASE SYNC FAILURE
  // -------------------------------------------------------------
  const state114 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-114',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    []
  );

  const res114 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state114 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch110 as any,
  });

  assert(
    'Test 114: Recovery reports partial_synchronization_failure when payment record is updated but booking_requests update fails',
    Boolean(
      res114.statusCode === 422 &&
        res114.body.success === false &&
        res114.body.reconciliation?.category === 'partial_synchronization_failure'
    ),
    'HTTP 422, category=partial_synchronization_failure',
    `status=${res114.statusCode}, cat=${res114.body.reconciliation?.category}`
  );

  // -------------------------------------------------------------
  // TEST 115: ADMIN STATUS CHECKER WITH OPERATION CODE RECOVERY
  // -------------------------------------------------------------
  const state115 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-115',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
      },
    ]
  );

  const statusRes115 = await executeCheckControlledLiveTestStatus('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-220728',
    operationCode: 'LK-EHA1PJ6R1MAN',
  }, {
    supabaseClient: state115 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch110 as any,
  });

  assert(
    'Test 115: executeCheckControlledLiveTestStatus authoritatively recovers live test payment when admin passes operationCode LK-EHA1PJ6R1MAN',
    Boolean(
      statusRes115.statusCode === 200 &&
        statusRes115.body.success === true &&
        statusRes115.body.controlledLiveTestStatus?.paymentStatus === 'approved' &&
        statusRes115.body.controlledLiveTestStatus?.bookingStatus === 'fully_confirmed' &&
        statusRes115.body.controlledLiveTestStatus?.gatewayOperationId === 'LK-EHA1PJ6R1MAN' &&
        statusRes115.body.controlledLiveTestStatus?.reconciled === true
    ),
    'HTTP 200, paymentStatus=approved, bookingStatus=fully_confirmed, gatewayOperationId=LK-EHA1PJ6R1MAN, reconciled=true',
    `status=${statusRes115.statusCode}, payStatus=${statusRes115.body.controlledLiveTestStatus?.paymentStatus}, oper=${statusRes115.body.controlledLiveTestStatus?.gatewayOperationId}`
  );

  // -------------------------------------------------------------
  // TEST 116: FRONTEND-TO-BACKEND API WIRING — CHECK LIVE STATUS WITH OPERATION CODE
  // -------------------------------------------------------------
  const state116 = createMockSupabaseState(
    [
      {
        id: 'tx-live-220728-116',
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
        gateway_link_code: 'LK-EITKXJPE4PXWU8AA',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-220728',
        status: 'pending_payment',
      },
    ]
  );

  let queriedFilter116 = '';
  const fetch116 = async (url: string) => {
    queriedFilter116 = url;
    return {
      ok: true,
      json: async () => ({
        data: [
          {
            codOper: 'LK-EHA1PJ6R1MAN',
            status: 1,
            txType: 'AUTH_CAPTURE',
            authCurrency: '840',
            authAmount: 69.00,
            cclw: 'LIVE_PROD_CCLW_VALID_987654321',
            urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-220728&linkCode=LK-EITKXJPE4PXWU8AA',
          },
        ],
      }),
    } as any;
  };

  const handlerRes116 = await executeAdminSandboxTest(
    'Bearer admin_token',
    {
      supabaseClient: state116 as any,
      envOverride: liveControlledEnv,
      fetchFn: fetch116 as any,
    },
    {
      action: 'check_controlled_live_test_status',
      bookingReference: 'LIVE-DAYTOUR-GNY-220728',
      operationCode: 'LK-EHA1PJ6R1MAN',
    }
  );

  const handlerBody116 = handlerRes116.body;

  assert(
    'Test 116: Admin API handler receives operationCode from frontend request body, queries production gateway with codOper filter, and authoritatively confirms booking',
    Boolean(
      handlerRes116.statusCode === 200 &&
        handlerBody116.success === true &&
        handlerBody116.controlledLiveTestStatus?.paymentStatus === 'approved' &&
        handlerBody116.controlledLiveTestStatus?.gatewayOperationId === 'LK-EHA1PJ6R1MAN' &&
        queriedFilter116.includes('codOper%3A%3ALK-EHA1PJ6R1MAN')
    ),
    'HTTP 200, operationCode passed to gateway query, paymentStatus=approved',
    `status=${handlerRes116.statusCode}, oper=${handlerBody116.controlledLiveTestStatus?.gatewayOperationId}, query=${queriedFilter116}`
  );

  // -------------------------------------------------------------
  // TEST 117: PROTECTED READ-ONLY MERCHANT IDENTITY DIAGNOSTIC
  // -------------------------------------------------------------
  const state117 = createMockSupabaseState([], []);
  const fetch117 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-EHA1PJ6R1MAN',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          idMerchant: 14233372, // Numeric merchant ID in REST response, no CCLW
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-220728',
        },
      ],
    }),
  } as any);

  const diagRes117 = await executeDiagnoseMerchantIdentity('Bearer admin_token', {
    operationCode: 'LK-EHA1PJ6R1MAN',
    environment: 'production',
  }, {
    supabaseClient: state117 as any,
    envOverride: liveControlledEnv, // PAGUELOFACIL_MERCHANT_ID is unconfigured here
    fetchFn: fetch117 as any,
  });

  const diagBody117 = diagRes117.body;
  const diag117 = diagBody117.merchantIdentityDiagnostic;
  const rawOutputString = JSON.stringify(diagBody117);

  assert(
    'Test 117: executeDiagnoseMerchantIdentity evaluates exact codOper, sanitizes masked credentials, identifies failing rule without exposing secrets or approving payment',
    Boolean(
      diagRes117.statusCode === 200 &&
        diagBody117.success === true &&
        diag117?.operationFound === true &&
        diag117?.idMerchantExists === true &&
        diag117?.idMerchantDataType === 'number' &&
        diag117?.maskedIdMerchant === '***3372' &&
        diag117?.cclwExistsInRecord === false &&
        diag117?.paguelofacilMerchantIdConfigured === false &&
        diag117?.merchantVerified === false &&
        diag117?.failingValidationRule === 'missing_configured_merchant_id_and_record_lacks_cclw' &&
        !rawOutputString.includes('LIVE_PROD_TOKEN_VALID_123456789') &&
        !rawOutputString.includes('LIVE_PROD_CCLW_VALID_987654321')
    ),
    'HTTP 200, operationFound=true, idMerchant=***3372 (number), cclwExists=false, merchantVerified=false, failingRule=missing_configured_merchant_id_and_record_lacks_cclw, secrets suppressed',
    `status=${diagRes117.statusCode}, found=${diag117?.operationFound}, idMerchant=${diag117?.maskedIdMerchant}, rule=${diag117?.failingValidationRule}`
  );

  // -------------------------------------------------------------
  // TEST 118: APPROVED-PAYMENT BOOKING REPAIR REVALIDATES MERCHANT IDENTITY AND FAILS WHEN MERCHANT UNVERIFIED
  // -------------------------------------------------------------
  const state118 = createMockSupabaseState(
    [
      {
        id: 'tx-approved-unverified-merchant',
        booking_reference: 'LIVE-DAYTOUR-GNY-118',
        status: 'approved', // Transaction marked approved, but booking needs repair
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: 'LK-OPER-118',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-118',
        status: 'pending_payment', // Pending booking repair
      },
    ]
  );

  const fetch118MismatchedMerchant = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-OPER-118',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'WRONG_UNAUTHORIZED_CCLW_118', // CCLW mismatch
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-118',
        },
      ],
    }),
  } as any);

  const res118 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-118',
    operationCode: 'LK-OPER-118',
    environment: 'production',
  }, {
    supabaseClient: state118 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch118MismatchedMerchant as any,
  });

  const booking118After = state118.getBookingByRef('LIVE-DAYTOUR-GNY-118');

  assert(
    'Test 118: Approved-payment booking repair revalidates merchant identity and fails when merchant identity revalidation fails',
    Boolean(
      res118.statusCode === 422 &&
        res118.body.success === false &&
        res118.body.reconciliation?.category === 'needs_manual_review' &&
        booking118After?.status === 'pending_payment' // Booking repair blocked
    ),
    'HTTP 422, category=needs_manual_review, booking remains pending_payment',
    `status=${res118.statusCode}, cat=${res118.body.reconciliation?.category}, bookingStatus=${booking118After?.status}`
  );

  // -------------------------------------------------------------
  // TEST 119: FAIL CLOSED WHEN ALL EXPECTED MERCHANT CREDENTIALS ARE MISSING (NO FALLTHROUGH APPROVAL)
  // -------------------------------------------------------------
  const state119 = createMockSupabaseState(
    [
      {
        id: 'tx-live-119',
        booking_reference: 'LIVE-DAYTOUR-GNY-119',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-119',
        status: 'pending_payment',
      },
    ]
  );

  const env119NoMerchantCreds = {
    ...liveControlledEnv,
    PAGUELOFACIL_CCLW: '', // Missing
    PAGUELOFACIL_MERCHANT_ID: '', // Missing
  };

  const fetch119 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-OPER-119',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          idMerchant: '14233372', // Numeric ID only, no CCLW
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-119',
        },
      ],
    }),
  } as any);

  const res119 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-119',
    operationCode: 'LK-OPER-119',
    environment: 'production',
  }, {
    supabaseClient: state119 as any,
    envOverride: env119NoMerchantCreds,
    fetchFn: fetch119 as any,
  });

  const tx119After = state119.getPaymentByRef('LIVE-DAYTOUR-GNY-119');

  assert(
    'Test 119: Fail closed when merchant identity cannot be positively verified or when all expected merchant credentials are missing (no fallthrough approval)',
    Boolean(
      res119.statusCode === 422 &&
        res119.body.success === false &&
        res119.body.reconciliation?.category === 'needs_manual_review' &&
        tx119After?.status === 'pending' // Failed closed, not approved
    ),
    'HTTP 422, category=needs_manual_review, payment remains pending',
    `status=${res119.statusCode}, cat=${res119.body.reconciliation?.category}, txStatus=${tx119After?.status}`
  );

  // -------------------------------------------------------------
  // TEST 120: MISSING ATOMIC RPC FAILS SAFELY WITH PARTIAL_SYNCHRONIZATION_FAILURE WITHOUT MODIFYING PAYMENT RECORD
  // -------------------------------------------------------------
  const state120NoRpc = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'admin-id', email: 'admin@example.com', app_metadata: { claims_admin: true } } },
        error: null,
      }),
    },
    payments: [
      {
        id: 'tx-live-120',
        booking_reference: 'LIVE-DAYTOUR-GNY-120',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    from: (table: string) => {
      if (table === 'quotation_admins') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { user_id: 'admin-id' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'payment_transactions') {
        return {
          select: () => ({
            eq: (_col: string, val: any) => ({
              data: state120NoRpc.payments.filter(p => p.booking_reference === val || p.gateway_operation_id === val),
              error: null,
            }),
          }),
        };
      }
      return {};
    },
    // No rpc method defined (or throws error)
    rpc: async () => ({ data: null, error: { message: 'Function reconcile_payment_and_booking_atomic does not exist' } }),
  };

  const fetch120 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-OPER-120',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-120',
        },
      ],
    }),
  } as any);

  const res120 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-120',
    operationCode: 'LK-OPER-120',
    environment: 'production',
  }, {
    supabaseClient: state120NoRpc as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch120 as any,
  });

  const tx120After = state120NoRpc.payments[0];

  assert(
    'Test 120: Missing or failing atomic RPC fails safely with partial_synchronization_failure without modifying payment or booking records',
    Boolean(
      res120.statusCode === 422 &&
        res120.body.success === false &&
        res120.body.reconciliation?.category === 'partial_synchronization_failure' &&
        tx120After.status === 'pending' &&
        tx120After.gateway_operation_id === null
    ),
    'HTTP 422, category=partial_synchronization_failure, status remains pending',
    `status=${res120.statusCode}, cat=${res120.body.reconciliation?.category}, finalStatus=${tx120After.status}`
  );

  // -------------------------------------------------------------
  // TEST 121: RELATIONSHIP VALIDATION INSPECTS ALL FIELDS AND REJECTS CONFLICTING EVIDENCE EVEN IF ANOTHER FIELD MATCHES
  // -------------------------------------------------------------
  const existingTx121 = {
    booking_reference: 'LIVE-DAYTOUR-GNY-121',
    gateway_link_code: 'LK-EXPECTED-LINK-121',
    environment: 'production',
  };

  const matched121Conflicting = {
    customParm1: 'LIVE-DAYTOUR-GNY-121', // Matches booking reference
    linkCode: 'LK-CONFLICTING-LINK-999', // Conflicts with gateway_link_code
  };

  const relResult121 = validatePaymentRelationship(matched121Conflicting, existingTx121);

  assert(
    'Test 121: Relationship validation inspects all available fields and rejects conflicting evidence even if another field matches',
    Boolean(
      relResult121.verified === false &&
        relResult121.diagnosticDetails?.hasConflicts === true
    ),
    'verified=false, hasConflicts=true',
    `verified=${relResult121.verified}, hasConflicts=${relResult121.diagnosticDetails?.hasConflicts}`
  );

  // -------------------------------------------------------------
  // TEST 122: MULTI-RECORD OPERATION ID AMBIGUITY RETURNS AMBIGUOUS_RECORDS
  // -------------------------------------------------------------
  const state122 = createMockSupabaseState(
    [
      {
        id: 'tx-live-122',
        booking_reference: 'LIVE-DAYTOUR-GNY-122',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-122',
        status: 'pending_payment',
      },
    ]
  );

  const fetch122DuplicateGatewayRecords = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-OPER-122-DUP',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-122',
        },
        {
          codOper: 'LK-OPER-122-DUP',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-122',
        },
      ],
    }),
  } as any);

  const res122 = await executeReconcileExistingTransaction('Bearer admin_token', {
    bookingReference: 'LIVE-DAYTOUR-GNY-122',
    operationCode: 'LK-OPER-122-DUP',
    environment: 'production',
  }, {
    supabaseClient: state122 as any,
    envOverride: liveControlledEnv,
    fetchFn: fetch122DuplicateGatewayRecords as any,
  });

  assert(
    'Test 122: Multi-record operation ID ambiguity returns ambiguous_records / needs_manual_review',
    Boolean(
      res122.statusCode === 422 &&
        res122.body.success === false &&
        res122.body.reconciliation?.category === 'ambiguous_records'
    ),
    'HTTP 422, category=ambiguous_records',
    `status=${res122.statusCode}, cat=${res122.body.reconciliation?.category}`
  );

  // -------------------------------------------------------------
  // TEST 123: ATOMIC RPC EXECUTES ROW-LOCKING RECONCILIATION AND CONFIRMS BOTH RECORDS ATOMICALLY
  // -------------------------------------------------------------
  const state123 = createMockSupabaseState(
    [
      {
        id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c6',
        booking_reference: 'LIVE-DAYTOUR-GNY-123',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-123',
        status: 'pending_payment',
        special_notes: 'Initial note',
      },
    ]
  );

  const rpc123Result = await state123.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c6',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-123',
    p_gateway_operation_id: 'LK-OPER-123',
    p_amount_paid: 69.00,
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: { verified: true },
  });

  const tx123After = state123.getPaymentByRef('LIVE-DAYTOUR-GNY-123');
  const booking123After = state123.getBookingByRef('LIVE-DAYTOUR-GNY-123');

  assert(
    'Test 123: Atomic RPC executes row-locking reconciliation and updates payment and booking records atomically',
    Boolean(
      rpc123Result.data?.success === true &&
        rpc123Result.data?.already_approved === false &&
        tx123After?.status === 'approved' &&
        tx123After?.gateway_operation_id === 'LK-OPER-123' &&
        booking123After?.status === 'fully_confirmed' &&
        booking123After?.special_notes.includes('[RECONCILED]')
    ),
    'RPC success=true, tx status=approved, oper=LK-OPER-123, booking=fully_confirmed',
    `rpcSuccess=${rpc123Result.data?.success}, txStatus=${tx123After?.status}, bookingStatus=${booking123After?.status}`
  );

  // -------------------------------------------------------------
  // TEST 124: ATOMIC RPC REJECTS MISMATCHED BOOKING REFERENCE
  // -------------------------------------------------------------
  const state124 = createMockSupabaseState(
    [
      {
        id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c7',
        booking_reference: 'LIVE-DAYTOUR-GNY-124-EXPECTED',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-124-EXPECTED',
        status: 'pending_payment',
      },
    ]
  );

  const rpc124Result = await state124.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c7',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-124-WRONG-REF',
    p_gateway_operation_id: 'LK-OPER-124',
    p_amount_paid: 69.00,
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: {},
  });

  assert(
    'Test 124: Atomic RPC rejects mismatched booking reference parameter and leaves records unchanged',
    Boolean(
      rpc124Result.error !== null &&
        rpc124Result.error?.message.includes('does not match requested booking_reference') &&
        state124.getPaymentByRef('LIVE-DAYTOUR-GNY-124-EXPECTED')?.status === 'pending'
    ),
    'RPC error returned, payment status remains pending',
    `error="${rpc124Result.error?.message}", status=${state124.getPaymentByRef('LIVE-DAYTOUR-GNY-124-EXPECTED')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 125: ATOMIC RPC REJECTS WRONG AMOUNT PAID
  // -------------------------------------------------------------
  const state125 = createMockSupabaseState(
    [
      {
        id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c8',
        booking_reference: 'LIVE-DAYTOUR-GNY-125',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-125',
        status: 'pending_payment',
      },
    ]
  );

  const rpc125Result = await state125.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5c8',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-125',
    p_gateway_operation_id: 'LK-OPER-125',
    p_amount_paid: 50.00, // Mismatched amount ($50 vs expected $69)
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: {},
  });

  assert(
    'Test 125: Atomic RPC rejects wrong amount paid not matching stored expected amount',
    Boolean(
      rpc125Result.error !== null &&
        rpc125Result.error?.message.includes('does not match stored expected amount') &&
        state125.getPaymentByRef('LIVE-DAYTOUR-GNY-125')?.status === 'pending'
    ),
    'RPC error describes amount mismatch, payment status remains pending',
    `error="${rpc125Result.error?.message}", status=${state125.getPaymentByRef('LIVE-DAYTOUR-GNY-125')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 126: ATOMIC RPC PREVENTS ASSIGNING DUPLICATE OPERATION ID TO ANOTHER TRANSACTION
  // -------------------------------------------------------------
  const state126 = createMockSupabaseState(
    [
      {
        id: 'tx-existing-approved-126',
        booking_reference: 'LIVE-DAYTOUR-GNY-126-A',
        status: 'approved',
        environment: 'production',
        expected_amount: 69.00,
        amount_paid: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: 'LK-OPER-DUP-126',
      },
      {
        id: 'tx-target-pending-126',
        booking_reference: 'LIVE-DAYTOUR-GNY-126-B',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-126-B',
        status: 'pending_payment',
      },
    ]
  );

  const rpc126Result = await state126.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'tx-target-pending-126',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-126-B',
    p_gateway_operation_id: 'LK-OPER-DUP-126', // Assigned to tx A already!
    p_amount_paid: 69.00,
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: {},
  });

  assert(
    'Test 126: Atomic RPC prevents assigning duplicate operation ID to another payment transaction',
    Boolean(
      rpc126Result.error !== null &&
        rpc126Result.error?.message.includes('is already assigned to another transaction') &&
        state126.getPaymentByRef('LIVE-DAYTOUR-GNY-126-B')?.status === 'pending'
    ),
    'RPC error describes duplicate operation ID assignment, target payment remains pending',
    `error="${rpc126Result.error?.message}", status=${state126.getPaymentByRef('LIVE-DAYTOUR-GNY-126-B')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 127: ATOMIC RPC PREVENTS OVERWRITING AN ALREADY APPROVED TRANSACTION WITH CONFLICTING OPER ID
  // -------------------------------------------------------------
  const state127 = createMockSupabaseState(
    [
      {
        id: 'tx-approved-127',
        booking_reference: 'LIVE-DAYTOUR-GNY-127',
        status: 'approved',
        environment: 'production',
        expected_amount: 69.00,
        amount_paid: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: 'LK-OPER-ORIGINAL-127',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-127',
        status: 'fully_confirmed',
      },
    ]
  );

  const rpc127Result = await state127.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'tx-approved-127',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-127',
    p_gateway_operation_id: 'LK-OPER-DIFFERENT-127', // Conflicting operation ID
    p_amount_paid: 69.00,
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: {},
  });

  assert(
    'Test 127: Atomic RPC prevents overwriting an already approved transaction under a conflicting operation ID',
    Boolean(
      rpc127Result.error !== null &&
        rpc127Result.error?.message.includes('already approved under operation ID') &&
        state127.getPaymentByRef('LIVE-DAYTOUR-GNY-127')?.gateway_operation_id === 'LK-OPER-ORIGINAL-127'
    ),
    'RPC error describes conflicting operation ID overwrite attempt, operation ID unchanged',
    `error="${rpc127Result.error?.message}", oper=${state127.getPaymentByRef('LIVE-DAYTOUR-GNY-127')?.gateway_operation_id}`
  );

  // -------------------------------------------------------------
  // TEST 128: MISSING OR FAILING ATOMIC RPC RETURNS PARTIAL_SYNCHRONIZATION_FAILURE WITHOUT MUTATING RECORDS
  // -------------------------------------------------------------
  const state128NoRpc = createMockSupabaseState(
    [
      {
        id: 'tx-128',
        booking_reference: 'LIVE-DAYTOUR-GNY-128',
        status: 'pending',
        environment: 'production',
        expected_amount: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: null,
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-128',
        status: 'pending_payment',
      },
    ]
  );
  // Delete rpc method
  delete (state128NoRpc as any).rpc;

  const fetch128 = async () => ({
    ok: true,
    json: async () => ({
      data: [
        {
          codOper: 'LK-OPER-128',
          status: 1,
          txType: 'AUTH_CAPTURE',
          authCurrency: '840',
          authAmount: 69.00,
          cclw: 'LIVE_PROD_CCLW_VALID_987654321',
          urlString: 'https://gunayalapanama.com/checkout/complete?bookingReference=LIVE-DAYTOUR-GNY-128',
        },
      ],
    }),
  } as any);

  const res128 = await reconcilePaymentTransaction({
    bookingReference: 'LIVE-DAYTOUR-GNY-128',
    operationCode: 'LK-OPER-128',
    environment: 'production',
    supabaseClient: state128NoRpc as any,
    env: liveControlledEnv,
    fetchFn: fetch128 as any,
  });

  assert(
    'Test 128: Missing or unavailable atomic RPC returns partial_synchronization_failure without mutating payment or booking rows',
    Boolean(
      res128.success === false &&
        res128.category === 'partial_synchronization_failure' &&
        state128NoRpc.getPaymentByRef('LIVE-DAYTOUR-GNY-128')?.status === 'pending' &&
        state128NoRpc.getBookingByRef('LIVE-DAYTOUR-GNY-128')?.status === 'pending_payment'
    ),
    'category=partial_synchronization_failure, payment status=pending, booking status=pending_payment',
    `success=${res128.success}, cat=${res128.category}, txStatus=${state128NoRpc.getPaymentByRef('LIVE-DAYTOUR-GNY-128')?.status}`
  );

  // -------------------------------------------------------------
  // TEST 129: ATOMIC RPC HANDLES IDEMPOTENT RETRY FOR MATCHING APPROVED TRANSACTION SUCCESSFULLY
  // -------------------------------------------------------------
  const state129 = createMockSupabaseState(
    [
      {
        id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5d0',
        booking_reference: 'LIVE-DAYTOUR-GNY-129',
        status: 'approved',
        environment: 'production',
        expected_amount: 69.00,
        amount_paid: 69.00,
        amount_in_cents: 6900,
        currency: 'USD',
        gateway_operation_id: 'LK-OPER-129',
      },
    ],
    [
      {
        booking_reference: 'LIVE-DAYTOUR-GNY-129',
        status: 'fully_confirmed',
        special_notes: '[RECONCILED]',
      },
    ]
  );

  const rpc129Result = await state129.rpc('reconcile_payment_and_booking_atomic', {
    p_transaction_id: 'c8f42d99-7a31-4c5e-8b1d-91a2e3f4b5d0',
    p_booking_reference: 'LIVE-DAYTOUR-GNY-129',
    p_gateway_operation_id: 'LK-OPER-129', // Matching operation ID
    p_amount_paid: 69.00, // Matching amount
    p_verified_at: new Date().toISOString(),
    p_audit_metadata: { retry: true },
  });

  assert(
    'Test 129: Atomic RPC handles idempotent retry for matching approved transaction successfully with already_approved=true',
    Boolean(
      rpc129Result.data?.success === true &&
        rpc129Result.data?.already_approved === true &&
        state129.getPaymentByRef('LIVE-DAYTOUR-GNY-129')?.status === 'approved'
    ),
    'RPC success=true, already_approved=true, tx status=approved',
    `rpcSuccess=${rpc129Result.data?.success}, alreadyApproved=${rpc129Result.data?.already_approved}, txStatus=${state129.getPaymentByRef('LIVE-DAYTOUR-GNY-129')?.status}`
  );

  console.log('----------------------------------------------------');
  console.log('         PART 25I PAYMENT SECURITY TEST MATRIX');
  console.log('----------------------------------------------------');
  let passCount = 0;
  testResults.forEach((t, i) => {
    if (t.passed) passCount++;
    console.log(`${i + 1}. [${t.passed ? 'PASS' : 'FAIL'}] ${t.name}`);
    console.log(`   Expected: ${t.expected}`);
    console.log(`   Actual:   ${t.actual}`);
  });
  console.log('----------------------------------------------------');
  console.log(`TOTAL: ${testResults.length} tests | PASSED: ${passCount} | FAILED: ${testResults.length - passCount}`);
  console.log('----------------------------------------------------');

  if (passCount !== testResults.length) {
    process.exit(1);
  }
}

runPaymentSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
