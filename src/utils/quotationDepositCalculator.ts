export interface DepositCalculationCentsResult {
  approvedTotalCents: number;
  depositCents: number;
  remainingBalanceCents: number;
  approvedTotalUsd: number;
  depositUsd: number;
  remainingBalanceUsd: number;
}

export interface ApprovedOvernightValidationResult {
  valid: boolean;
  reasonCode?:
    | 'missing_quotation'
    | 'not_overnight'
    | 'not_approved'
    | 'pricing_pending'
    | 'expired'
    | 'missing_customer'
    | 'inquiry_mismatch'
    | 'invalid_total'
    | 'tampered_total';
  error?: string;
  quotationId: string;
  quotationReference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  island: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  travelers: number;
  experienceTitle: string;
  deposit?: DepositCalculationCentsResult;
}

export function formatUsdFromCents(cents: number): string {
  const safe = Number.isFinite(cents) ? cents : 0;
  return (safe / 100).toFixed(2);
}

/**
 * Deterministic 50% deposit calculation strictly in integer cents.
 * Rounding rule for odd cents: half-up on the deposit portion so that
 * depositCents + remainingBalanceCents === approvedTotalCents at all times.
 * Example: 60000 ($600.00) -> deposit 30000 ($300.00), remaining 30000 ($300.00).
 * Example: 60101 ($601.01) -> deposit 30051 ($300.51), remaining 30050 ($300.50).
 */
export function calculate50PercentDepositCents(approvedTotalCents: number): DepositCalculationCentsResult {
  if (!Number.isFinite(approvedTotalCents) || !Number.isInteger(approvedTotalCents) || approvedTotalCents < 200) {
    throw new Error('Approved quotation total must be at least $2.00 USD (200 cents) to generate a $1.00+ PagueloFacil 50% deposit link.');
  }

  const depositCents = Math.floor((approvedTotalCents + 1) / 2);
  const remainingBalanceCents = approvedTotalCents - depositCents;

  return {
    approvedTotalCents,
    depositCents,
    remainingBalanceCents,
    approvedTotalUsd: Number((approvedTotalCents / 100).toFixed(2)),
    depositUsd: Number((depositCents / 100).toFixed(2)),
    remainingBalanceUsd: Number((remainingBalanceCents / 100).toFixed(2)),
  };
}

/**
 * Returns today's YYYY-MM-DD date in America/Panama timezone.
 */
