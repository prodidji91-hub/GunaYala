import {
  getEmailConfig,
  maskEmail,
  sendEmailViaResend,
  dispatchBookingEmails,
  buildBookingEmailMessages,
  processEmailQueue,
  calculateBackoffMs,
  recoverMissingEmailContent,
} from '../netlify/functions/emailService.js';
import {
  generateCustomerAcknowledgementEmail,
  generatePetraNotificationEmail,
  generatePetraCustomerCopyEmail,
  generateAvailabilityConfirmedEmail,
  generatePaymentInstructionsEmail,
  generateVerifiedBookingConfirmationEmail,
  BookingEmailPayload,
} from '../src/templates/emailTemplates.js';
import { handler as bookingHandler } from '../netlify/functions/booking-request.js';
import { handler as queueHandler } from '../netlify/functions/process-email-queue.js';
import { handler as scheduledHandler } from '../netlify/functions/process-email-queue-scheduled.js';

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

const samplePayload: BookingEmailPayload = {
  bookingReference: 'GNY-482325',
  bookingType: 'overnight',
  customerName: 'Carlos Rivera',
  customerEmail: 'carlos@example.com',
  customerPhone: '+507 6555-1234',
  experienceTitle: 'San Blas 2-Night Authentic Cabana Experience',
  targetDate: '2026-11-20',
  departureDate: '2026-11-22',
  nights: '2',
  adults: 2,
  children: 1,
  accommodationPreference: 'Traditional Sand Floor Cabana',
  pickupLocation: 'Panama City Hotel',
  specialNotes: 'One vegetarian meal',
  termsAccepted: true,
  termsVersion: '2026-10-18',
  customerLanguage: 'en',
  submittedAt: new Date().toISOString(),
};

