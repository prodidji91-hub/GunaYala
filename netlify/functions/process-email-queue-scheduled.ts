import { createClient } from '@supabase/supabase-js';
import { processEmailQueue } from './emailService.js';

/**
 * Netlify Scheduled Functions Configuration
 * Runs periodically (every 10 minutes) in UTC.
 */
export const config = {
  schedule: '*/10 * * * *',
};

interface ScheduledEvent {
  next_run?: string;
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
}

/**
 * Netlify Scheduled Function: Automatic Email Queue Processor
 *
 * Execution Invariants:
 * 1. Automatic Cron Invocations: Executed by Netlify's internal scheduler every 10 minutes.
 * 2. Public Access Protection: Direct HTTP invocations are blocked unless authenticated
 *    via x-queue-secret matching QUEUE_PROCESSING_SECRET.
 * 3. Delivery Disabled Safety: If ENABLE_EMAIL_DELIVERY=false, exits immediately without
 *    invoking claim_email_queue_batch RPC or altering any records.
 * 4. Atomic Server-Side Claiming: When enabled, claims records using the Supabase
 *    claim_email_queue_batch RPC with PostgreSQL FOR UPDATE SKIP LOCKED.
 */
export const handler = async (event: ScheduledEvent = {}) => {
  const workerId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. PUBLIC PROTECTION: If invoked via direct HTTP request (not Netlify cron runner),
  // require valid x-queue-secret authentication to prevent unauthorized execution.
  if (event.httpMethod) {
    const queueSecretHeader =
      event.headers?.['x-queue-secret'] || event.headers?.['X-Queue-Secret'] || '';
    const configuredSecret = process.env.QUEUE_PROCESSING_SECRET || '';

    if (!configuredSecret || queueSecretHeader !== configuredSecret) {
      console.warn(`[ScheduledQueue] Blocked unauthorized HTTP request to scheduled endpoint from ${workerId}`);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized: Direct HTTP access requires valid x-queue-secret authentication.',
        }),
      };
    }
  }

  // 2. Server credentials check
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`[ScheduledQueue] Worker ${workerId}: Missing required Supabase credentials.`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Server configuration error: Database credentials missing.',
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`[ScheduledQueue] Starting scheduled queue check ${workerId} (next_run: ${event.next_run || 'cron'})`);

  try {
    const result = await processEmailQueue({
      supabase,
      workerId,
      batchSize: 10,
      leaseSeconds: 60,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        workerId,
        scheduled: true,
        ...result,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error(`[ScheduledQueue Exception] Worker ${workerId}:`, err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'An unexpected error occurred during scheduled queue processing.',
        details: err?.message,
      }),
    };
  }
};
