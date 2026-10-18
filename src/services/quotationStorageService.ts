import {
  Quotation,
  LineItem,
  AttachedPhoto,
  TransportOption,
  PricingBasis,
  TermsStatus,
  StructuredPackageSnapshot,
} from '../types/quotation';
import { PACKAGE_TEMPLATES } from '../data/packageTemplates';
import { SAMPLE_DESTINATION_PHOTOS } from '../data/samplePhotos';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const LOCAL_STORAGE_KEY = 'guna_yala_prototype_quotations_v2';
const PENDING_CONFIRMATION = 'Pending Petra’s confirmation.';

export function getOutdatedFieldsInfo(q: Partial<Quotation>): {
  hasOutdatedText: boolean;
  outdatedFields: string[];
} {
  if (!q) return { hasOutdatedText: false, outdatedFields: [] };
  const legacyPhrases = [
    '14+ days',
    '90% refund',
    '$20 usd',
    'port tax ($5',
    'port fee ($5',
    'snorkeling masks',
    'snorkeling gear',
    'petra & abisua concierge',
  ];

  const fieldSet = new Set<string>();

  const check = (fieldName: string, value: any) => {
    if (!value) return;
    const str = (typeof value === 'string' ? value : JSON.stringify(value)).toLowerCase();
    if (legacyPhrases.some((phrase) => str.includes(phrase))) {
      fieldSet.add(fieldName);
    }
  };

  check('Conditions', [
    q.paymentSchedule,
    q.depositRequirement,
    q.cancellationTerms,
    q.weatherLogisticsNote,
    q.seasonalConditions,
  ]);
  check('Inclusions', q.inclusions);
  check('Exclusions', q.exclusions);
  check('Package Descriptions', q.packageSnapshot);

  const fields = Array.from(fieldSet);
  return {
    hasOutdatedText: fields.length > 0,
    outdatedFields: fields,
  };
}

export function hasOutdatedSampleText(q: Partial<Quotation>): boolean {
  return getOutdatedFieldsInfo(q).hasOutdatedText;
}

export function calculateLineQuantity(
  pricingBasis: PricingBasis,
  travelers: number,
  nights: number,
  cabinsCount: number,
  vehicleCount: number = 1,
  customQuantity: number = 1
): number {
  switch (pricingBasis) {
    case 'per_person_total':
      return Math.max(1, travelers);
    case 'per_person_night':
      return Math.max(1, travelers) * Math.max(1, nights);
    case 'per_cabin_night':
      return Math.max(1, cabinsCount) * Math.max(1, nights);
    case 'per_booking':
      return 1;
    case 'per_vehicle':
      return Math.max(1, vehicleCount);
    case 'custom':
    default:
      return Math.max(0, customQuantity);
  }
}

export function extractRootReference(reference: string): string {
  if (!reference) return 'REF-001';
  const match = reference.trim().match(/^(.*?)(?:-([A-Z]))?$/i);
  if (match && match[1]) {
    return match[1];
  }
  return reference;
}

export function extractRevisionLetter(reference: string): string {
  if (!reference) return '';
  const match = reference.trim().match(/^(?:.*?)-([A-Z])$/i);
  return match ? match[1].toUpperCase() : '';
}

export function generateNextRevisionReference(
  baseQuote: Partial<Quotation>,
  existingQuotes: Quotation[]
): { nextReference: string; nextLetter: string; rootReference: string } {
  const rawRef = baseQuote.reference || 'REF-001';
  const rootReference = baseQuote.rootReference || extractRootReference(rawRef);

  const family = existingQuotes.filter((q) => {
    const qRoot = q.rootReference || extractRootReference(q.reference);
    return qRoot.toUpperCase() === rootReference.toUpperCase();
  });

  const usedLetters = new Set<string>();
  family.forEach((q) => {
    const letter = q.revisionLetter || extractRevisionLetter(q.reference);
    if (letter) usedLetters.add(letter.toUpperCase());
  });

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let nextLetter = 'A';
  for (let i = 0; i < alphabet.length; i++) {
    const char = alphabet[i];
    if (!usedLetters.has(char)) {
      nextLetter = char;
      break;
    }
  }

  const nextReference = `${rootReference}-${nextLetter}`;
  return { nextReference, nextLetter, rootReference };
}

