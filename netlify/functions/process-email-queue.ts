import { createClient } from '@supabase/supabase-js';
import { processEmailQueue } from './emailService.js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

/**
 * Netlify Function: Process Email Queue
 *
 * SECURE QUEUE WORKER TRIGGER:
 * Requires authentication via:
 * 1. Administrator Supabase JWT Bearer token (verified against is_quotation_admin() / quotation_admins)
 * 2. OR internal server secret header (x-queue-secret matching QUEUE_PROCESSING_SECRET)
 *
 * Unauthenticated requests are rejected immediately with HTTP 401.
 */
export const handler = async (event: NetlifyEvent) => {
  const workerId = `worker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Queue-Secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Use POST.' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Server configuration error: Required database credentials missing.',
      }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // AUTHENTICATION CHECK
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const queueSecretHeader = event.headers['x-queue-secret'] || event.headers['X-Queue-Secret'] || '';
  const configuredSecret = process.env.QUEUE_PROCESSING_SECRET || '';

  let isAuthorized = false;
  let authType = 'none';

  // Check 1: Shared Queue Secret (for scheduled worker or cron triggers)
  if (configuredSecret && queueSecretHeader && queueSecretHeader === configuredSecret) {
    isAuthorized = true;
    authType = 'secret_header';
  }

  // Check 2: Administrator JWT Bearer Token
  if (!isAuthorized && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (!userError && userData?.user?.id) {
      // Verify user exists in quotation_admins
      const { data: adminRecord, error: adminError } = await supabase
        .from('quotation_admins')
        .select('user_id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!adminError && adminRecord?.user_id) {
        isAuthorized = true;
        authType = `admin_${userData.user.id}`;
      }
    }
  }

  if (!isAuthorized) {
    console.warn(`[ProcessEmailQueue] Unauthorized attempt on queue processing from worker ${workerId}`);
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Unauthorized: Valid administrator credentials or queue secret required to trigger email retries.',
      }),
    };
  }

  console.log(`[ProcessEmailQueue] Starting queue worker ${workerId} (authorized via ${authType})`);

  try {
    const parsedBody = JSON.parse(event.body || '{}');
    const batchSize = typeof parsedBody.batchSize === 'number' ? parsedBody.batchSize : 10;
    const leaseSeconds = typeof parsedBody.leaseSeconds === 'number' ? parsedBody.leaseSeconds : 60;

    const result = await processEmailQueue({
      supabase,
      workerId,
      batchSize,
      leaseSeconds,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        workerId,
        authType,
        ...result,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error(`[ProcessEmailQueue Exception] Worker ${workerId}:`, err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'An internal error occurred while processing the email queue.',
        details: err?.message,
      }),
    };
  }
};
