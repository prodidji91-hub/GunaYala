export type QuotationStatus = 'Draft' | 'Ready for review';
export type TermsStatus = 'Draft' | 'Approved by Petra';

export type TransportOption = 'Shared' | 'Private' | 'Not included' | 'Review required';

export type PricingBasis =
  | 'per_person_total' // Per person for the entire stay
  | 'per_person_night' // Per person per night
  | 'per_cabin_night'  // Per cabin per night
  | 'per_booking'      // Per booking
  | 'per_vehicle'      // Per vehicle
  | 'custom';          // Custom quantity

export interface LineItem {
  id: string;
  description: string;
  pricingBasis: PricingBasis;
  quantity: number;
  unitPrice: number;
  total: number;
  vehicleCount?: number;
}

export type PhotoVerificationStatus = 'Unverified demo' | 'Confirmed by Petra';

export interface AttachedPhoto {
  id: string;
  title: string;
  caption: string;
  island?: string;
  cabinCategory?: string;
  verificationStatus: PhotoVerificationStatus;
  url: string;
  isTemporaryUpload?: boolean;
  isUploadedPhoto?: boolean;
}

export interface StructuredPackageSnapshot {
  overview: string;
  accommodationDetails: string;
  mealsByDay: string;
  groundTransportationDetails: string;
  boatTransferDetails: string;
  toursAndActivities: string;
  otherInclusions: string;
  optionalExtras: string;
  exclusions: string;
  islandSchedule: string;
  importantInstructions: string;
}

export type PricingMode = 'first_night_additional' | 'single_total' | 'custom_itemized';

export interface Quotation {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  language: 'en';
  quotationDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  nights: number;
  travelers: number;
  island: string;
  experience?: string;
  cabinCategory: string;
  cabinsCount: number;
  bathroomType: 'Shared' | 'Private';

  // Transportation
  groundTransportation: TransportOption;
  boatTransfers: TransportOption;
  transportationReviewFlag?: boolean;

  internalNotes: string;
  
  // Pricing & Pricing Mode
  pricingMode: PricingMode;
  firstNightRate: number;
  additionalNightRate: number;
  totalPackagePrice: number;
  enableTax: boolean;
  taxPercent: number;
  taxAmount: number;

  lineItems: LineItem[];
  enableAdditionalCharge: boolean;
  additionalChargeLabel: string;
  additionalChargePercent: number;
  subtotal: number;
  additionalChargeAmount: number;
  total: number;
  
  // Inclusions & Exclusions
  inclusions: string[];
  exclusions: string[];

  // Structured Package Details
  packageSnapshot: StructuredPackageSnapshot;

  // Conditions & Terms
  paymentSchedule: string;
  depositRequirement: string;
  cancellationTerms: string;
  weatherLogisticsNote: string;
  seasonalConditions: string;
  supplierPaymentNotes: string; // Internal notes - excluded from customer preview/print
  termsStatus: TermsStatus;
  
  // Attached photos
  selectedPhotos: AttachedPhoto[];
  selectedPhotoIds?: string[]; // Legacy fallback
  
  // Flag for legacy sample text requiring administrator review
  hasOutdatedSampleTextFlag?: boolean;
  outdatedFieldsList?: string[];

  // Status & Timestamps
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  description: string;
  island: string;
  cabinCategory: string;
  bathroomType: 'Shared' | 'Private';
  groundTransportation: TransportOption;
  boatTransfers: TransportOption;
  pricingMode?: PricingMode;
  firstNightRate?: number;
  additionalNightRate?: number;
  totalPackagePrice?: number;
  enableTax?: boolean;
  taxPercent?: number;
  lineItems: Array<{
    description: string;
    pricingBasis: PricingBasis;
    unitPrice: number;
    vehicleCount?: number;
  }>;
  packageSnapshot: StructuredPackageSnapshot;
  inclusions: string[];
  exclusions: string[];
  defaultPhotoIds: string[];
}

export interface QuotationFilter {
  searchQuery: string;
  status: 'All' | QuotationStatus;
}
