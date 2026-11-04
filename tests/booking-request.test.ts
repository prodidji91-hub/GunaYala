import { handler } from '../netlify/functions/booking-request.js';
import { BookingRequestService } from '../src/services/bookingRequestService.js';

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

function createJsonResponse(data: any, status = 200) {
  const jsonStr = JSON.stringify(data);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => data,
    text: async () => jsonStr,
  };
}

const baseEvent = {
  httpMethod: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Test Customer',
    email: 'test@example.com',
    phone: '+507 6000-0000',
    bookingType: 'overnight',
    experienceTitle: 'San Blas Islands Overnight Stay',
    targetDate: '2026-12-01',
    departureDate: '2026-12-03',
    adults: 2,
    children: 0,
    termsAccepted: true,
    termsVersion: '2026-10-18',
    customerLanguage: 'en',
    idempotencyKey: 'test_idem_key_123',
  }),
};

async function runTests() {
  console.log('====================================================');
  console.log('   RUNNING BOOKING REQUEST ISOLATED UNIT TESTS');
  console.log('====================================================\n');

  const origEnvUrl = process.env.SUPABASE_URL;
  const origEnvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origFetch = globalThis.fetch;

  try {
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-123';

    // SCENARIO A: Supabase RPC succeeds and returns a saved booking reference
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse({
          success: true,
          booking_reference: 'GNY-999888',
          idempotent_replay: false,
          message: 'Booking request created successfully.',
        });
      }
      return createJsonResponse({}, 404);
    }) as any;

    const resA = await handler(baseEvent as any);
    const bodyA = JSON.parse(resA.body);

    assert(
      'Scenario A: Supabase RPC succeeds and returns saved booking reference',
      resA.statusCode === 200 &&
        bodyA.success === true &&
        bodyA.dbSaved === true &&
        bodyA.bookingReference === 'GNY-999888',
      'HTTP 200, success=true, dbSaved=true, reference=GNY-999888',
      `HTTP ${resA.statusCode}, success=${bodyA.success}, dbSaved=${bodyA.dbSaved}, reference=${bodyA.bookingReference}`
    );

    // SCENARIO B: Supabase RPC returns an error
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse(
          { code: 'P0001', message: 'Database transaction lock timeout' },
          400
        );
      }
      return createJsonResponse([], 200);
    }) as any;

    const resB = await handler(baseEvent as any);
    const bodyB = JSON.parse(resB.body);

    assert(
      'Scenario B: Supabase RPC returns a database error',
      resB.statusCode === 500 && bodyB.success === false && bodyB.dbSaved === false,
      'HTTP 500, success=false, dbSaved=false',
      `HTTP ${resB.statusCode}, success=${bodyB.success}, dbSaved=${bodyB.dbSaved}`
    );

    // SCENARIO C: Supabase RPC returns success: false
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse({
          success: false,
          error: 'Constraint violation',
        });
      }
      return createJsonResponse({}, 404);
    }) as any;

    const resC = await handler(baseEvent as any);
    const bodyC = JSON.parse(resC.body);

    assert(
      'Scenario C: Supabase RPC returns success: false in payload',
      resC.statusCode === 500 && bodyC.success === false && bodyC.dbSaved === false,
      'HTTP 500, success=false, dbSaved=false',
      `HTTP ${resC.statusCode}, success=${bodyC.success}, dbSaved=${bodyC.dbSaved}`
    );

    // SCENARIO D: Supabase RPC returns no booking reference
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse({
          success: true,
          booking_reference: null,
        });
      }
      return createJsonResponse({}, 404);
    }) as any;

    const resD = await handler(baseEvent as any);
    const bodyD = JSON.parse(resD.body);

    assert(
      'Scenario D: Supabase RPC returns no booking reference',
      resD.statusCode === 500 && bodyD.success === false && bodyD.dbSaved === false,
      'HTTP 500, success=false, dbSaved=false',
      `HTTP ${resD.statusCode}, success=${bodyD.success}, dbSaved=${bodyD.dbSaved}`
    );

    // SCENARIO E: SUPABASE_SERVICE_ROLE_KEY is missing
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const resE = await handler(baseEvent as any);
    const bodyE = JSON.parse(resE.body);

    assert(
      'Scenario E: SUPABASE_SERVICE_ROLE_KEY is missing',
      resE.statusCode === 500 &&
        bodyE.success === false &&
        bodyE.dbSaved === false &&
        bodyE.error.includes('credentials'),
      'HTTP 500, success=false, dbSaved=false, error=Missing credentials',
      `HTTP ${resE.statusCode}, success=${bodyE.success}, dbSaved=${bodyE.dbSaved}, error=${bodyE.error}`
    );

    // Restore env key for remaining function tests
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-123';

    // SCENARIO F: Frontend receives HTTP 200 with success: true but dbSaved: false
    globalThis.fetch = (async (input: any) => {
      return createJsonResponse({
        success: true,
        dbSaved: false, // <-- DB NOT SAVED
        bookingReference: 'GNY-000000',
      });
    }) as any;

    const service = new BookingRequestService();
    const resultF = await service.submitBookingRequest({
      bookingType: 'overnight',
      customerName: 'Test Client',
      customerEmail: 'test@example.com',
      customerPhone: '+507 6000-0000',
      experienceTitle: 'Overnight Stay',
      adults: 2,
      children: 0,
      termsAccepted: true,
    });

    assert(
      'Scenario F: Frontend receives HTTP 200 with dbSaved=false',
      resultF.success === false && resultF.bookingReference === '',
      'Frontend rejects response (success=false, bookingReference="")',
      `Frontend result: success=${resultF.success}, bookingReference="${resultF.bookingReference}"`
    );

    // SCENARIO G: Frontend receives HTML instead of JSON
    globalThis.fetch = (async (input: any) => {
      return {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html; charset=utf-8']]),
        text: async () => '<!DOCTYPE html><html><body>SPA Page</body></html>',
      } as any;
    }) as any;

    const resultG = await service.submitBookingRequest({
      bookingType: 'overnight',
      customerName: 'Test Client',
      customerEmail: 'test@example.com',
      customerPhone: '+507 6000-0000',
      experienceTitle: 'Overnight Stay',
      adults: 2,
      children: 0,
      termsAccepted: true,
    });

    assert(
      'Scenario G: Frontend receives HTML page instead of JSON',
      resultG.success === false && resultG.error !== undefined,
      'Frontend catches HTML response and rejects with error',
      `Frontend result: success=${resultG.success}, error="${resultG.error}"`
    );

    // SCENARIO H: Repeated submission with the same idempotency key
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse({
          success: true,
          booking_reference: 'GNY-777666',
          idempotent_replay: true,
          message: 'Idempotent replay: booking request already processed.',
        });
      }
      return createJsonResponse({}, 404);
    }) as any;

    const resH = await handler(baseEvent as any);
    const bodyH = JSON.parse(resH.body);

    assert(
      'Scenario H: Repeated submission with same idempotency key (idempotent replay)',
      resH.statusCode === 200 &&
        bodyH.success === true &&
        bodyH.dbSaved === true &&
        bodyH.idempotentReplay === true &&
        bodyH.bookingReference === 'GNY-777666',
      'HTTP 200, success=true, dbSaved=true, idempotentReplay=true',
      `HTTP ${resH.statusCode}, success=${bodyH.success}, dbSaved=${bodyH.dbSaved}, idempotentReplay=${bodyH.idempotentReplay}`
    );

    // SCENARIO I: Terms & Conditions acceptance missing
    const noTermsEvent = {
      ...baseEvent,
      body: JSON.stringify({
        ...JSON.parse(baseEvent.body),
        termsAccepted: false,
      }),
    };

    const resI = await handler(noTermsEvent as any);
    const bodyI = JSON.parse(resI.body);

    assert(
      'Scenario I: Terms & Conditions acceptance missing',
      resI.statusCode === 400 &&
        bodyI.success === false &&
        bodyI.error.includes('Terms & Conditions'),
      'HTTP 400, success=false, error=Terms acceptance required',
      `HTTP ${resI.statusCode}, success=${bodyI.success}, error=${bodyI.error}`
    );

    // SCENARIO J: Invalid dates and traveler counts
    const invalidDatesEvent = {
      ...baseEvent,
      body: JSON.stringify({
        ...JSON.parse(baseEvent.body),
        targetDate: '2026-02-30', // Impossible date
        adults: 0,
        children: 0, // Invalid travelers
      }),
    };

    const resJ = await handler(invalidDatesEvent as any);
    const bodyJ = JSON.parse(resJ.body);

    assert(
      'Scenario J: Invalid date (2026-02-30) and 0 travelers',
      resJ.statusCode === 400 && bodyJ.success === false,
      'HTTP 400, success=false',
      `HTTP ${resJ.statusCode}, success=${bodyJ.success}, error=${bodyJ.error}`
    );

  } finally {
    process.env.SUPABASE_URL = origEnvUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = origEnvKey;
    globalThis.fetch = origFetch;
  }

  // Print Test Summary Matrix
  console.log('----------------------------------------------------');
  console.log('               TEST MATRIX RESULTS');
  console.log('----------------------------------------------------\n');

  let failCount = 0;
  testResults.forEach((t, i) => {
    const status = t.passed ? '[PASS]' : '[FAIL]';
    if (!t.passed) failCount++;
    console.log(`${i + 1}. ${status} ${t.name}`);
    console.log(`   Expected: ${t.expected}`);
    console.log(`   Actual:   ${t.actual}\n`);
  });

  console.log('----------------------------------------------------');
  console.log(`TOTAL: ${testResults.length} tests | PASSED: ${testResults.length - failCount} | FAILED: ${failCount}`);
  console.log('----------------------------------------------------');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