export function normalizeQuotation(q: any): Quotation {
  const rawRef = q.reference || 'REF-001';
  const rootReference = q.rootReference || extractRootReference(rawRef);
  const revisionLetter = q.revisionLetter !== undefined ? q.revisionLetter : extractRevisionLetter(rawRef);
  const parentQuotationId = q.parentQuotationId || undefined;
  const revisionNote = q.revisionNote || '';

  // 1. Nights calculation
  let nights = q.nights;
  if (!nights || isNaN(nights)) {
    if (q.arrivalDate && q.departureDate) {
      try {
        const arr = new Date(q.arrivalDate);
        const dep = new Date(q.departureDate);
        const diffDays = Math.ceil((dep.getTime() - arr.getTime()) / (1000 * 3600 * 24));
        nights = diffDays > 0 ? diffDays : 1;
      } catch {
        nights = 1;
      }
    } else {
      nights = 1;
    }
  }

  // 2. Transportation split
  let groundTransportation: TransportOption = q.groundTransportation;
  let boatTransfers: TransportOption = q.boatTransfers;
  let reviewFlag = Boolean(q.transportationReviewFlag);

  if (!groundTransportation || !boatTransfers) {
    if (q.transportationType === 'Shared') {
      groundTransportation = 'Shared';
      boatTransfers = 'Shared';
    } else if (q.transportationType === 'Private') {
      groundTransportation = 'Private';
      boatTransfers = 'Private';
    } else {
      groundTransportation = 'Review required';
      boatTransfers = 'Review required';
      reviewFlag = true;
    }
  }

  // 3. Line items
  const lineItems: LineItem[] = (q.lineItems || []).map((item: any, idx: number) => {
    const basis: PricingBasis = item.pricingBasis || 'custom';
    const qty = typeof item.quantity === 'number' ? item.quantity : 1;
    const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    const total = typeof item.total === 'number' ? item.total : qty * unitPrice;
    return {
      id: item.id || `item-${Date.now()}-${idx}`,
      description: item.description || 'Service Line Item',
      pricingBasis: basis,
      quantity: qty,
      unitPrice: unitPrice,
      total: total,
      vehicleCount: item.vehicleCount || 1,
    };
  });

  // 4. Terms status & supplier notes
  const termsStatus: TermsStatus = q.termsStatus === 'Approved by Petra' ? 'Approved by Petra' : 'Draft';
  const supplierPaymentNotes = q.supplierPaymentNotes || '';

  // Preserve existing saved wording faithfully (even empty strings "") without replacing it
  const paymentSchedule = typeof q.paymentSchedule === 'string' ? q.paymentSchedule : PENDING_CONFIRMATION;
  const depositRequirement = typeof q.depositRequirement === 'string' ? q.depositRequirement : PENDING_CONFIRMATION;
  const cancellationTerms = typeof q.cancellationTerms === 'string' ? q.cancellationTerms : PENDING_CONFIRMATION;
  const weatherLogisticsNote = typeof q.weatherLogisticsNote === 'string' ? q.weatherLogisticsNote : PENDING_CONFIRMATION;
  const seasonalConditions = typeof q.seasonalConditions === 'string' ? q.seasonalConditions : PENDING_CONFIRMATION;

  // 5. Package snapshot
  const defaultTemplate = PACKAGE_TEMPLATES[0];
  const packageSnapshot: StructuredPackageSnapshot = q.packageSnapshot || {
    overview: defaultTemplate.packageSnapshot.overview,
    accommodationDetails: `${q.cabinCategory || 'Island Cabaña'} (${q.bathroomType || 'Private'} Bathroom)`,
    mealsByDay: defaultTemplate.packageSnapshot.mealsByDay,
    groundTransportationDetails: defaultTemplate.packageSnapshot.groundTransportationDetails,
    boatTransferDetails: defaultTemplate.packageSnapshot.boatTransferDetails,
    toursAndActivities: defaultTemplate.packageSnapshot.toursAndActivities,
    otherInclusions: defaultTemplate.packageSnapshot.otherInclusions,
    optionalExtras: defaultTemplate.packageSnapshot.optionalExtras,
    exclusions: defaultTemplate.packageSnapshot.exclusions,
    islandSchedule: defaultTemplate.packageSnapshot.islandSchedule,
    importantInstructions: defaultTemplate.packageSnapshot.importantInstructions,
  };

  // 6. Selected Photos
  let selectedPhotos: AttachedPhoto[] = Array.isArray(q.selectedPhotos) ? q.selectedPhotos : [];
  if (selectedPhotos.length === 0 && Array.isArray(q.selectedPhotoIds)) {
    selectedPhotos = SAMPLE_DESTINATION_PHOTOS.filter((p) => q.selectedPhotoIds.includes(p.id));
  }
  if (selectedPhotos.length === 0) {
    selectedPhotos = [SAMPLE_DESTINATION_PHOTOS[0], SAMPLE_DESTINATION_PHOTOS[1]];
  }

  // Pricing calculations
  const pricingMode = q.pricingMode || (q.lineItems && q.lineItems.length > 0 ? 'custom_itemized' : 'first_night_additional');
  const firstNightRate = typeof q.firstNightRate === 'number' ? q.firstNightRate : 0;
  const additionalNightRate = typeof q.additionalNightRate === 'number' ? q.additionalNightRate : 0;
  const totalPackagePrice = typeof q.totalPackagePrice === 'number' ? q.totalPackagePrice : 0;
  const travelers = q.travelers || 2;

  let subtotal = 0;
  if (pricingMode === 'first_night_additional') {
    const firstNightTotal = travelers * firstNightRate;
    const additionalNightsCount = Math.max(nights - 1, 0);
    const additionalNightsTotal = travelers * additionalNightsCount * additionalNightRate;
    subtotal = Math.round((firstNightTotal + additionalNightsTotal) * 100) / 100;
  } else if (pricingMode === 'single_total') {
    subtotal = Math.round(totalPackagePrice * 100) / 100;
  } else {
    subtotal = Math.round(lineItems.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
  }

  const enableTax = q.enableTax !== undefined ? Boolean(q.enableTax) : (q.enableAdditionalCharge !== undefined ? Boolean(q.enableAdditionalCharge) : true);
  const taxPercent = typeof q.taxPercent === 'number' ? q.taxPercent : (typeof q.additionalChargePercent === 'number' ? q.additionalChargePercent : 7);
  const taxAmount = enableTax ? Math.round((subtotal * taxPercent / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;

  // Check for outdated legacy text without overwriting user data
  const outdatedInfo = getOutdatedFieldsInfo(q);

  return {
    ...q,
    reference: rawRef,
    rootReference,
    revisionLetter,
    parentQuotationId,
    revisionNote,
    nights,
    travelers,
    cabinsCount: q.cabinsCount || 1,
    bathroomType: q.bathroomType || 'Private',
    groundTransportation,
    boatTransfers,
    transportationReviewFlag: reviewFlag,
    pricingMode,
    firstNightRate,
    additionalNightRate,
    totalPackagePrice,
    enableTax,
    taxPercent,
    taxAmount,
    lineItems,
    subtotal,
    enableAdditionalCharge: enableTax,
    additionalChargeLabel: 'Territory & Service Tax',
    additionalChargePercent: taxPercent,
    additionalChargeAmount: taxAmount,
    total,
    inclusions: Array.isArray(q.inclusions) ? q.inclusions : defaultTemplate.inclusions,
    exclusions: Array.isArray(q.exclusions) ? q.exclusions : defaultTemplate.exclusions,
    packageSnapshot,
    paymentSchedule,
    depositRequirement,
    cancellationTerms,
    weatherLogisticsNote,
    seasonalConditions,
    supplierPaymentNotes,
    termsStatus,
    selectedPhotos,
    hasOutdatedSampleTextFlag: outdatedInfo.hasOutdatedText,
    outdatedFieldsList: outdatedInfo.outdatedFields,
    status: q.status === 'Ready for review' ? 'Ready for review' : 'Draft',
  };
}

const INITIAL_DEMO_QUOTATIONS_RAW = [
  {
    id: 'demo-quote-001',
    reference: 'DEMO-001',
    customerName: 'Oliver & Emma Vance',
    customerEmail: 'oliver.vance@example.com',
    customerPhone: '+1 (555) 234-8901',
    language: 'en',
    quotationDate: '2026-09-25',
    expiryDate: '2026-10-25',
    arrivalDate: '2026-11-12',
    departureDate: '2026-11-14',
    nights: 2,
    travelers: 2,
    island: 'Isla Chichime',
    cabinCategory: 'Beachfront Cabaña',
    cabinsCount: 1,
    bathroomType: 'Private',
    groundTransportation: 'Shared',
    boatTransfers: 'Shared',
    internalNotes: 'Celebratory anniversary trip. Request ground floor near quiet side of beach.',
    lineItems: [
      {
        id: 'item-1',
        description: 'Chichime Island Cabaña Accommodation & Meals',
        pricingBasis: 'per_person_total',
        quantity: 2,
        unitPrice: 280,
        total: 560,
      },
      {
        id: 'item-2',
        description: 'Round-trip 4x4 Panama City Ground Transfer',
        pricingBasis: 'per_person_total',
        quantity: 2,
        unitPrice: 75,
        total: 150,
      },
      {
        id: 'item-3',
        description: 'Round-trip Water Taxi Boat Transfer to Isla Chichime',
        pricingBasis: 'per_person_total',
        quantity: 2,
        unitPrice: 30,
        total: 60,
      },
      {
        id: 'item-4',
        description: 'Cayos Limón Boat Excursion Activity',
        pricingBasis: 'per_booking',
        quantity: 1,
        unitPrice: 100,
        total: 100,
      },
    ],
    enableAdditionalCharge: true,
    additionalChargeLabel: 'Additional Charge / Service Fee',
    additionalChargePercent: 7,
    subtotal: 870,
    additionalChargeAmount: 60.90,
    total: 930.90,
    inclusions: [
      'Accommodation in Beachfront Cabaña on Isla Chichime',
      'Meals according to stay duration (Day 1: Lunch/Dinner; Intermediate: Breakfast/Lunch/Dinner; Final Day: Breakfast)',
      'Round-trip 4x4 ground transport from Panama City',
      'Round-trip water taxi transfer from Port to Isla Chichime',
      'Excursion to Cayos Limón area (subject to sea conditions)',
    ],
    exclusions: [
      'Guna Yala territory entrance fee: USD 22 per person, payable in cash at the checkpoint',
      'Alcoholic beverages and personal snacks',
      'Personal travel insurance',
    ],
    packageSnapshot: PACKAGE_TEMPLATES[0].packageSnapshot,
    paymentSchedule: PENDING_CONFIRMATION,
    depositRequirement: PENDING_CONFIRMATION,
    cancellationTerms: PENDING_CONFIRMATION,
    weatherLogisticsNote: PENDING_CONFIRMATION,
    seasonalConditions: PENDING_CONFIRMATION,
    supplierPaymentNotes: 'Pay island host cash balance upon arrival ($300 USD).',
    termsStatus: 'Draft',
    selectedPhotos: [SAMPLE_DESTINATION_PHOTOS[0], SAMPLE_DESTINATION_PHOTOS[1], SAMPLE_DESTINATION_PHOTOS[3]],
    status: 'Draft',
    createdAt: '2026-09-25T10:00:00.000Z',
    updatedAt: '2026-09-28T14:30:00.000Z',
  },
  {
    id: 'demo-quote-002',
    reference: 'DEMO-002',
    customerName: 'Sophia Martinez',
    customerEmail: 'sophia.m@example.org',
    customerPhone: '+1 (555) 987-6543',
    language: 'en',
    quotationDate: '2026-09-27',
    expiryDate: '2026-10-27',
    arrivalDate: '2026-12-01',
    departureDate: '2026-12-02',
    nights: 1,
    travelers: 1,
    island: 'Isla Chichime Chico',
    cabinCategory: 'Rustic Island Cabin',
    cabinsCount: 1,
    bathroomType: 'Shared',
    groundTransportation: 'Shared',
    boatTransfers: 'Shared',
    internalNotes: 'Solo traveler interested in quiet photography and reef surroundings.',
    lineItems: [
      {
        id: 'item-1',
        description: 'Chichime Chico Island Accommodation & Meals',
        pricingBasis: 'per_person_total',
        quantity: 1,
        unitPrice: 180,
        total: 180,
      },
      {
        id: 'item-2',
        description: 'Round-trip 4x4 Panama City Ground Transfer',
        pricingBasis: 'per_person_total',
        quantity: 1,
        unitPrice: 75,
        total: 75,
      },
      {
        id: 'item-3',
        description: 'Round-trip Water Taxi Boat Transfer',
        pricingBasis: 'per_person_total',
        quantity: 1,
        unitPrice: 35,
        total: 35,
      },
    ],
    enableAdditionalCharge: false,
    additionalChargeLabel: 'Service Fee',
    additionalChargePercent: 7,
    subtotal: 290,
    additionalChargeAmount: 0,
    total: 290,
    inclusions: [
      'Rustic cabin accommodation on Chichime Chico',
      'Meals according to stay duration (Day 1: Lunch/Dinner; Final Day: Breakfast)',
      'Round-trip 4x4 transfer from Panama City to port',
      'Boat transfer to Chichime Chico cay',
    ],
    exclusions: [
      'Guna Yala territory entrance fee: USD 22 per person, payable in cash at the checkpoint',
      'Beverages and personal items',
    ],
    packageSnapshot: PACKAGE_TEMPLATES[1].packageSnapshot,
    paymentSchedule: PENDING_CONFIRMATION,
    depositRequirement: PENDING_CONFIRMATION,
    cancellationTerms: PENDING_CONFIRMATION,
    weatherLogisticsNote: PENDING_CONFIRMATION,
    seasonalConditions: PENDING_CONFIRMATION,
    supplierPaymentNotes: 'Pay island host $100 cash on site.',
    termsStatus: 'Draft',
    selectedPhotos: [SAMPLE_DESTINATION_PHOTOS[2], SAMPLE_DESTINATION_PHOTOS[3]],
    status: 'Draft',
    createdAt: '2026-09-27T09:15:00.000Z',
    updatedAt: '2026-09-27T09:15:00.000Z',
  },
];

class QuotationStorageService {
  private isBrowserAvailable(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private mapDbRowToQuotation(row: any): Quotation {
    let raw: any = row.data;
    if (!raw || typeof raw !== 'object') {
      raw = {
        id: row.id,
        reference: row.reference,
        status: row.status,
        customerName: row.customer_name,
        total: Number(row.total) || 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } else {
      raw = {
        ...raw,
        id: row.id || raw.id,
        reference: row.reference || raw.reference,
        status: row.status || raw.status,
        customerName: row.customer_name ?? raw.customerName,
        total: row.total !== undefined ? Number(row.total) : raw.total,
        createdAt: row.created_at || raw.createdAt,
        updatedAt: row.updated_at || raw.updatedAt,
      };
    }
    return normalizeQuotation(raw);
  }

  private mapQuotationToDbRow(quotation: Quotation) {
    return {
      id: quotation.id,
      reference: quotation.reference || 'REF-001',
      data: quotation,
      status: quotation.status || 'Draft',
      customer_name: quotation.customerName || '',
      total: typeof quotation.total === 'number' ? quotation.total : 0,
      updated_at: quotation.updatedAt || new Date().toISOString(),
    };
  }

  public async getQuotations(): Promise<Quotation[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quotations from Supabase:', error.message);
        throw new Error(`Database error: Unable to load quotations from Supabase (${error.message}).`);
      }

      if (!data || data.length === 0) {
        // Show an empty dashboard when zero records exist in Supabase.
        // NEVER auto-migrate or upload local or demo quotations!
        return [];
      }

      return data.map((row) => this.mapDbRowToQuotation(row));
    }

    // Standalone local mode fallback when Supabase is NOT configured
    let localQuotes: Quotation[] = [];
    if (this.isBrowserAvailable()) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localQuotes = parsed.map(normalizeQuotation);
          }
        }
      } catch (err) {
        console.warn('LocalStorage read error:', err);
      }
    }

    if (localQuotes.length === 0) {
      localQuotes = INITIAL_DEMO_QUOTATIONS_RAW.map(normalizeQuotation);
      if (this.isBrowserAvailable()) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localQuotes));
        } catch (err) {
          console.warn('LocalStorage write error:', err);
        }
      }
    }

    return localQuotes;
  }

  public async getQuotationById(id: string): Promise<Quotation | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching quotation ${id} from Supabase:`, error.message);
        throw new Error(`Database error: Unable to fetch quotation (${error.message}).`);
      }

      if (!data) return null;
      return this.mapDbRowToQuotation(data);
    }

    const list = await this.getQuotations();
    return list.find((q) => q.id === id) || null;
  }

  public async saveQuotation(quotation: Quotation): Promise<Quotation> {
    if (quotation.status === 'Ready for review' && quotation.termsStatus === 'Draft') {
      throw new Error(
        'Cannot mark quotation as "Ready for review" while terms status is still "Draft". Please approve terms or save as Draft.'
      );
    }

    const now = new Date().toISOString();
    const normalizedToSave = normalizeQuotation({
      ...quotation,
      updatedAt: now,
    });

    if (isSupabaseConfigured && supabase) {
      const dbRow = this.mapQuotationToDbRow(normalizedToSave);
      const { error } = await supabase.from('quotations').upsert(dbRow, { onConflict: 'id' });
      if (error) {
        console.error('Failed to save quotation to Supabase:', error.message);
        throw new Error(`Database error: Unable to save quotation to Supabase (${error.message}).`);
      }
      return normalizedToSave;
    }

    // Local storage persistence only when Supabase is not configured
    let currentList: Quotation[] = [];
    if (this.isBrowserAvailable()) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) currentList = JSON.parse(stored);
      } catch (e) {
        console.warn('Error reading local storage during save:', e);
      }
    }
    const existingIndex = currentList.findIndex((q) => q.id === normalizedToSave.id);
    let updatedList: Quotation[];
    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = normalizedToSave;
    } else {
      updatedList = [normalizedToSave, ...currentList];
    }
    if (this.isBrowserAvailable()) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    return normalizedToSave;
  }

  public async duplicateQuotation(id: string): Promise<Quotation> {
    const list = await this.getQuotations();
    const original = list.find((q) => q.id === id);
    if (!original) {
      throw new Error(`Quotation with id ${id} not found.`);
    }

    const nextIndex = list.length + 1;
    const refNumber = String(nextIndex).padStart(3, '0');
    const newRef = `REF-${refNumber}`;
    const now = new Date().toISOString().split('T')[0];

    const copy: Quotation = normalizeQuotation({
      ...JSON.parse(JSON.stringify(original)),
      id: `quote-${Date.now()}`,
      reference: newRef,
      customerName: original.customerName ? `${original.customerName} (Copy)` : 'Copy',
      status: 'Draft',
      termsStatus: 'Draft',
      quotationDate: now,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return await this.saveQuotation(copy);
  }

  public async createRevision(id: string, revisionNote?: string): Promise<Quotation> {
    let original = await this.getQuotationById(id);
    if (!original) {
      const list = await this.getQuotations();
      original = list.find((q) => q.id === id || q.reference === id) || null;
    }
    if (!original) {
      throw new Error(`Quotation record "${id}" not found.`);
    }

    const latestList = await this.getQuotations();
    const { nextReference, nextLetter, rootReference } = generateNextRevisionReference(original, latestList);
    const now = new Date().toISOString();
    const todayStr = now.split('T')[0];

    const uniqueId = `quote-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const revision: Quotation = normalizeQuotation({
      ...JSON.parse(JSON.stringify(original)),
      id: uniqueId,
      reference: nextReference,
      rootReference,
      revisionLetter: nextLetter,
      parentQuotationId: original.id,
      revisionNote: revisionNote !== undefined ? revisionNote : original.revisionNote || '',
      status: 'Draft',
      termsStatus: 'Draft',
      quotationDate: todayStr,
      createdAt: now,
      updatedAt: now,
    });

    try {
      return await this.saveQuotation(revision);
    } catch (err: any) {
      console.error('Failed to save revision to database:', err);
      throw new Error(`Unable to save revision ${nextReference}: ${err?.message || 'Database error'}`);
    }
  }

  public async deleteQuotation(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) {
        console.error('Failed to delete quotation from Supabase:', error.message);
        throw new Error(`Database error: Unable to delete quotation from Supabase (${error.message}).`);
      }
      return true;
    }

    if (this.isBrowserAvailable()) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const filtered = parsed.filter((q: any) => q.id !== id);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
        }
      } catch (err) {
        console.warn('Error deleting from local storage:', err);
      }
    }

    return true;
  }

  public async resetToDemoData(): Promise<Quotation[]> {
    if (isSupabaseConfigured && supabase) {
      throw new Error('Resetting demo data is disabled when connected to Supabase database.');
    }

    const initialNormalized = INITIAL_DEMO_QUOTATIONS_RAW.map(normalizeQuotation);
    if (this.isBrowserAvailable()) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialNormalized));
    }

    return initialNormalized;
  }

  public generateNewReference(existingCount: number): string {
    const num = existingCount + 1;
    return `REF-${String(num).padStart(3, '0')}`;
  }

  public createBlankQuotation(referenceNumber: string): Quotation {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    const expiry = new Date();
    expiry.setDate(today.getDate() + 30);
    const expiryStr = expiry.toISOString().split('T')[0];

    const arrival = new Date();
    arrival.setMonth(today.getMonth() + 1);
    const arrivalStr = arrival.toISOString().split('T')[0];

    const departure = new Date(arrival);
    departure.setDate(arrival.getDate() + 2);
    const departureStr = departure.toISOString().split('T')[0];

    const template = PACKAGE_TEMPLATES.find((t) => t.id === 'template-master-island-overnight') || PACKAGE_TEMPLATES[3];

    const defaultPhotos = SAMPLE_DESTINATION_PHOTOS.filter((p) =>
      template.defaultPhotoIds.includes(p.id)
    );

    return normalizeQuotation({
      id: `quote-${Date.now()}`,
      reference: referenceNumber,
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      language: 'en',
      quotationDate: dateStr,
      expiryDate: expiryStr,
      arrivalDate: arrivalStr,
      departureDate: departureStr,
      nights: 2,
      travelers: 2,
      island: template.island,
      experience: 'Island Overnight Experience',
      cabinCategory: template.cabinCategory,
      cabinsCount: 1,
      bathroomType: template.bathroomType,
      groundTransportation: template.groundTransportation,
      boatTransfers: template.boatTransfers,
      internalNotes: '',
      pricingMode: 'first_night_additional',
      firstNightRate: 0,
      additionalNightRate: 0,
      totalPackagePrice: 0,
      lineItems: [],
      enableTax: true,
      taxPercent: 7,
      enableAdditionalCharge: false,
      additionalChargeLabel: 'Territory & Service Tax',
      additionalChargePercent: 7,
      subtotal: 0,
      additionalChargeAmount: 0,
      total: 0,
      inclusions: [...template.inclusions],
      exclusions: [...template.exclusions],
      packageSnapshot: { ...template.packageSnapshot },
      paymentSchedule: PENDING_CONFIRMATION,
      depositRequirement: PENDING_CONFIRMATION,
      cancellationTerms: PENDING_CONFIRMATION,
      weatherLogisticsNote: PENDING_CONFIRMATION,
      seasonalConditions: PENDING_CONFIRMATION,
      supplierPaymentNotes: '',
      termsStatus: 'Draft',
      selectedPhotos: defaultPhotos,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const quotationStorageService = new QuotationStorageService();