export function getPanamaDateString(now: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Panama',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * Independently recomputes quotation subtotal, tax, and total from underlying pricing fields.
 * Mirrors calculateQuotationTotals() in quotationStorageService.ts without trusting stored summary totals blindly.
 */
export function recomputeQuotationTotalsCents(q: any): {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
} {
  const pricingMode = q?.pricingMode || (Array.isArray(q?.lineItems) && q.lineItems.length > 0 ? 'custom_itemized' : 'first_night_additional');
  const travelers = Math.max(1, Math.round(Number(q?.travelers || 1)));
  const nights = Math.max(1, Math.round(Number(q?.nights || 1)));
  const firstNightRate = Number(q?.firstNightRate || 0);
  const additionalNightRate = Number(q?.additionalNightRate || 0);
  const totalPackagePrice = Number(q?.totalPackagePrice || 0);
  const lineItems: any[] = Array.isArray(q?.lineItems) ? q.lineItems : [];
  const enableTax = q?.enableTax !== undefined
    ? Boolean(q.enableTax)
    : (q?.enableAdditionalCharge !== undefined ? Boolean(q.enableAdditionalCharge) : false);
  const taxPercent = Number(
    typeof q?.taxPercent === 'number'
      ? q.taxPercent
      : (typeof q?.additionalChargePercent === 'number' ? q.additionalChargePercent : 7)
  );

  let basePackageTotal = 0;
  if (pricingMode === 'first_night_additional') {
    const firstNightTotal = firstNightRate * travelers;
    const additionalNightsCount = Math.max(0, nights - 1);
    const additionalNightsTotal = additionalNightRate * travelers * additionalNightsCount;
    basePackageTotal = firstNightTotal + additionalNightsTotal;
  } else if (pricingMode === 'single_total') {
    basePackageTotal = totalPackagePrice;
  }

  let optionalExtrasTotal = 0;
  for (const item of lineItems) {
    const qty = Number(item?.quantity ?? 1);
    const unitPrice = Number(item?.unitPrice ?? 0);
    const computedLine = Math.round(qty * unitPrice * 100) / 100;
    optionalExtrasTotal += computedLine;
  }

  let subtotal = 0;
  if (pricingMode === 'first_night_additional' || pricingMode === 'single_total') {
    subtotal = Math.round((basePackageTotal + optionalExtrasTotal) * 100) / 100;
  } else {
    subtotal = Math.round(optionalExtrasTotal * 100) / 100;
  }

  const taxAmount = enableTax ? Math.round(((subtotal * taxPercent) / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    subtotalCents: Math.round(subtotal * 100),
    taxCents: Math.round(taxAmount * 100),
    totalCents: Math.round(total * 100),
  };
}

/**
 * Verifies whether a quotation represents an overnight island stay eligible for a 50% deposit.
 * Rejects Day Tours / Day Trips which require 100% upfront payment rather than 50% overnight deposit.
 */
export function isOvernightQuotation(q: any): boolean {
  if (!q || typeof q !== 'object') return false;

  const bookingType = String(q.bookingType || q.quotationType || '').trim().toLowerCase();
  if (bookingType === 'day-trip' || bookingType === 'day_trip' || bookingType === 'day-tour') {
    return false;
  }

  const combinedText = `${q.experience || ''} ${q.packageTitle || ''} ${q.island || ''}`.toLowerCase();
  const mentionsDayTour =
    combinedText.includes('day tour') ||
    combinedText.includes('day trip') ||
    combinedText.includes('pasadía') ||
    combinedText.includes('pasadia');

  const nights = Number(q.nights ?? 0);
  if (mentionsDayTour || !Number.isFinite(nights) || nights < 1) {
    return false;
  }

  return true;
}

export function validateApprovedOvernightQuotation(input: {
  rowId: string;
  rowStatus?: string | null;
  rowTotal?: number | string | null;
  rowInquiryId?: string | null;
  rowCustomerName?: string | null;
  quotationData: any;
  linkedInquiry?: any;
  linkedCustomer?: any;
  now?: Date;
}): ApprovedOvernightValidationResult {
  const q = input.quotationData;
  const quotationId = String(input.rowId || q?.id || '').trim();
  const quotationReference = String(q?.reference || quotationId).trim();

  if (!quotationId || !q || typeof q !== 'object') {
    return {
      valid: false,
      reasonCode: 'missing_quotation',
      error: 'Quotation record is missing or malformed.',
      quotationId,
      quotationReference,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      island: '',
      arrivalDate: '',
      departureDate: '',
      nights: 0,
      travelers: 0,
      experienceTitle: '',
    };
  }

  const customerName = String(q.customerName || input.rowCustomerName || input.linkedCustomer?.full_name || '').trim();
  const customerEmail = String(q.customerEmail || input.linkedCustomer?.email || '').trim();
  const customerPhone = String(q.customerPhone || input.linkedCustomer?.whatsapp || '').trim();
  const island = String(q.island || '').trim();
  const arrivalDate = String(q.arrivalDate || '').trim();
  const departureDate = String(q.departureDate || '').trim();
  const nights = Math.max(0, Math.round(Number(q.nights || 0)));
  const travelers = Math.max(1, Math.round(Number(q.travelers || 1)));
  const experienceTitle = String(q.packageTitle || q.experience || `${island} Overnight Stay`).trim();

  const baseResult = {
    quotationId,
    quotationReference,
    customerName,
    customerEmail,
    customerPhone,
    island,
    arrivalDate,
    departureDate,
    nights,
    travelers,
    experienceTitle,
  };

  // 1. Must be an overnight experience (not day tour)
  if (!isOvernightQuotation(q)) {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'not_overnight',
      error: 'Only overnight quotations with >= 1 night are eligible for 50% deposit payment links.',
    };
  }

  // 2. Explicit Petra approval check
  const effectiveStatus = String(q.status || input.rowStatus || '').trim();
  const isStatusApproved = effectiveStatus === 'Ready for review' || effectiveStatus === 'Approved';
  const isTermsApproved = q.termsStatus === 'Approved by Petra';

  if (!isStatusApproved || !isTermsApproved) {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'not_approved',
      error: 'Quotation must be marked "Approved by Petra" and "Ready for review" before generating a 50% deposit link.',
    };
  }

  // 3. Pricing status must be confirmed
  if (q.pricingStatus === 'Rates to Be Confirmed' || q.pricingStatus !== 'Priced Quotation') {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'pricing_pending',
      error: 'Quotation pricing status must be "Priced Quotation" before generating a payment link.',
    };
  }

  // 4. Expiration check (Panama date)
  if (q.expiryDate && typeof q.expiryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.expiryDate.trim())) {
    const todayPanama = getPanamaDateString(input.now);
    if (q.expiryDate.trim() < todayPanama) {
      return {
        ...baseResult,
        valid: false,
        reasonCode: 'expired',
        error: `Quotation ${quotationReference} expired on ${q.expiryDate.trim()}. Please create an updated revision before generating a deposit link.`,
      };
    }
  }

  // 5. Customer identity and inquiry relationship verification
  if (!customerName || !customerEmail || !customerEmail.includes('@')) {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'missing_customer',
      error: 'Customer name and valid customer email address are required on the quotation or CRM profile before generating a deposit link.',
    };
  }

  const effectiveInquiryId = String(input.rowInquiryId || q.inquiry_id || '').trim();
  if (effectiveInquiryId && input.linkedInquiry !== undefined) {
    if (!input.linkedInquiry) {
      return {
        ...baseResult,
        valid: false,
        reasonCode: 'inquiry_mismatch',
        error: `Linked CRM inquiry (${effectiveInquiryId}) does not exist.`,
      };
    }
    if (
      input.linkedCustomer &&
      input.linkedInquiry.customer_id &&
      input.linkedCustomer.id &&
      input.linkedInquiry.customer_id !== input.linkedCustomer.id
    ) {
      return {
        ...baseResult,
        valid: false,
        reasonCode: 'inquiry_mismatch',
        error: 'Quotation CRM inquiry does not belong to the associated customer record.',
      };
    }
  }

  // 6. Authoritative USD total & anti-tampering validation
  const recomputed = recomputeQuotationTotalsCents(q);
  const storedDataTotal = Number(q.total ?? NaN);
  const storedRowTotal = input.rowTotal !== undefined && input.rowTotal !== null ? Number(input.rowTotal) : storedDataTotal;

  if (!Number.isFinite(storedDataTotal) || !Number.isFinite(storedRowTotal) || recomputed.totalCents < 200) {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'invalid_total',
      error: 'Approved quotation USD total must be at least $2.00 USD (200 cents) with valid priced items.',
    };
  }

  const storedDataCents = Math.round(storedDataTotal * 100);
  const storedRowCents = Math.round(storedRowTotal * 100);

  if (Math.abs(storedDataCents - storedRowCents) > 1 || Math.abs(recomputed.totalCents - storedRowCents) > 1) {
    return {
      ...baseResult,
      valid: false,
      reasonCode: 'tampered_total',
      error: `Quotation total integrity check failed (recomputed ${formatUsdFromCents(recomputed.totalCents)} vs stored ${formatUsdFromCents(storedRowCents)}). Please re-save the quotation in the editor.`,
    };
  }

  const deposit = calculate50PercentDepositCents(recomputed.totalCents);

  return {
    ...baseResult,
    valid: true,
    deposit,
  };
}
