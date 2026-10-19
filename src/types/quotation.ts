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

export type QuotationLanguage = 'en' | 'es';

export interface LineItem {
  id: string;
  description: string;
  descriptionEs?: string;
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
export type QuotationPricingStatus = 'Rates to Be Confirmed' | 'Priced Quotation';

export interface Quotation {
  id: string;
  reference: string;
  packageTemplateId?: string;
  inquiry_id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  language?: QuotationLanguage;
  quotationDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  arrivalDate: string; // YYYY-MM-DD
  departureDate: string; // YYYY-MM-DD
  nights: number;
  travelers: number;
  island: string;
  islandEs?: string;
  packageTitle?: string;
  packageTitleEs?: string;
  experience?: string;
  experienceEs?: string;
  cabinCategory: string;
  cabinCategoryEs?: string;
  cabinsCount: number;
  bathroomType: 'Shared' | 'Private';
  bathroomTypeEs?: string;

  // Transportation
  groundTransportation: TransportOption;
  boatTransfers: TransportOption;
  transportationReviewFlag?: boolean;

  internalNotes: string;
  
  // Pricing & Pricing Mode
  pricingMode: PricingMode;
  pricingStatus?: QuotationPricingStatus;
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
  
  // Inclusions & Exclusions (English & Spanish)
  inclusions: string[];
  inclusionsEs?: string[];
  exclusions: string[];
  exclusionsEs?: string[];

  // Structured Package Details (English & Spanish)
  packageSnapshot: StructuredPackageSnapshot;
  packageSnapshotEs?: StructuredPackageSnapshot;

  // Conditions & Terms (English & Spanish)
  paymentSchedule: string;
  paymentScheduleEs?: string;
  depositRequirement: string;
  depositRequirementEs?: string;
  cancellationTerms: string;
  cancellationTermsEs?: string;
  weatherLogisticsNote: string;
  weatherLogisticsNoteEs?: string;
  seasonalConditions: string;
  seasonalConditionsEs?: string;
  supplierPaymentNotes: string; // Internal notes - excluded from customer preview/print
  termsStatus: TermsStatus;
  
  // Attached photos
  selectedPhotos: AttachedPhoto[];
  selectedPhotoIds?: string[]; // Legacy fallback
  
  // Flag for legacy sample text requiring administrator review
  hasOutdatedSampleTextFlag?: boolean;
  outdatedFieldsList?: string[];

  // Revision Tracking
  rootReference?: string; // e.g. "695" or "REF-001"
  revisionLetter?: string; // e.g. "A", "B", "C"
  parentQuotationId?: string; // ID of original quote or previous revision
  revisionNote?: string; // Admin note describing revision changes

  // Status & Timestamps
  status: QuotationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PackageTemplate {
  id: string;
  name: string;
  nameEs?: string;
  description: string;
  descriptionEs?: string;
  island: string;
  islandEs?: string;
  experience?: string;
  experienceEs?: string;
  cabinCategory: string;
  cabinCategoryEs?: string;
  bathroomType: 'Shared' | 'Private';
  bathroomTypeEs?: string;
  groundTransportation: TransportOption;
  boatTransfers: TransportOption;
  pricingMode?: PricingMode;
  pricingStatus?: QuotationPricingStatus;
  firstNightRate?: number;
  additionalNightRate?: number;
  totalPackagePrice?: number;
  enableTax?: boolean;
  taxPercent?: number;
  lineItems: Array<{
    description: string;
    descriptionEs?: string;
    pricingBasis: PricingBasis;
    unitPrice: number;
    vehicleCount?: number;
  }>;
  packageSnapshot: StructuredPackageSnapshot;
  packageSnapshotEs?: StructuredPackageSnapshot;
  inclusions: string[];
  inclusionsEs?: string[];
  exclusions: string[];
  exclusionsEs?: string[];
  defaultPhotoIds: string[];
  paymentSchedule?: string;
  paymentScheduleEs?: string;
  depositRequirement?: string;
  depositRequirementEs?: string;
  cancellationTerms?: string;
  cancellationTermsEs?: string;
  weatherLogisticsNote?: string;
  weatherLogisticsNoteEs?: string;
  seasonalConditions?: string;
  seasonalConditionsEs?: string;
}

export interface QuotationFilter {
  searchQuery: string;
  status: 'All' | QuotationStatus;
}
