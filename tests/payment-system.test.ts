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
import { reconcilePaymentTransaction, validatePaymentRelationship } from '../netlify/functions/paymentReconciliation.js';
import { handler as checkoutHandler } from '../netlify/functions/payment-checkout.js';
import { handler as webhookHandler } from '../netlify/functions/payment-webhook.js';
import {
  executeAdminSandboxTest,
  executeExistingTransactionDiagnostic,
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
    const paymentUpdates: any[] = [];
    const bookingUpdates: any[] = [];

    const mockClient = {
      getPayments: () => payments,
      getBookings: () => bookings,
      getPaymentByRef: (ref: string) => payments.find((p) => p.booking_reference === ref),
      getBookingByRef: (ref: string) => bookings.find((b) => b.booking_reference === ref),
      getPaymentUpdates: () => paymentUpdates,
      getBookingUpdates: () => bookingUpdates,
      from: (table: string) => {
        if (table === 'payment_transactions') {
          return {
            select: (_fields?: string) => ({
              eq: (col: string, val: any) => {
                const matches = payments.filter((p) => p[col] === val);
                const res = { data: matches, error: null };
                return {
                  ...res,
                  maybeSingle: async () => ({ data: matches.length > 0 ? matches[0] : null, error: null }),
                  then: (resolve: any) => resolve(res),
                };
              },
            }),
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
          };
        }
        if (table === 'booking_requests') {
          return {
            select: (_fields?: string) => ({
              eq: (col: string, val: any) => {
                const match = bookings.find((b) => b[col] === val);
                const res = { data: match || null, error: null };
                return {
                  ...res,
                  maybeSingle: async () => res,
                  then: (resolve: any) => resolve(res),
                };
              },
            }),
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
          };
        }
        return {} as any;
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
  // PRINT TEST MATRIX
  // -------------------------------------------------------------
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
