import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { processEmailQueue } from './emailService.js';

/**
 * Netlify Scheduled Functions Configuration
 * Declares the 10-minute UTC cron schedule using the officially supported Config contract.
 */
export const config: Config = {
  schedule: '*/10 * * * *',
};

interface ScheduledResultPayload {
  success: boolean;
  workerId: string;
  scheduled: boolean;
  deliveryEnabled?: boolean;
  processedCount: number;
  succeededCount: number;
  failedCount: number;
  items?: any[];
  timestamp: string;
  error?: string;
  details?: string;
}

/**
 * Core scheduled queue execution logic.
 * Uses exclusively server-side Supabase credentials and invokes atomic claim_email_queue_batch RPC.
 * When ENABLE_EMAIL_DELIVERY=false (default), safely exits with zero claims and zero provider calls.
 */
async function executeScheduledQueue(nextRun = 'cron'): Promise<{ statusCode: number; payload: ScheduledResultPayload }> {
  const workerId = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Validate server-side Supabase credentials
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error(`[ScheduledQueue] Worker ${workerId}: Missing required Supabase credentials.`);
    return {
      statusCode: 500,
      payload: {
        success: false,
        workerId,
        scheduled: true,
        deliveryEnabled: false,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        timestamp: new Date().toISOString(),
        error: 'Server configuration error: Database credentials missing.',
      },
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log(`[ScheduledQueue] Starting scheduled queue check ${workerId} (next_run: ${nextRun})`);

  try {
    const result = await processEmailQueue({
      supabase,
      workerId,
      batchSize: 10,
      leaseSeconds: 60,
    });

    return {
      statusCode: 200,
      payload: {
        success: true,
        workerId,
        scheduled: true,
        ...result,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error(`[ScheduledQueue Exception] Worker ${workerId}:`, err?.message || err);
    return {
      statusCode: 500,
      payload: {
        success: false,
        workerId,
        scheduled: true,
        deliveryEnabled: false,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        timestamp: new Date().toISOString(),
        error: 'An unexpected error occurred during scheduled queue processing.',
        details: err?.message,
      },
    };
  }
}

/**
 * Modern Netlify Functions (v2) default-export handler.
 * Receives the standard Request object supplied by Netlify's cron invocation runner.
 * Automatically accepts legitimate scheduled invocations without rejecting them.
 */
export default async function (req?: Request): Promise<Response> {
  let nextRun = 'cron';

  if (req) {
    try {
      if (typeof req.json === 'function') {
        const body = await req.json().catch(() => ({}));
        if (body && typeof body === 'object' && body.next_run) {
          nextRun = String(body.next_run);
        }
      }
    } catch {
      // Graceful fallback if request body is empty or non-JSON
    }
  }

  const { statusCode, payload } = await executeScheduledQueue(nextRun);

  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Supported handler export for backward compatibility with isolated test suites,
 * local development environments, and Netlify function adapters.
 */
export async function handler(event?: any) {
  let nextRun = 'cron';
  if (event) {
    if (event.next_run) {
      nextRun = String(event.next_run);
    } else if (event.body) {
      try {
        const parsed = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
        if (parsed && parsed.next_run) {
          nextRun = String(parsed.next_run);
        }
      } catch {
        // Fallback to default
      }
    }
  }

  const { statusCode, payload } = await executeScheduledQueue(nextRun);

  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
