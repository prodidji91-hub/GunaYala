import {
  generateCustomerAcknowledgementEmail,
  generatePetraNotificationEmail,
  generatePetraCustomerCopyEmail,
  BookingEmailPayload,
} from '../../src/templates/emailTemplates.js';

export type DeliveryStatus = 'pending' | 'sending' | 'accepted' | 'delivered' | 'failed' | 'archived';

export interface EmailDispatchConfig {
  resendApiKey: string;
  enableDelivery: boolean;
  senderAddress: string;
  replyToAddress: string;
  petraNotificationAddress: string;
}

export interface EmailSendResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
  status: DeliveryStatus;
}

export interface DispatchBookingEmailsOptions {
  supabase: any;
  payload: BookingEmailPayload;
  isIdempotentReplay: boolean;
  requestId: string;
}

export interface QueuedEmailMessage {
  id?: string;
  queueKey: string;
  idempotencyKey: string;
  bookingReference: string;
  recipientEmail: string;
  recipientRole: 'customer' | 'petra';
  emailType: 'customer_acknowledgement' | 'petra_notification' | 'customer_acknowledgement_copy';
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sendHtml?: string;
  sendText?: string;
  replyTo: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Reads server-side email configuration securely.
 * Defaults ensure:
 * - Domain: gunayalapanama.com (pending purchase/verification)
 * - Sender: bookings@gunayalapanama.com
 * - Reply-To & Admin: hello@gunayalapanamatravel.com
 * - Delivery flag: false by default to prevent unauthorized sends prior to domain verification
 */
export function getEmailConfig(): EmailDispatchConfig {
  return {
    resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
    enableDelivery: process.env.ENABLE_EMAIL_DELIVERY === 'true',
    senderAddress:
      process.env.EMAIL_FROM || 'Guna Yala Panama Travel <bookings@gunayalapanama.com>',
    replyToAddress: process.env.EMAIL_REPLY_TO || 'hello@gunayalapanamatravel.com',
    petraNotificationAddress:
      process.env.PETRA_NOTIFICATION_EMAIL || 'hello@gunayalapanamatravel.com',
  };
}

/**
 * Masks email address for privacy in server-side application logs
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Calculates exponential backoff delay in milliseconds.
 * Base: 60s, Doubling up to 1 hour max.
 */
export function calculateBackoffMs(retryCount: number): number {
  const baseSeconds = 60;
  const maxSeconds = 3600;
  const backoff = Math.min(maxSeconds, baseSeconds * Math.pow(2, retryCount));
  return backoff * 1000;
}

/**
 * Dispatches an email via the Resend REST API (POST https://api.resend.com/emails)
 * Supports:
 * - Provider-side idempotency header (Idempotency-Key)
 * - Safety gate for dry-run simulation
 * - 8-second network timeout with AbortController
 */
export async function sendEmailViaResend(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
  config: EmailDispatchConfig;
  requestId: string;
}): Promise<EmailSendResult> {
  const { to, from, replyTo, subject, html, text, idempotencyKey, config, requestId } = params;

  // SAFETY CHECK: Never attempt delivery if content is missing or blank
  if (!html || !html.trim()) {
    console.error(`[EmailService Error] Request ${requestId}: Blocked attempt to send email with empty content to ${maskEmail(to)}`);
    return {
      success: false,
      simulated: false,
      error: 'Blocked: Content body_html is missing or empty',
      status: 'failed',
    };
  }

  // SAFETY GATE: If real email delivery is not explicitly activated or API key is missing
  if (!config.enableDelivery || !config.resendApiKey) {
    const reason = !config.resendApiKey
      ? 'RESEND_API_KEY not configured'
      : 'ENABLE_EMAIL_DELIVERY is false (domain gunayalapanama.com pending verification)';

    console.log(
      `[EmailService - DRY RUN] Request ${requestId}: Delivery withheld (${reason}). Simulated send to ${maskEmail(
        to
      )} with subject "${subject}".`
    );

    return {
      success: true,
      simulated: true,
      messageId: `dry_run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      error: `Delivery withheld: ${reason}`,
      status: 'pending',
    };
  }

  // ACTIVE DELIVERY: Resend REST API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const resData: any = await response.json().catch(() => ({}));

    if (response.ok && resData?.id) {
      console.log(
        `[EmailService] Request ${requestId}: Email accepted by provider for ${maskEmail(to)}. Message ID: ${resData.id}`
      );
      return {
        success: true,
        simulated: false,
        messageId: resData.id,
        status: 'accepted',
      };
    }

    const errorMsg = resData?.message || `Provider responded with status ${response.status}`;
    console.error(`[EmailService Error] Request ${requestId}: Failed to deliver to ${maskEmail(to)}:`, errorMsg);

    return {
      success: false,
      simulated: false,
      error: errorMsg,
      status: 'failed',
    };
  } catch (err: any) {
    const errorMsg = err?.name === 'AbortError' ? 'Provider timeout (8s exceeded)' : err?.message || 'Network error';
    console.error(`[EmailService Exception] Request ${requestId}:`, errorMsg);
    return {
      success: false,
      simulated: false,
      error: errorMsg,
      status: 'failed',
    };
  }
}

/**
 * Builds the 3 Phase 1 email message specifications for a booking request:
 * 1. Customer Acknowledgement (bilingual)
 * 2. Petra Operational Notification
 * 3. Petra's Audit Copy of Customer Acknowledgement (stores verbatim customer body, transmits separate audit banner)
 */
export function buildBookingEmailMessages(
  payload: BookingEmailPayload,
  config: EmailDispatchConfig
): QueuedEmailMessage[] {
  const customerEmail = generateCustomerAcknowledgementEmail(payload);
  const petraNotif = generatePetraNotificationEmail(payload);
  const petraCopy = generatePetraCustomerCopyEmail(payload);

  return [
    {
      queueKey: `${payload.bookingReference}:customer_ack`,
      idempotencyKey: `idem_${payload.bookingReference}_cust_ack`,
      bookingReference: payload.bookingReference,
      recipientEmail: payload.customerEmail,
      recipientRole: 'customer',
      emailType: 'customer_acknowledgement',
      subject: customerEmail.subject,
      bodyHtml: customerEmail.html,
      bodyText: customerEmail.text,
      sendHtml: customerEmail.html,
      sendText: customerEmail.text,
      replyTo: config.replyToAddress,
      retryCount: 0,
      maxRetries: 5,
    },
    {
      queueKey: `${payload.bookingReference}:petra_notif`,
      idempotencyKey: `idem_${payload.bookingReference}_petra_notif`,
      bookingReference: payload.bookingReference,
      recipientEmail: config.petraNotificationAddress,
      recipientRole: 'petra',
      emailType: 'petra_notification',
      subject: petraNotif.subject,
      bodyHtml: petraNotif.html,
      bodyText: petraNotif.text,
      sendHtml: petraNotif.html,
      sendText: petraNotif.text,
      replyTo: payload.customerEmail, // Allows direct reply to customer
      retryCount: 0,
      maxRetries: 5,
    },
    {
      queueKey: `${payload.bookingReference}:petra_ack_copy`,
      idempotencyKey: `idem_${payload.bookingReference}_petra_ack_copy`,
      bookingReference: payload.bookingReference,
      recipientEmail: config.petraNotificationAddress,
      recipientRole: 'petra',
      emailType: 'customer_acknowledgement_copy',
      subject: petraCopy.subject,
      bodyHtml: petraCopy.verbatimCustomerHtml, // Verbatim archived customer body in database
      bodyText: petraCopy.verbatimCustomerText,
      sendHtml: petraCopy.html, // Envelope with distinct audit header sent to Petra
      sendText: petraCopy.text,
      replyTo: payload.customerEmail, // Allows direct reply to customer
      retryCount: 0,
      maxRetries: 5,
    },
  ];
}

/**
 * Recovers and prepares missing email content by querying booking_requests
 * in the event of a serverless interruption between booking creation and email preparation.
 */
export async function recoverMissingEmailContent(
  supabase: any,
  queueItem: any,
  config: EmailDispatchConfig
): Promise<{ html: string; text: string; subject: string } | null> {
  if (!supabase || !queueItem.booking_reference) return null;

  try {
    const { data: booking, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('booking_reference', queueItem.booking_reference)
      .maybeSingle();

    if (error || !booking) {
      console.warn(`[EmailService] Cannot recover email content: booking ${queueItem.booking_reference} not found.`);
      return null;
    }

    const payload: BookingEmailPayload = {
      bookingReference: booking.booking_reference,
      bookingType: booking.booking_type || 'overnight',
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      experienceTitle: booking.experience_title,
      targetDate: booking.target_date,
      departureDate: booking.departure_date,
      nights: booking.nights,
      adults: booking.adults || 1,
      children: booking.children || 0,
      accommodationPreference: booking.accommodation_preference,
      pickupLocation: booking.pickup_location,
      specialNotes: booking.special_notes,
      termsAccepted: booking.terms_accepted,
      termsVersion: booking.terms_version || '2026-10-18',
      customerLanguage: (booking.customer_language || 'en') as 'en' | 'es',
      submittedAt: booking.created_at || new Date().toISOString(),
    };

    if (queueItem.email_type === 'customer_acknowledgement') {
      const email = generateCustomerAcknowledgementEmail(payload);
      return { html: email.html, text: email.text, subject: email.subject };
    } else if (queueItem.email_type === 'petra_notification') {
      const email = generatePetraNotificationEmail(payload);
      return { html: email.html, text: email.text, subject: email.subject };
    } else if (queueItem.email_type === 'customer_acknowledgement_copy') {
      const email = generatePetraCustomerCopyEmail(payload);
      return { html: email.html, text: email.text, subject: email.subject };
    }

    return null;
  } catch (err: any) {
    console.error('[EmailService] Content recovery exception:', err?.message || err);
    return null;
  }
}

/**
 * Updates or creates an email_logs entry in Supabase.
 * Handles both the base schema and any additive migration columns defensively.
 */
async function syncEmailLogEntry(
  supabase: any,
  msg: QueuedEmailMessage,
  result: EmailSendResult,
  requestId: string
): Promise<void> {
  if (!supabase || !msg.bookingReference) return;

  const status = result.status;
  const isSuccess = result.success;

  try {
    // 1. Try full additive schema update with queue_key and rendered content
    const fullPayload: Record<string, any> = {
      booking_reference: msg.bookingReference,
      recipient_email: msg.recipientEmail,
      recipient_role: msg.recipientRole,
      email_type: msg.emailType,
      subject: msg.subject,
      delivery_status: status,
      provider_message_id: result.messageId || null,
      error_details: result.error || null,
      queue_key: msg.queueKey,
      idempotency_key: msg.idempotencyKey,
      body_html: msg.bodyHtml,
      body_text: msg.bodyText,
      locked_until: null,
      locked_by: null,
    };

    if (isSuccess && !result.simulated) {
      fullPayload.accepted_at = new Date().toISOString();
    }

    // Try upserting by queue_key
    const { error: upsertErr } = await supabase
      .from('email_logs')
      .upsert(fullPayload, { onConflict: 'queue_key' });

    if (!upsertErr) return;

    // 2. Fallback for pre-migrated schema:
    const basePayload: Record<string, any> = {
      delivery_status: status,
      provider_message_id: result.messageId || null,
      error_details: result.error || null,
    };

    const { data: updated, error: updateErr } = await supabase
      .from('email_logs')
      .update(basePayload)
      .eq('booking_reference', msg.bookingReference)
      .eq('recipient_role', msg.recipientRole)
      .select('id');

    // If no existing record was matched, insert a compatible record
    if (!updateErr && (!updated || updated.length === 0)) {
      const fallbackType =
        msg.emailType === 'customer_acknowledgement_copy'
          ? 'customer_acknowledgement'
          : msg.emailType;

      await supabase.from('email_logs').insert([
        {
          booking_reference: msg.bookingReference,
          recipient_email: msg.recipientEmail,
          recipient_role: msg.recipientRole,
          email_type: fallbackType,
          subject: msg.subject,
          delivery_status: status,
          provider_message_id: result.messageId || null,
          error_details: result.error || null,
        },
      ]);
    }
  } catch (err: any) {
    console.warn(`[EmailService DB Warning] Request ${requestId}: Unable to synchronize email_logs row:`, err?.message);
  }
}

/**
 * Orchestrates sending customer acknowledgement, Petra operational notification,
 * and Petra's audit copy of the customer acknowledgement.
 *
 * SAFETY INVARIANTS:
 * 1. Content Durably Persisted FIRST: All rendered content (body_html, body_text) is saved
 *    to email_logs before any provider transmission is attempted.
 * 2. Concurrency/Retry protection: If isIdempotentReplay is true, sending is skipped.
 * 3. Non-blocking failure isolation: Exceptions in this function NEVER fail the booking request.
 * 4. Separate Audit Banner: Petra receives a verbatim copy with the audit header cleanly separated.
 */
export async function dispatchBookingEmails(options: DispatchBookingEmailsOptions): Promise<{
  skipped: boolean;
  messagesSent: number;
  results: Record<string, EmailSendResult>;
}> {
  const { supabase, payload, isIdempotentReplay, requestId } = options;
  const config = getEmailConfig();

  // 1. Prevent duplicate email sends on idempotent retransmissions
  if (isIdempotentReplay) {
    console.log(
      `[EmailService] Request ${requestId}: Idempotent replay detected for ${payload.bookingReference}. Skipping duplicate email dispatch.`
    );
    return { skipped: true, messagesSent: 0, results: {} };
  }

  const results: Record<string, EmailSendResult> = {};

  try {
    // 2. Build the 3 Phase 1 email message specifications
    const messages = buildBookingEmailMessages(payload, config);

    // 3. PERSIST CONTENT FIRST: Ensure all 3 messages are durably stored in the queue with full body_html
    for (const msg of messages) {
      await syncEmailLogEntry(
        supabase,
        msg,
        {
          status: 'pending',
          success: true,
          simulated: true,
          error: 'Content prepared and enqueued; delivery pending.',
        },
        requestId
      );
    }

    // 4. Dispatch all 3 messages
    for (const msg of messages) {
      const res = await sendEmailViaResend({
        to: msg.recipientEmail,
        from: config.senderAddress,
        replyTo: msg.replyTo,
        subject: msg.subject,
        html: msg.sendHtml || msg.bodyHtml,
        text: msg.sendText || msg.bodyText,
        idempotencyKey: msg.idempotencyKey,
        config,
        requestId,
      });

      results[msg.queueKey] = res;

      // 5. Update email_logs with provider response
      await syncEmailLogEntry(supabase, msg, res, requestId);
    }

    return {
      skipped: false,
      messagesSent: messages.length,
      results,
    };
  } catch (err: any) {
    console.error(
      `[EmailService Fatal Catch] Request ${requestId}: Email pipeline caught error (booking preserved):`,
      err?.message || err
    );
    return {
      skipped: false,
      messagesSent: 0,
      results: {
        error: {
          success: false,
          simulated: false,
          status: 'failed',
          error: err?.message || 'Email pipeline error',
        },
      },
    };
  }
}

/**
 * Concurrency-safe Email Queue Claim & Retry Processor
 *
 * Implements:
 * - Lease-based worker locking (locked_by, locked_until)
 * - Exclusion of historical pre-activation records (e.g. GNY-482325, archived)
 * - Content presence guarantee: verifies body_html exists before delivery
 * - Interruption recovery: reconstructs missing content from booking_requests
 * - Exponential backoff calculation
 * - Stale lease recovery
 * - Bounded retry limits
 */
export interface ProcessEmailQueueResult {
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  deliveryEnabled?: boolean;
  reason?: string;
  error?: string;
}

/**
 * Repairs any pending queue records that may lack rendered content
 * due to serverless interruption before atomic claiming.
 */
export async function repairMissingQueueContent(supabase: any, config: EmailDispatchConfig): Promise<number> {
  if (!supabase || typeof supabase.from !== 'function') return 0;
  try {
    const { data: missingRows, error } = await supabase
      .from('email_logs')
      .select('id, booking_reference, email_type, subject')
      .in('delivery_status', ['pending', 'failed'])
      .is('body_html', null)
      .limit(10);

    if (error || !missingRows || !Array.isArray(missingRows) || missingRows.length === 0) return 0;

    let repaired = 0;
    for (const row of missingRows) {
      if (row.booking_reference === 'GNY-482325') continue;
      const recovered = await recoverMissingEmailContent(supabase, row, config);
      if (recovered && recovered.html) {
        await supabase
          .from('email_logs')
          .update({
            body_html: recovered.html,
            body_text: recovered.text,
            subject: recovered.subject || row.subject,
          })
          .eq('id', row.id);
        repaired++;
      }
    }
    return repaired;
  } catch (err: any) {
    console.warn('[EmailQueue] Content repair check warning:', err?.message);
    return 0;
  }
}

/**
 * Concurrency-safe Email Queue Claim & Retry Processor
 *
 * Implements:
 * 1. Strict Delivery Disabled Gate: If ENABLE_EMAIL_DELIVERY=false, exits safely without
 *    claiming or modifying any queue records.
 * 2. Atomic Database Claims: Uses exclusively the server-side claim_email_queue_batch RPC
 *    (PostgreSQL FOR UPDATE SKIP LOCKED) to prevent race conditions and lock conflicts.
 * 3. Stale Lease Recovery: Handled natively inside claim_email_queue_batch RPC.
 * 4. Content Presence & Retry Bounding: Handled inside claim_email_queue_batch RPC.
 * 5. Historical Record Safety: Excludes GNY-482325 and archived records.
 * 6. Exponential Backoff on Provider Failures.
 */
export async function processEmailQueue(options: {
  supabase: any;
  workerId: string;
  batchSize?: number;
  leaseSeconds?: number;
}): Promise<ProcessEmailQueueResult> {
  const { supabase, workerId, batchSize = 10, leaseSeconds = 60 } = options;
  if (!supabase) return { processedCount: 0, succeededCount: 0, failedCount: 0, deliveryEnabled: false };

  const config = getEmailConfig();

  // 1. SAFETY GATE: When email delivery is disabled, exit safely without claiming or altering queue records
  if (!config.enableDelivery || !config.resendApiKey) {
    const reason = !config.resendApiKey
      ? 'RESEND_API_KEY is not configured'
      : 'ENABLE_EMAIL_DELIVERY is false (gunayalapanama.com domain pending purchase/verification)';

    console.log(
      `[EmailQueue] Delivery disabled (${reason}). Worker ${workerId} exiting safely without claiming or altering queue records.`
    );

    return {
      processedCount: 0,
      succeededCount: 0,
      failedCount: 0,
      deliveryEnabled: false,
      reason,
    };
  }

  let processedCount = 0;
  let succeededCount = 0;
  let failedCount = 0;

  try {
    // 2. Pre-claim content recovery pass: restore any interrupted records
    await repairMissingQueueContent(supabase, config);

    // 3. ATOMIC SERVER-SIDE CLAIM: Invoke Supabase RPC claim_email_queue_batch
    // Enforces FOR UPDATE SKIP LOCKED, lease expiration recovery, and content validation
    if (typeof supabase.rpc !== 'function') {
      console.error(`[EmailQueue Error] Worker ${workerId}: supabase.rpc is not available.`);
      return {
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        deliveryEnabled: true,
        error: 'supabase.rpc function is required for atomic queue claiming.',
      };
    }

    const { data: claimedBatch, error: claimErr } = await supabase.rpc('claim_email_queue_batch', {
      p_worker_id: workerId,
      p_batch_size: batchSize,
      p_lease_seconds: leaseSeconds,
    });

    if (claimErr) {
      console.error(`[EmailQueue Error] Worker ${workerId} failed to claim batch via RPC:`, claimErr.message);
      return {
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        deliveryEnabled: true,
        error: claimErr.message,
      };
    }

    if (!claimedBatch || !Array.isArray(claimedBatch) || claimedBatch.length === 0) {
      return {
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        deliveryEnabled: true,
      };
    }

    // 4. Process each atomically claimed item
    for (const item of claimedBatch) {
      // Defensive exclusion: Never process historical test booking records
      if (
        item.booking_reference === 'GNY-482325' ||
        item.delivery_status === 'archived' ||
        (item.error_details && item.error_details.includes('Historical test record'))
      ) {
        continue;
      }

      processedCount++;

      const replyTo =
        item.recipient_role === 'petra'
          ? config.replyToAddress
          : config.replyToAddress;

      const res = await sendEmailViaResend({
        to: item.recipient_email,
        from: config.senderAddress,
        replyTo,
        subject: item.subject,
        html: item.body_html,
        text: item.body_text || item.subject,
        idempotencyKey: item.idempotency_key || `retry_${item.id}_${item.retry_count || 0}`,
        config,
        requestId: workerId,
      });

      // 5. Update status based on delivery outcome
      if (res.success && !res.simulated) {
        succeededCount++;
        await supabase
          .from('email_logs')
          .update({
            delivery_status: 'accepted',
            provider_message_id: res.messageId || null,
            accepted_at: new Date().toISOString(),
            error_details: null,
            locked_by: null,
            locked_until: null,
          })
          .eq('id', item.id);
      } else {
        failedCount++;
        const newRetryCount = (item.retry_count || 0) + 1;
        const maxRetries = item.max_retries || 5;
        const isExhausted = newRetryCount >= maxRetries;

        const nextRetryMs = calculateBackoffMs(newRetryCount);
        const nextRetryISO = new Date(Date.now() + nextRetryMs).toISOString();

        await supabase
          .from('email_logs')
          .update({
            delivery_status: 'failed',
            retry_count: newRetryCount,
            next_retry_at: isExhausted ? null : nextRetryISO,
            error_details: isExhausted
              ? `Max retries (${maxRetries}) exhausted. Last error: ${res.error}`
              : res.error,
            locked_by: null,
            locked_until: null,
          })
          .eq('id', item.id);
      }
    }
  } catch (err: any) {
    console.error(`[EmailQueueProcessor Error] Worker ${workerId}:`, err?.message || err);
    return {
      processedCount,
      succeededCount,
      failedCount,
      deliveryEnabled: true,
      error: err?.message || 'Unexpected queue processing error',
    };
  }

  return { processedCount, succeededCount, failedCount, deliveryEnabled: true };
}