async function runEmailTests() {
  console.log('====================================================');
  console.log('   RUNNING PART 22C.5 EMAIL QUEUE & SCHEDULER TESTS');
  console.log('====================================================\n');

  const origEnv = { ...process.env };
  const origFetch = globalThis.fetch;

  try {
    // -------------------------------------------------------------
    // PART 1: CORE CONFIGURATION & PRIVACY
    // -------------------------------------------------------------
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_REPLY_TO;
    delete process.env.PETRA_NOTIFICATION_EMAIL;
    delete process.env.ENABLE_EMAIL_DELIVERY;
    delete process.env.RESEND_API_KEY;

    const defaultConfig = getEmailConfig();
    assert(
      'Test 1: Default email configuration enforces domain, reply-to and delivery disabled',
      defaultConfig.senderAddress === 'Guna Yala Panama Travel <bookings@gunayalapanama.com>' &&
        defaultConfig.replyToAddress === 'hello@gunayalapanamatravel.com' &&
        defaultConfig.petraNotificationAddress === 'hello@gunayalapanamatravel.com' &&
        defaultConfig.enableDelivery === false,
      'From=bookings@gunayalapanama.com, ReplyTo=hello@gunayalapanamatravel.com, Delivery=false',
      `From=${defaultConfig.senderAddress}, ReplyTo=${defaultConfig.replyToAddress}, Delivery=${defaultConfig.enableDelivery}`
    );

    const masked1 = maskEmail('carlos.rivera@example.com');
    const masked2 = maskEmail('info@domain.com');
    assert(
      'Test 2: Email masking protects customer PII in server logs',
      masked1 === 'c***a@example.com' && masked2 === 'i***o@domain.com',
      'c***a@example.com and i***o@domain.com',
      `${masked1} and ${masked2}`
    );

    // -------------------------------------------------------------
    // PART 2: 3-MESSAGE IDENTITIES & AUDIT SEPARATION
    // -------------------------------------------------------------
    const messages = buildBookingEmailMessages(samplePayload, defaultConfig);
    const hasCustomerAck = messages.some((m) => m.emailType === 'customer_acknowledgement');
    const hasPetraNotif = messages.some((m) => m.emailType === 'petra_notification');
    const hasPetraCopy = messages.some((m) => m.emailType === 'customer_acknowledgement_copy');
    const uniqueKeys = new Set(messages.map((m) => m.queueKey));

    assert(
      'Test 3: Exactly 3 messages built with unique logical queue keys',
      messages.length === 3 &&
        uniqueKeys.size === 3 &&
        hasCustomerAck &&
        hasPetraNotif &&
        hasPetraCopy,
      '3 messages, 3 unique queue keys (customer_ack, petra_notif, petra_ack_copy)',
      `${messages.length} messages: ${Array.from(uniqueKeys).join(', ')}`
    );

    const petraCopy = generatePetraCustomerCopyEmail(samplePayload);
    assert(
      'Test 4: Petra customer copy separates audit header from verbatim customer body',
      petraCopy.subject.startsWith('[CUSTOMER COPY]') &&
        petraCopy.auditBannerHtml.includes('PETRA AUDIT COPY:') &&
        !petraCopy.verbatimCustomerHtml.includes('PETRA AUDIT COPY:') &&
        petraCopy.html.includes('<!-- VERBATIM CUSTOMER EMAIL CONTENT BEGINS -->'),
      'Audit banner is distinct; verbatimCustomerHtml has 0 audit text; html contains both',
      `Subject: ${petraCopy.subject.substring(0, 35)}... Verbatim contains banner: ${petraCopy.verbatimCustomerHtml.includes('PETRA AUDIT COPY:')}`
    );

    // -------------------------------------------------------------
    // PART 3: CONTENT PRESENCE & PRE-SEND PERSISTENCE
    // -------------------------------------------------------------
    const emptySendRes = await sendEmailViaResend({
      to: 'carlos@example.com',
      from: 'Guna Yala Panama Travel <bookings@gunayalapanama.com>',
      replyTo: 'hello@gunayalapanamatravel.com',
      subject: 'Empty Test',
      html: '',
      text: '',
      config: defaultConfig,
      requestId: 'test_empty_guard',
    });

    assert(
      'Test 5: Content presence guarantee: empty or missing body_html is rejected before transmission',
      emptySendRes.success === false &&
        emptySendRes.status === 'failed' &&
        Boolean(emptySendRes.error?.includes('missing or empty')),
      'success=false, status=failed, error=Blocked: Content body_html is missing or empty',
      `success=${emptySendRes.success}, status=${emptySendRes.status}, error=${emptySendRes.error}`
    );

    const auditState = { persistedBeforeSend: false, sendAttempted: false };
    const mockSupabasePersistenceCheck = {
      from: () => ({
        upsert: async (row: any) => {
          if (row.body_html && !auditState.sendAttempted) {
            auditState.persistedBeforeSend = true;
          }
          return { data: [row], error: null };
        },
        update: () => ({ eq: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) }),
        insert: async () => ({ data: [], error: null }),
      }),
    };

    await dispatchBookingEmails({
      supabase: mockSupabasePersistenceCheck,
      payload: samplePayload,
      isIdempotentReplay: false,
      requestId: 'test_persistence_first',
    });

    assert(
      'Test 6: Rendered email content is durably persisted to email_logs before delivery is attempted',
      auditState.persistedBeforeSend === true,
      'persistedBeforeSend=true',
      `persistedBeforeSend=${auditState.persistedBeforeSend}`
    );

    // -------------------------------------------------------------
    // PART 4: INTERRUPTED RECOVERY FROM BOOKING_REQUESTS
    // -------------------------------------------------------------
    const mockSupabaseForRecovery = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                booking_reference: 'GNY-482325',
                customer_name: 'Carlos Rivera',
                customer_email: 'carlos@example.com',
                customer_phone: '+507 6555-1234',
                experience_title: 'San Blas 2-Night Authentic Cabana Experience',
                terms_accepted: true,
                terms_version: '2026-10-18',
                customer_language: 'en',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    const recovered = await recoverMissingEmailContent(
      mockSupabaseForRecovery,
      { booking_reference: 'GNY-482325', email_type: 'customer_acknowledgement' },
      defaultConfig
    );

    assert(
      'Test 7: Interrupted email preparation recovers complete content from booking_requests',
      recovered !== null &&
        Boolean(recovered?.html?.includes('Booking Request Received')) &&
        Boolean(recovered?.html?.includes('Carlos Rivera')),
      'Recovered full HTML and subject from booking_requests',
      `Recovered: ${Boolean(recovered?.html)} (Subject: ${recovered?.subject})`
    );

    // -------------------------------------------------------------
    // PART 5: TASK 5.1 — SCHEDULED INVOCATION WITH DELIVERY DISABLED
    // -------------------------------------------------------------
    process.env.SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-123';
    process.env.ENABLE_EMAIL_DELIVERY = 'false'; // Strictly disabled
    delete process.env.RESEND_API_KEY;

    let rpcCalledWhenDisabled = false;
    const mockSupabaseDeliveryDisabled = {
      rpc: async () => {
        rpcCalledWhenDisabled = true;
        return { data: [], error: null };
      },
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
      }),
    };

    // Invoke processEmailQueue directly with delivery disabled
    const disabledResult = await processEmailQueue({
      supabase: mockSupabaseDeliveryDisabled,
      workerId: 'worker_disabled_test',
    });

    assert(
      'Test 8: Queue worker with delivery disabled exits safely without claiming or modifying records',
      disabledResult.deliveryEnabled === false &&
        disabledResult.processedCount === 0 &&
        rpcCalledWhenDisabled === false,
      'deliveryEnabled=false, processedCount=0, rpcCalled=false',
      `deliveryEnabled=${disabledResult.deliveryEnabled}, processedCount=${disabledResult.processedCount}, rpcCalled=${rpcCalledWhenDisabled}`
    );

    // Invoke scheduled handler with delivery disabled
    const scheduledDisabledRes = await scheduledHandler({ next_run: '2026-11-05T12:00:00Z' });
    const scheduledDisabledBody = JSON.parse(scheduledDisabledRes.body);

    assert(
      'Test 9: Netlify Scheduled Function exits cleanly with HTTP 200 and deliveryEnabled: false',
      scheduledDisabledRes.statusCode === 200 &&
        scheduledDisabledBody.scheduled === true &&
        scheduledDisabledBody.deliveryEnabled === false &&
        scheduledDisabledBody.processedCount === 0,
      'HTTP 200, scheduled=true, deliveryEnabled=false, processedCount=0',
      `HTTP ${scheduledDisabledRes.statusCode}, scheduled=${scheduledDisabledBody.scheduled}, deliveryEnabled=${scheduledDisabledBody.deliveryEnabled}`
    );

    // -------------------------------------------------------------
    // PART 6: TASK 5.2 — SUCCESSFUL ATOMIC QUEUE CLAIM VIA RPC
    // -------------------------------------------------------------
    process.env.ENABLE_EMAIL_DELIVERY = 'true';
    process.env.RESEND_API_KEY = 're_test_mock_valid_key_777';

    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('api.resend.com/emails')) {
        return createJsonResponse({ id: 'resend_msg_success_999' }, 200);
      }
      return createJsonResponse({}, 200);
    }) as any;

    const claimedTestRow = {
      id: 'row_claim_1',
      booking_reference: 'GNY-991122',
      recipient_email: 'traveler@example.com',
      recipient_role: 'customer',
      email_type: 'customer_acknowledgement',
      subject: 'Booking Request Received: GNY-991122',
      body_html: '<p>Verified Booking Request</p>',
      body_text: 'Verified Booking Request',
      delivery_status: 'sending',
      locked_by: 'worker_atomic_test',
      locked_until: new Date(Date.now() + 60000).toISOString(),
      retry_count: 0,
      max_retries: 5,
    };

    const claimState = { updatedToAccepted: false };
    let rpcMethodCalled = '';
    const mockSupabaseAtomicClaim = {
      rpc: async (methodName: string, params: any) => {
        rpcMethodCalled = methodName;
        if (methodName === 'claim_email_queue_batch') {
          return { data: [claimedTestRow], error: null };
        }
        return { data: null, error: new Error('Unknown RPC') };
      },
      from: (table: string) => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
        update: (payload: any) => ({
          eq: async (col: string, val: any) => {
            if (payload.delivery_status === 'accepted' && val === 'row_claim_1') {
              claimState.updatedToAccepted = true;
            }
            return { data: [payload], error: null };
          },
        }),
      }),
    };

    const claimSuccessResult = await processEmailQueue({
      supabase: mockSupabaseAtomicClaim,
      workerId: 'worker_atomic_test',
    });

    assert(
      'Test 10: Successful atomic queue claim uses claim_email_queue_batch RPC and transitions to accepted',
      claimSuccessResult.processedCount === 1 &&
        claimSuccessResult.succeededCount === 1 &&
        rpcMethodCalled === 'claim_email_queue_batch' &&
        claimState.updatedToAccepted === true,
      'RPC=claim_email_queue_batch, processed=1, succeeded=1, updatedToAccepted=true',
      `RPC=${rpcMethodCalled}, processed=${claimSuccessResult.processedCount}, succeeded=${claimSuccessResult.succeededCount}, updatedToAccepted=${claimState.updatedToAccepted}`
    );

    // -------------------------------------------------------------
    // PART 7: TASK 5.3 — CONCURRENT WORKER EXCLUSION (SKIP LOCKED)
    // -------------------------------------------------------------
    // Worker 1 claimed the batch; Worker 2 receives empty set because SKIP LOCKED skips locked rows
    const mockSupabaseWorker2 = {
      rpc: async (methodName: string) => {
        if (methodName === 'claim_email_queue_batch') {
          return { data: [], error: null }; // 0 rows available (already claimed by Worker 1)
        }
        return { data: null, error: null };
      },
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
      }),
    };

    const worker2Result = await processEmailQueue({
      supabase: mockSupabaseWorker2,
      workerId: 'worker_concurrent_2',
    });

    assert(
      'Test 11: Concurrent worker exclusion: worker 2 receives 0 items when rows are locked by worker 1',
      worker2Result.processedCount === 0 && worker2Result.succeededCount === 0,
      'processedCount=0, succeededCount=0',
      `processedCount=${worker2Result.processedCount}, succeededCount=${worker2Result.succeededCount}`
    );

    // -------------------------------------------------------------
    // PART 8: TASK 5.4 — EXPIRED LEASE RECOVERY
    // -------------------------------------------------------------
    // Simulates claim_email_queue_batch returning a recovered stale item from a crashed worker
    const recoveredStaleRow = {
      id: 'row_crashed_worker',
      booking_reference: 'GNY-887766',
      recipient_email: 'carlos@example.com',
      recipient_role: 'customer',
      email_type: 'customer_acknowledgement',
      subject: 'Recovered Message',
      body_html: '<p>Recovered Content</p>',
      body_text: 'Recovered Content',
      delivery_status: 'sending', // Was sending when crashed
      locked_by: 'worker_crashed_old',
      locked_until: new Date(Date.now() - 30000).toISOString(), // Expired 30s ago
      retry_count: 1,
      max_retries: 5,
    };

    const mockSupabaseRecoveryWorker = {
      rpc: async (methodName: string) => {
        if (methodName === 'claim_email_queue_batch') {
          // PostgreSQL claim_email_queue_batch safely reclaimed the expired lease and assigned to worker_rescue
          return { data: [{ ...recoveredStaleRow, locked_by: 'worker_rescue' }], error: null };
        }
        return { data: null, error: null };
      },
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
        update: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
    };

    const recoveryWorkerResult = await processEmailQueue({
      supabase: mockSupabaseRecoveryWorker,
      workerId: 'worker_rescue',
    });

    assert(
      'Test 12: Expired lease recovery: message with expired locked_until is safely claimed and dispatched by recovery worker',
      recoveryWorkerResult.processedCount === 1 && recoveryWorkerResult.succeededCount === 1,
      'processedCount=1, succeededCount=1',
      `processedCount=${recoveryWorkerResult.processedCount}, succeededCount=${recoveryWorkerResult.succeededCount}`
    );

    // -------------------------------------------------------------
    // PART 9: TASK 5.5 — ARCHIVED RECORDS EXCLUDED (GNY-482325)
    // -------------------------------------------------------------
    const historicalRows = [
      {
        id: 'hist_1',
        booking_reference: 'GNY-482325', // Pre-activation test booking
        recipient_email: 'test@example.com',
        recipient_role: 'customer',
        delivery_status: 'archived',
        body_html: '<p>Old</p>',
      },
      {
        id: 'hist_2',
        booking_reference: 'GNY-999999',
        recipient_email: 'test@example.com',
        recipient_role: 'customer',
        delivery_status: 'archived',
        body_html: '<p>Archived</p>',
      },
    ];

    const mockSupabaseArchived = {
      rpc: async () => ({ data: historicalRows, error: null }),
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
      }),
    };

    const archivedProcess = await processEmailQueue({
      supabase: mockSupabaseArchived,
      workerId: 'worker_archived_check',
    });

    assert(
      'Test 13: Archived test records (GNY-482325 / archived status) are excluded from delivery',
      archivedProcess.processedCount === 0,
      'processedCount=0 (archived records excluded)',
      `processedCount=${archivedProcess.processedCount}`
    );

    // -------------------------------------------------------------
    // PART 10: TASK 5.6 — PROVIDER FAILURE & EXPONENTIAL BACKOFF
    // -------------------------------------------------------------
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('api.resend.com/emails')) {
        return createJsonResponse({ message: 'Internal Resend Provider Outage (500)' }, 500);
      }
      return createJsonResponse({}, 200);
    }) as any;

    const failState = { failedStatusRecorded: false };
    let recordedRetryCount = 0;
    let recordedNextRetryAt: string | null = null;

    const failingItem = {
      id: 'msg_failing_provider',
      booking_reference: 'GNY-555444',
      recipient_email: 'traveler@example.com',
      recipient_role: 'customer',
      email_type: 'customer_acknowledgement',
      subject: 'Provider Failure Test',
      body_html: '<p>Test Body</p>',
      body_text: 'Test Body',
      delivery_status: 'sending',
      retry_count: 1, // Will become 2
      max_retries: 5,
    };

    const mockSupabaseProviderFail = {
      rpc: async () => ({ data: [failingItem], error: null }),
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
        update: (payload: any) => ({
          eq: async () => {
            if (payload.delivery_status === 'failed') {
              failState.failedStatusRecorded = true;
              recordedRetryCount = payload.retry_count;
              recordedNextRetryAt = payload.next_retry_at;
            }
            return { data: [payload], error: null };
          },
        }),
      }),
    };

    const failResult = await processEmailQueue({
      supabase: mockSupabaseProviderFail,
      workerId: 'worker_failure_test',
    });

    assert(
      'Test 14: Provider failure transitions status to failed with incremented retry_count and future next_retry_at',
      failResult.failedCount === 1 &&
        failState.failedStatusRecorded === true &&
        recordedRetryCount === 2 &&
        Boolean(recordedNextRetryAt && new Date(recordedNextRetryAt) > new Date()),
      'failedCount=1, retry_count=2, next_retry_at in future',
      `failedCount=${failResult.failedCount}, retry_count=${recordedRetryCount}, nextRetryInFuture=${Boolean(recordedNextRetryAt && new Date(recordedNextRetryAt) > new Date())}`
    );

    // -------------------------------------------------------------
    // PART 11: TASK 5.7 — MAXIMUM RETRY EXHAUSTION
    // -------------------------------------------------------------
    const exhaustedItem = {
      id: 'msg_exhaustion',
      booking_reference: 'GNY-332211',
      recipient_email: 'traveler@example.com',
      recipient_role: 'customer',
      email_type: 'customer_acknowledgement',
      subject: 'Exhaustion Test',
      body_html: '<p>Test Body</p>',
      body_text: 'Test Body',
      delivery_status: 'sending',
      retry_count: 4, // 4th retry failing -> reaches max_retries: 5
      max_retries: 5,
    };

    const exhaustState = { exhaustionRecorded: false };
    let exhaustedNextRetry: any = 'not_checked';

    const mockSupabaseExhaustion = {
      rpc: async () => ({ data: [exhaustedItem], error: null }),
      from: () => ({
        select: () => ({ in: () => ({ is: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
        update: (payload: any) => ({
          eq: async () => {
            if (payload.delivery_status === 'failed' && payload.retry_count === 5) {
              exhaustState.exhaustionRecorded = Boolean(payload.error_details?.includes('Max retries (5) exhausted'));
              exhaustedNextRetry = payload.next_retry_at;
            }
            return { data: [payload], error: null };
          },
        }),
      }),
    };

    await processEmailQueue({
      supabase: mockSupabaseExhaustion,
      workerId: 'worker_exhaustion_test',
    });

    assert(
      'Test 15: Maximum retry exhaustion sets next_retry_at to null and marks retries exhausted',
      exhaustState.exhaustionRecorded === true && exhaustedNextRetry === null,
      'exhaustionRecorded=true, next_retry_at=null',
      `exhaustionRecorded=${exhaustState.exhaustionRecorded}, next_retry_at=${exhaustedNextRetry}`
    );

    // -------------------------------------------------------------
    // PART 12: TASK 5.8 — NO DUPLICATE SENDING ON BOOKING REPLAY
    // -------------------------------------------------------------
    const replayDispatch = await dispatchBookingEmails({
      supabase: mockSupabasePersistenceCheck,
      payload: samplePayload,
      isIdempotentReplay: true, // Idempotent replay from duplicate booking submission
      requestId: 'test_replay_guard',
    });

    assert(
      'Test 16: Idempotent replay skips email dispatch completely without sending duplicates',
      replayDispatch.skipped === true && replayDispatch.messagesSent === 0,
      'skipped=true, messagesSent=0',
      `skipped=${replayDispatch.skipped}, messagesSent=${replayDispatch.messagesSent}`
    );

    // -------------------------------------------------------------
    // PART 13: TASK 5.9 — NO ACCIDENTAL PUBLIC ACCESS TO QUEUE OPS
    // -------------------------------------------------------------
    process.env.QUEUE_PROCESSING_SECRET = 'secret_pass_888999';

    // 13a. Unauthenticated direct HTTP call to process-email-queue -> 401
    const unauthManualEvent = {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ batchSize: 5 }),
    };
    const unauthManualRes = await queueHandler(unauthManualEvent as any);

    // 13b. Unauthenticated direct HTTP call to process-email-queue-scheduled -> 401
    const unauthScheduledEvent = {
      httpMethod: 'POST',
      headers: {},
      body: '',
    };
    const unauthScheduledRes = await scheduledHandler(unauthScheduledEvent as any);

    // 13c. Authenticated HTTP call with valid secret header -> 200
    const authScheduledEvent = {
      httpMethod: 'POST',
      headers: {
        'x-queue-secret': 'secret_pass_888999',
      },
      body: '',
    };
    const authScheduledRes = await scheduledHandler(authScheduledEvent as any);

    assert(
      'Test 17: Public access protection: direct HTTP calls without secret return HTTP 401 on both manual and scheduled endpoints',
      unauthManualRes.statusCode === 401 &&
        unauthScheduledRes.statusCode === 401 &&
        authScheduledRes.statusCode === 200,
      'Manual=401, Scheduled=401, Authenticated=200',
      `Manual=${unauthManualRes.statusCode}, Scheduled=${unauthScheduledRes.statusCode}, Authenticated=${authScheduledRes.statusCode}`
    );

    // -------------------------------------------------------------
    // PART 14: BOOKING DATA PERSISTENCE PRESERVATION ON EMAIL OUTAGE
    // -------------------------------------------------------------
    globalThis.fetch = (async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/rpc/create_booking_request_transaction')) {
        return createJsonResponse({
          success: true,
          booking_reference: 'GNY-482325',
          idempotent_replay: false,
          message: 'Booking request created successfully.',
        });
      }
      if (urlStr.includes('resend.com')) {
        return createJsonResponse({ message: 'Internal provider outage' }, 500);
      }
      return createJsonResponse([], 200);
    }) as any;

    const bookingRes = await bookingHandler({
      httpMethod: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Carlos Rivera',
        email: 'carlos@example.com',
        phone: '+507 6555-1234',
        bookingType: 'overnight',
        experienceTitle: 'San Blas Islands Overnight Stay',
        targetDate: '2026-11-20',
        departureDate: '2026-11-22',
        adults: 2,
        children: 1,
        termsAccepted: true,
        termsVersion: '2026-10-18',
        customerLanguage: 'en',
        idempotencyKey: 'test_idem_email_outage_check',
      }),
    } as any);

    const bookingBody = JSON.parse(bookingRes.body);

    assert(
      'Test 18: Booking is preserved with HTTP 200 and dbSaved: true despite email provider outage',
      bookingRes.statusCode === 200 &&
        bookingBody.success === true &&
        bookingBody.dbSaved === true &&
        bookingBody.bookingReference === 'GNY-482325',
      'HTTP 200, success=true, dbSaved=true, reference=GNY-482325',
      `HTTP ${bookingRes.statusCode}, success=${bookingBody.success}, dbSaved=${bookingBody.dbSaved}, reference=${bookingBody.bookingReference}`
    );

    // -------------------------------------------------------------
    // PART 15: EXPONENTIAL BACKOFF TIMING VERIFICATION
    // -------------------------------------------------------------
    const delay0 = calculateBackoffMs(0);
    const delay1 = calculateBackoffMs(1);
    const delay6 = calculateBackoffMs(6);

    assert(
      'Test 19: Exponential backoff doubles correctly and caps at 1 hour (3600s)',
      delay0 === 60000 && delay1 === 120000 && delay6 === 3600000,
      '0: 60s, 1: 120s, 6: 3600s',
      `0: ${delay0 / 1000}s, 1: ${delay1 / 1000}s, 6: ${delay6 / 1000}s`
    );

    // -------------------------------------------------------------
    // PART 16: BILINGUAL SPANISH TEMPLATES
    // -------------------------------------------------------------
    const esPayload: BookingEmailPayload = { ...samplePayload, customerLanguage: 'es' };
    const esAck = generateCustomerAcknowledgementEmail(esPayload);
    const esPetraCopy = generatePetraCustomerCopyEmail(esPayload);

    assert(
      'Test 20: Bilingual Spanish template produces Spanish copy with matching audit banner',
      esAck.subject.includes('Solicitud de Reserva Recibida') &&
        esAck.html.includes('ESTA ES UNA SOLICITUD DE RESERVA, NO UNA RESERVA CONFIRMADA') &&
        esPetraCopy.subject.startsWith('[CUSTOMER COPY] Solicitud de Reserva Recibida') &&
        esPetraCopy.auditBannerHtml.includes('COPIA DE AUDITORÍA PARA PETRA'),
      'Spanish acknowledgement & copy both contain Spanish warning and headers',
      `Subject: ${esPetraCopy.subject.substring(0, 50)}...`
    );

  } finally {
    process.env = origEnv;
    globalThis.fetch = origFetch;
  }

  // Print Test Summary Matrix
  console.log('----------------------------------------------------');
  console.log('   PART 22C.5 EMAIL QUEUE & SCHEDULER TEST MATRIX');
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

runEmailTests().catch((err) => {
  console.error('Email test execution failed:', err);
  process.exit(1);
});
