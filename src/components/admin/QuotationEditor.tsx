import React, { useState, useEffect, useMemo } from 'react';
import {
  Quotation,
  QuotationPricingStatus,
  LineItem,
  PricingBasis,
  TransportOption,
  AttachedPhoto,
  StructuredPackageSnapshot,
} from '../../types/quotation';
import { PACKAGE_TEMPLATES } from '../../data/packageTemplates';
import { SAMPLE_DESTINATION_PHOTOS, DEMO_PHOTO_UNVERIFIED_LABEL } from '../../data/samplePhotos';
import {
  calculateLineQuantity,
  calculateQuotationTotals,
  getOutdatedFieldsInfo,
  quotationStorageService,
} from '../../services/quotationStorageService';
import {
  Save,
  Eye,
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  DollarSign,
  FileText,
  Lock,
  Image as ImageIcon,
  Check,
  Sparkles,
  AlertCircle,
  Percent,
  Upload,
  ArrowUp,
  ArrowDown,
  Layers,
  HelpCircle,
  RotateCcw,
  Loader2,
  GitBranch,
} from 'lucide-react';
import { extractRootReference, generateNextRevisionReference } from '../../services/quotationStorageService';

const INTERNATIONAL_COUNTRY_CODES = [
  { code: '+507', label: 'Panama (+507)' },
  { code: '+1', label: 'United States / Canada (+1)' },
  { code: '+506', label: 'Costa Rica (+506)' },
  { code: '+57', label: 'Colombia (+57)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+54', label: 'Argentina (+54)' },
  { code: '+56', label: 'Chile (+56)' },
  { code: '+51', label: 'Peru (+51)' },
  { code: '+58', label: 'Venezuela (+58)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+41', label: 'Switzerland (+41)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+46', label: 'Sweden (+46)' },
  { code: '+47', label: 'Norway (+47)' },
  { code: '+45', label: 'Denmark (+45)' },
  { code: '+351', label: 'Portugal (+351)' },
  { code: '+353', label: 'Ireland (+353)' },
  { code: '+32', label: 'Belgium (+32)' },
  { code: '+43', label: 'Austria (+43)' },
  { code: '+64', label: 'New Zealand (+64)' },
  { code: '+972', label: 'Israel (+972)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+852', label: 'Hong Kong (+852)' },
];

const parseCustomerPhone = (fullPhone: string) => {
  if (!fullPhone) return { code: '+507', number: '' };
  const trimmed = fullPhone.trim();
  const sortedCodes = [...INTERNATIONAL_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const found = sortedCodes.find((c) => trimmed.startsWith(c.code));
  if (found) {
    const remaining = trimmed.slice(found.code.length).trim();
    return { code: found.code, number: remaining };
  }
  if (trimmed.startsWith('+')) {
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx > 0) {
      return { code: trimmed.slice(0, spaceIdx), number: trimmed.slice(spaceIdx + 1).trim() };
    }
  }
  return { code: '+507', number: trimmed };
};

interface QuotationEditorProps {
  initialQuotation: Quotation;
  allQuotations?: Quotation[];
  onSave: (updatedQuotation: Quotation) => Promise<Quotation | void> | void;
  onPreview: (quotation: Quotation) => void;
  onCreateRevision?: (quotation: Quotation, revisionNote?: string) => void;
  onSelectQuotation?: (quotation: Quotation) => void;
  onCancel: () => void;
}

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  step?: string | number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  step = '1',
  className = '',
  placeholder = '0',
  disabled = false,
}) => {
  const [textVal, setTextVal] = useState<string>(value === 0 ? '0' : String(value));
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    if (!isFocused) {
      setTextVal(value === 0 && textVal === '' ? '' : String(value));
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (disabled) return;
    setIsFocused(true);
    e.target.select();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    setTextVal(raw);
    if (raw === '' || raw === '.') {
      onChange(0);
    } else {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed)) {
        onChange(Math.max(min, parsed));
      }
    }
  };

  const handleBlur = () => {
    if (disabled) return;
    setIsFocused(false);
    if (textVal === '' || isNaN(parseFloat(textVal))) {
      setTextVal('0');
      onChange(0);
    } else {
      const parsed = parseFloat(textVal);
      const clamped = Math.max(min, parsed);
      setTextVal(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={isFocused ? textVal : (value === 0 && textVal === '' ? '' : String(value))}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
    />
  );
};

const DRAFT_STORAGE_KEY = 'guna_yala_active_quotation_draft';

export const QuotationEditor: React.FC<QuotationEditorProps> = ({
  initialQuotation,
  allQuotations,
  onSave,
  onPreview,
  onCreateRevision,
  onSelectQuotation,
  onCancel,
}) => {
  // Initialize formData from draft if present and matching initialQuotation, else initialQuotation
  const [formData, setFormData] = useState<Quotation>(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          if (
            parsed &&
            (parsed.id === initialQuotation.id ||
             parsed.reference === initialQuotation.reference ||
             (!initialQuotation.id && parsed.reference === initialQuotation.reference))
          ) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return initialQuotation;
  });

  // Synchronize formData when initialQuotation changes (e.g. switching between different quotations)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          if (
            parsed &&
            (parsed.id === initialQuotation.id ||
             parsed.reference === initialQuotation.reference ||
             (!initialQuotation.id && parsed.reference === initialQuotation.reference))
          ) {
            setFormData(parsed);
            return;
          }
        }
      }
    } catch (e) {}
    setFormData(initialQuotation);
  }, [initialQuotation.id, initialQuotation.reference]);

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const quoteKey = formData.id || formData.reference || 'default';
  const [activeTab, setActiveTab] = useState<'trip' | 'package' | 'pricing' | 'conditions' | 'photos'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`guna_yala_editor_active_tab_${initialQuotation.id || initialQuotation.reference || 'default'}`);
        if (saved && ['trip', 'package', 'pricing', 'conditions', 'photos'].includes(saved)) {
          return saved as any;
        }
      }
    } catch (e) {}
    return 'trip';
  });

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && activeTab) {
        localStorage.setItem(`guna_yala_editor_active_tab_${quoteKey}`, activeTab);
      }
    } catch (e) {}
  }, [activeTab, quoteKey]);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const newKey = initialQuotation.id || initialQuotation.reference || 'default';
        const saved = localStorage.getItem(`guna_yala_editor_active_tab_${newKey}`);
        if (saved && ['trip', 'package', 'pricing', 'conditions', 'photos'].includes(saved)) {
          setActiveTab(saved as any);
        } else {
          setActiveTab('trip');
        }
      }
    } catch (e) {}
  }, [initialQuotation.id, initialQuotation.reference]);

  const scrollStorageKey = `guna_yala_editor_scroll_${quoteKey}_${activeTab}`;

  // Track and save scroll position with requestAnimationFrame throttle
  useEffect(() => {
    const handleScroll = () => {
      try {
        if (typeof window !== 'undefined') {
          const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
          if (currentScroll >= 0) {
            localStorage.setItem(scrollStorageKey, String(currentScroll));
          }
        }
      } catch (e) {}
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollStorageKey]);

  // Restore scroll position on mount, tab change, or browser visibility return
  useEffect(() => {
    const restoreScroll = () => {
      try {
        if (typeof window !== 'undefined') {
          const savedScroll = localStorage.getItem(scrollStorageKey);
          if (savedScroll) {
            const scrollY = parseFloat(savedScroll);
            if (!isNaN(scrollY) && scrollY > 0) {
              setTimeout(() => {
                window.scrollTo({ top: scrollY, behavior: 'auto' });
              }, 60);
            } else {
              window.scrollTo({ top: 0, behavior: 'auto' });
            }
          } else {
            window.scrollTo({ top: 0, behavior: 'auto' });
          }
        }
      } catch (e) {}
    };

    restoreScroll();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        restoreScroll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scrollStorageKey]);

  const [photoIslandFilter, setPhotoIslandFilter] = useState<string>('All');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  const isEs = formData.language === 'es';
  const tr = (en: string, es: string) => (isEs ? es : en);

  const initialParsedPhone = parseCustomerPhone(formData.customerPhone || initialQuotation.customerPhone);
  const [countryCode, setCountryCode] = useState<string>(initialParsedPhone.code);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialParsedPhone.number);
  const [countrySearch, setCountrySearch] = useState<string>('');

  // Auto-save form state to local draft in real-time
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && formData) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
        sessionStorage.setItem('guna_yala_admin_active_view', 'editor');
        if (formData.id || formData.reference) {
          sessionStorage.setItem('guna_yala_admin_selected_id', formData.id || formData.reference);
        }
      }
    } catch (e) {
      console.warn('Error auto-saving quotation draft:', e);
    }
  }, [formData]);

  // Flush form state on tab switch (visibilitychange) or window unload
  useEffect(() => {
    const handleFlushDraft = () => {
      try {
        if (typeof window !== 'undefined' && formData) {
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
          sessionStorage.setItem('guna_yala_admin_active_view', 'editor');
          if (formData.id || formData.reference) {
            sessionStorage.setItem('guna_yala_admin_selected_id', formData.id || formData.reference);
          }
        }
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', handleFlushDraft);
    window.addEventListener('beforeunload', handleFlushDraft);

    return () => {
      document.removeEventListener('visibilitychange', handleFlushDraft);
      window.removeEventListener('beforeunload', handleFlushDraft);
    };
  }, [formData]);

  const handlePhoneChange = (newCode: string, newNumber: string) => {
    setCountryCode(newCode);
    setPhoneNumber(newNumber);
    const combined = `${newCode} ${newNumber}`.trim();
    setFormData((prev) => ({ ...prev, customerPhone: combined }));
  };

  // Recalculate nights automatically when dates change
  useEffect(() => {
    if (formData.arrivalDate && formData.departureDate) {
      try {
        const arr = new Date(formData.arrivalDate);
        const dep = new Date(formData.departureDate);
        const diffTime = dep.getTime() - arr.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays) && diffDays > 0) {
          setFormData((prev) => ({ ...prev, nights: diffDays }));
        }
      } catch (e) {
        // preserve current nights
      }
    }
  }, [formData.arrivalDate, formData.departureDate]);

  // Recalculate line item quantities when trip parameters change
  useEffect(() => {
    setFormData((prev) => {
      let updated = false;
      const newLineItems = prev.lineItems.map((item) => {
        if (item.pricingBasis === 'custom') return item;
        const newQty = calculateLineQuantity(
          item.pricingBasis,
          prev.travelers,
          prev.nights,
          prev.cabinsCount,
          item.vehicleCount || 1,
          item.quantity
        );
        if (newQty !== item.quantity) {
          updated = true;
          return {
            ...item,
            quantity: newQty,
            total: newQty * item.unitPrice,
          };
        }
        return item;
      });

      if (!updated) return prev;
      return {
        ...prev,
        lineItems: newLineItems,
      };
    });
  }, [formData.travelers, formData.nights, formData.cabinsCount]);

  // Recalculate pricing totals based on pricingMode and optional extras
  useEffect(() => {
    const summary = calculateQuotationTotals({
      pricingMode: formData.pricingMode,
      pricingStatus: formData.pricingStatus || 'Priced Quotation',
      travelers: formData.travelers,
      nights: formData.nights,
      firstNightRate: formData.firstNightRate,
      additionalNightRate: formData.additionalNightRate,
      totalPackagePrice: formData.totalPackagePrice,
      lineItems: formData.lineItems,
      enableTax: formData.enableTax,
      taxPercent: formData.taxPercent,
    });

    setFormData((prev) => {
      if (
        prev.subtotal === summary.subtotal &&
        prev.taxAmount === summary.taxAmount &&
        prev.total === summary.total
      ) {
        return prev;
      }
      return {
        ...prev,
        subtotal: summary.subtotal,
        taxAmount: summary.taxAmount,
        enableAdditionalCharge: formData.enableTax,
        additionalChargeLabel: 'Territory & Service Tax',
        additionalChargePercent: formData.taxPercent,
        additionalChargeAmount: summary.taxAmount,
        total: summary.total,
      };
    });
  }, [
    formData.pricingMode,
    formData.pricingStatus,
    formData.firstNightRate,
    formData.additionalNightRate,
    formData.totalPackagePrice,
    formData.travelers,
    formData.nights,
    formData.lineItems,
    formData.enableTax,
    formData.taxPercent,
  ]);

  // Handle template selection
  const handleApplyPackageTemplate = async (templateId: string) => {
    const template = PACKAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    if (formData.lineItems && formData.lineItems.length > 0) {
      if (!window.confirm('The current quotation contains active line items or optional extras. Do you want to replace them with the new template defaults (clearing optional extras)?')) {
        return;
      }
    }

    // Do NOT automatically add chargeable optional extras to lineItems.
    // Administrators must explicitly choose extras, quantities, and unit prices.
    const newLineItems: LineItem[] = [];

    // Filter default photos
    const defaultPhotos = SAMPLE_DESTINATION_PHOTOS.filter((p) =>
      template.defaultPhotoIds.includes(p.id)
    );

    const isUnpriced =
      (template.firstNightRate === 0 && template.additionalNightRate === 0 && template.totalPackagePrice === 0) ||
      template.island === 'Chichime Chico' ||
      template.island === 'Nurdub Community';
    const templatePricingStatus: QuotationPricingStatus =
      template.pricingStatus || (isUnpriced ? 'Rates to Be Confirmed' : 'Priced Quotation');

    let overrideOverviewEn = '';
    let overrideOverviewEs = '';
    try {
      const liveOverride = await quotationStorageService.getSinglePackageDescriptionOverride(template.id);
      if (liveOverride) {
        overrideOverviewEn = liveOverride.overviewEn;
        overrideOverviewEs = liveOverride.overviewEs;
      }
    } catch (err: any) {
      console.warn('Failed to fetch fresh description override:', err);
    }

    const finalSnapshot = { ...template.packageSnapshot };
    if (overrideOverviewEn) {
      finalSnapshot.overview = overrideOverviewEn;
    }
    const finalSnapshotEs = template.packageSnapshotEs ? { ...template.packageSnapshotEs } : { ...template.packageSnapshot };
    if (overrideOverviewEs) {
      finalSnapshotEs.overview = overrideOverviewEs;
    }

    const updatedQuote: Quotation = {
      ...formData,
      packageTemplateId: template.id,
      island: template.island,
      islandEs: template.islandEs || template.island,
      experience: template.experience || template.name,
      experienceEs: template.experienceEs || template.nameEs || template.name,
      packageTitle: template.experience || template.name,
      packageTitleEs: template.experienceEs || template.nameEs || template.name,
      cabinCategory: template.cabinCategory,
      cabinCategoryEs: template.cabinCategoryEs || template.cabinCategory,
      bathroomType: template.bathroomType,
      bathroomTypeEs: template.bathroomTypeEs || (template.bathroomType === 'Private' ? 'Privado' : 'Compartido'),
      groundTransportation: template.groundTransportation,
      boatTransfers: template.boatTransfers,
      pricingMode: template.pricingMode || 'first_night_additional',
      pricingStatus: templatePricingStatus,
      firstNightRate: template.firstNightRate ?? formData.firstNightRate ?? 0,
      additionalNightRate: template.additionalNightRate ?? formData.additionalNightRate ?? 0,
      totalPackagePrice: template.totalPackagePrice ?? formData.totalPackagePrice ?? 0,
      enableTax: template.enableTax ?? formData.enableTax ?? false,
      taxPercent: template.taxPercent ?? formData.taxPercent ?? 7,
      transportationReviewFlag: false,
      lineItems: newLineItems,
      inclusions: [...template.inclusions],
      inclusionsEs: template.inclusionsEs ? [...template.inclusionsEs] : [...template.inclusions],
      exclusions: [...template.exclusions],
      exclusionsEs: template.exclusionsEs ? [...template.exclusionsEs] : [...template.exclusions],
      packageSnapshot: finalSnapshot,
      packageSnapshotEs: finalSnapshotEs,
      paymentSchedule: template.paymentSchedule || formData.paymentSchedule,
      paymentScheduleEs: template.paymentScheduleEs || formData.paymentScheduleEs || 'Pendiente de confirmación por Petra.',
      depositRequirement: template.depositRequirement || formData.depositRequirement,
      depositRequirementEs: template.depositRequirementEs || formData.depositRequirementEs || 'Pendiente de confirmación por Petra.',
      cancellationTerms: template.cancellationTerms || formData.cancellationTerms,
      cancellationTermsEs: template.cancellationTermsEs || formData.cancellationTermsEs || 'Pendiente de confirmación por Petra.',
      weatherLogisticsNote: template.weatherLogisticsNote || formData.weatherLogisticsNote,
      weatherLogisticsNoteEs: template.weatherLogisticsNoteEs || formData.weatherLogisticsNoteEs || 'Pendiente de confirmación por Petra.',
      seasonalConditions: template.seasonalConditions || formData.seasonalConditions,
      seasonalConditionsEs: template.seasonalConditionsEs || formData.seasonalConditionsEs || 'Pendiente de confirmación por Petra.',
      selectedPhotos: defaultPhotos.length > 0 ? defaultPhotos : formData.selectedPhotos,
    };

    setFormData(updatedQuote);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updatedQuote));
      }
    } catch (e) {}

    const templateName = isEs && template.nameEs ? template.nameEs : template.name;
    setTemplateMsg(tr(`${templateName} applied successfully.`, `${templateName} aplicado con éxito.`));
    setTimeout(() => setTemplateMsg(null), 4000);
  };

  // Determine Spanish translation status & completeness
  const spanishStatus = useMemo(() => {
    const missing: string[] = [];

    const hasTitle = Boolean(formData.experienceEs?.trim() || formData.packageTitleEs?.trim());
    if (!hasTitle) missing.push('Package Title (Spanish)');

    const snap = formData.packageSnapshotEs;
    if (!snap || !snap.overview?.trim()) {
      missing.push('Overview (Spanish)');
    }
    if (!snap || !snap.mealsByDay?.trim()) {
      missing.push('Meals by Day (Spanish)');
    }
    if (!snap || !snap.toursAndActivities?.trim()) {
      missing.push('Tours & Activities (Spanish)');
    }

    if (!formData.inclusionsEs || formData.inclusionsEs.length === 0) {
      missing.push('Inclusions (Spanish)');
    }

    if (!formData.exclusionsEs || formData.exclusionsEs.length === 0) {
      missing.push('Exclusions (Spanish)');
    }

    if (formData.lineItems && formData.lineItems.length > 0) {
      const hasMissingLineDesc = formData.lineItems.some(
        (it) => !it.descriptionEs || it.descriptionEs.trim() === ''
      );
      if (hasMissingLineDesc) {
        missing.push('Line Item Descriptions (Spanish)');
      }
    }

    const isComplete = missing.length === 0;
    return {
      isComplete,
      missing,
      badgeText: isComplete ? '✓ Spanish Ready' : `⚠️ Spanish Pending (${missing.length})`,
      badgeColor: isComplete
        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
        : 'bg-amber-50 text-amber-900 border-amber-300',
    };
  }, [
    formData.experienceEs,
    formData.packageTitleEs,
    formData.packageSnapshotEs,
    formData.inclusionsEs,
    formData.exclusionsEs,
    formData.lineItems,
  ]);

  // Safe accessor for structured snapshot depending on current view language
  const getSnapshotValue = (field: keyof StructuredPackageSnapshot): string => {
    if (formData.language === 'es') {
      return formData.packageSnapshotEs?.[field] ?? '';
    }
    return formData.packageSnapshot?.[field] ?? '';
  };

  const handleLanguageChange = (newLang: 'en' | 'es') => {
    setFormData((prev) => {
      if (newLang === 'en') {
        return {
          ...prev,
          language: 'en',
        };
      }

      // Switching to 'es': find matching package template if possible
      const matchingTemplate = PACKAGE_TEMPLATES.find(
        (t) =>
          t.island.toLowerCase() === (prev.island || '').toLowerCase() ||
          t.name.toLowerCase().includes((prev.island || '').toLowerCase())
      );

      const resolvedSnapshotEs: StructuredPackageSnapshot =
        prev.packageSnapshotEs && prev.packageSnapshotEs.overview
          ? prev.packageSnapshotEs
          : matchingTemplate?.packageSnapshotEs
          ? { ...matchingTemplate.packageSnapshotEs }
          : {
              overview: prev.packageSnapshot.overview || '',
              accommodationDetails: prev.packageSnapshot.accommodationDetails || '',
              mealsByDay: prev.packageSnapshot.mealsByDay || '',
              groundTransportationDetails: prev.packageSnapshot.groundTransportationDetails || '',
              boatTransferDetails: prev.packageSnapshot.boatTransferDetails || '',
              toursAndActivities: prev.packageSnapshot.toursAndActivities || '',
              otherInclusions: prev.packageSnapshot.otherInclusions || '',
              optionalExtras: prev.packageSnapshot.optionalExtras || '',
              exclusions: prev.packageSnapshot.exclusions || '',
              islandSchedule: prev.packageSnapshot.islandSchedule || '',
              importantInstructions: prev.packageSnapshot.importantInstructions || '',
            };

      const resolvedInclusionsEs =
        prev.inclusionsEs && prev.inclusionsEs.length > 0
          ? prev.inclusionsEs
          : matchingTemplate?.inclusionsEs
          ? [...matchingTemplate.inclusionsEs]
          : [...prev.inclusions];

      const resolvedExclusionsEs =
        prev.exclusionsEs && prev.exclusionsEs.length > 0
          ? prev.exclusionsEs
          : matchingTemplate?.exclusionsEs
          ? [...matchingTemplate.exclusionsEs]
          : [...prev.exclusions];

      const resolvedExperienceEs =
        prev.experienceEs || matchingTemplate?.experienceEs || matchingTemplate?.nameEs || prev.experience;

      const resolvedCabinCategoryEs =
        prev.cabinCategoryEs || matchingTemplate?.cabinCategoryEs || prev.cabinCategory;

      const resolvedBathroomTypeEs =
        prev.bathroomTypeEs || (prev.bathroomType === 'Private' ? 'Privado' : 'Compartido');

      return {
        ...prev,
        language: 'es',
        experienceEs: resolvedExperienceEs,
        packageTitleEs: prev.packageTitleEs || resolvedExperienceEs,
        cabinCategoryEs: resolvedCabinCategoryEs,
        bathroomTypeEs: resolvedBathroomTypeEs,
        packageSnapshotEs: resolvedSnapshotEs,
        inclusionsEs: resolvedInclusionsEs,
        exclusionsEs: resolvedExclusionsEs,
        paymentScheduleEs:
          prev.paymentScheduleEs || matchingTemplate?.paymentScheduleEs || 'Pendiente de confirmación por Petra.',
        depositRequirementEs:
          prev.depositRequirementEs || matchingTemplate?.depositRequirementEs || 'Pendiente de confirmación por Petra.',
        cancellationTermsEs:
          prev.cancellationTermsEs || matchingTemplate?.cancellationTermsEs || 'Pendiente de confirmación por Petra.',
        weatherLogisticsNoteEs:
          prev.weatherLogisticsNoteEs || matchingTemplate?.weatherLogisticsNoteEs || 'Pendiente de confirmación por Petra.',
        seasonalConditionsEs:
          prev.seasonalConditionsEs || matchingTemplate?.seasonalConditionsEs || 'Pendiente de confirmación por Petra.',
      };
    });
  };

  // Helper when customer-facing terms are edited: reset approval to 'Draft'
  const touchTermsCondition = () => {
    setFormData((prev) => {
      if (prev.termsStatus === 'Approved by Petra') {
        return { ...prev, termsStatus: 'Draft' };
      }
      return prev;
    });
  };

  // Line item handlers
  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: any
  ) => {
    const updated = [...formData.lineItems];
    const target = { ...updated[index] };

    if (field === 'description') {
      if (formData.language === 'es') {
        target.descriptionEs = String(value);
      } else {
        target.description = String(value);
      }
    } else if (field === 'descriptionEs') {
      target.descriptionEs = String(value);
    } else if (field === 'pricingBasis') {
      target.pricingBasis = value as PricingBasis;
      target.quantity = calculateLineQuantity(
        target.pricingBasis,
        formData.travelers,
        formData.nights,
        formData.cabinsCount,
        target.vehicleCount || 1,
        target.quantity
      );
      target.total = target.quantity * target.unitPrice;
    } else if (field === 'quantity') {
      target.quantity = Math.max(0, Number(value) || 0);
      target.total = target.quantity * target.unitPrice;
    } else if (field === 'unitPrice') {
      target.unitPrice = Math.max(0, Number(value) || 0);
      target.total = target.quantity * target.unitPrice;
    } else if (field === 'vehicleCount') {
      target.vehicleCount = Math.max(1, Number(value) || 1);
      if (target.pricingBasis === 'per_vehicle') {
        target.quantity = target.vehicleCount;
        target.total = target.quantity * target.unitPrice;
      }
    }

    updated[index] = target;
    setFormData((prev) => ({ ...prev, lineItems: updated }));
  };

  const handleAddLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: 'New Island Excursion or Service',
      descriptionEs: 'Nueva excursión o servicio en la isla',
      pricingBasis: 'per_person_total',
      quantity: formData.travelers,
      unitPrice: 50,
      total: formData.travelers * 50,
    };
    setFormData((prev) => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  };

  const handleRemoveLineItem = (index: number) => {
    if (formData.pricingMode === 'custom_itemized' && formData.lineItems.length <= 1) {
      alert('A custom itemized quotation must contain at least one line item.');
      return;
    }
    const updated = formData.lineItems.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, lineItems: updated }));
  };

  // Structured package snapshot handler (bilingual aware)
  const handleSnapshotChange = (field: keyof StructuredPackageSnapshot, value: string) => {
    touchTermsCondition();
    if (formData.language === 'es') {
      setFormData((prev) => ({
        ...prev,
        packageSnapshotEs: {
          ...(prev.packageSnapshotEs || {
            overview: '',
            accommodationDetails: '',
            mealsByDay: '',
            groundTransportationDetails: '',
            boatTransferDetails: '',
            toursAndActivities: '',
            otherInclusions: '',
            optionalExtras: '',
            exclusions: '',
            islandSchedule: '',
            importantInstructions: '',
          }),
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        packageSnapshot: {
          ...prev.packageSnapshot,
          [field]: value,
        },
      }));
    }
  };

  // Array handlers for inclusions / exclusions (bilingual aware)
  const handleArrayItemChange = (
    listKey: 'inclusions' | 'exclusions',
    index: number,
    newValue: string
  ) => {
    touchTermsCondition();
    if (formData.language === 'es') {
      const esKey = listKey === 'inclusions' ? 'inclusionsEs' : 'exclusionsEs';
      const list = [...(formData[esKey] || [])];
      list[index] = newValue;
      setFormData((prev) => ({ ...prev, [esKey]: list }));
    } else {
      const list = [...formData[listKey]];
      list[index] = newValue;
      setFormData((prev) => ({ ...prev, [listKey]: list }));
    }
  };

  const handleAddArrayItem = (listKey: 'inclusions' | 'exclusions') => {
    touchTermsCondition();
    if (formData.language === 'es') {
      const esKey = listKey === 'inclusions' ? 'inclusionsEs' : 'exclusionsEs';
      const placeholder = listKey === 'inclusions' ? 'Nueva inclusión de paquete' : 'Nueva exclusión de paquete';
      const list = [...(formData[esKey] || []), placeholder];
      setFormData((prev) => ({ ...prev, [esKey]: list }));
    } else {
      const placeholder = listKey === 'inclusions' ? 'New package inclusion item' : 'New package exclusion item';
      const list = [...formData[listKey], placeholder];
      setFormData((prev) => ({ ...prev, [listKey]: list }));
    }
  };

  const handleRemoveArrayItem = (listKey: 'inclusions' | 'exclusions', index: number) => {
    touchTermsCondition();
    if (formData.language === 'es') {
      const esKey = listKey === 'inclusions' ? 'inclusionsEs' : 'exclusionsEs';
      const list = (formData[esKey] || []).filter((_, idx) => idx !== index);
      setFormData((prev) => ({ ...prev, [esKey]: list }));
    } else {
      const list = formData[listKey].filter((_, idx) => idx !== index);
      setFormData((prev) => ({ ...prev, [listKey]: list }));
    }
  };

  // Photo handlers
  const handleTogglePhotoSelect = (photo: AttachedPhoto) => {
    const isSelected = formData.selectedPhotos.some((p) => p.id === photo.id);
    let updated: AttachedPhoto[];
    if (isSelected) {
      updated = formData.selectedPhotos.filter((p) => p.id !== photo.id);
    } else {
      updated = [...formData.selectedPhotos, photo];
    }
    setFormData((prev) => ({ ...prev, selectedPhotos: updated }));
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    const photos = [...formData.selectedPhotos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const temp = photos[index];
    photos[index] = photos[targetIndex];
    photos[targetIndex] = temp;

    setFormData((prev) => ({ ...prev, selectedPhotos: photos }));
  };

  const handleUpdatePhotoCaption = (id: string, caption: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPhotos: prev.selectedPhotos.map((p) =>
        p.id === id ? { ...p, caption } : p
      ),
    }));
  };

  const handleUpdatePhotoVerification = (id: string, verificationStatus: any) => {
    setFormData((prev) => ({
      ...prev,
      selectedPhotos: prev.selectedPhotos.map((p) =>
        p.id === id ? { ...p, verificationStatus } : p
      ),
    }));
  };

  // Local temporary file upload handler
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2MB for browser preview.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const newPhoto: AttachedPhoto = {
          id: `upload-${Date.now()}`,
          title: cleanName,
          caption: `Photo of ${cleanName}`,
          island: formData.island || 'Custom',
          cabinCategory: 'Uploaded Photo',
          verificationStatus: 'Unverified demo',
          url: dataUrl,
          isTemporaryUpload: true,
          isUploadedPhoto: true,
        };

        setFormData((prev) => ({
          ...prev,
          selectedPhotos: [...prev.selectedPhotos, newPhoto],
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Open reset conditions modal
  const handleResetConditionsToPending = () => {
    setIsResetModalOpen(true);
  };

  // Confirm reset conditions inside modal
  const handleConfirmResetConditions = () => {
    const PENDING_TEXT = 'Pending Petra’s confirmation.';
    const PENDING_TEXT_ES = 'Pendiente de confirmación por Petra.';
    const updatedDraft = {
      ...formData,
      paymentSchedule: PENDING_TEXT,
      paymentScheduleEs: PENDING_TEXT_ES,
      depositRequirement: PENDING_TEXT,
      depositRequirementEs: PENDING_TEXT_ES,
      cancellationTerms: PENDING_TEXT,
      cancellationTermsEs: PENDING_TEXT_ES,
      weatherLogisticsNote: PENDING_TEXT,
      weatherLogisticsNoteEs: PENDING_TEXT_ES,
      seasonalConditions: PENDING_TEXT,
      seasonalConditionsEs: PENDING_TEXT_ES,
      termsStatus: 'Draft' as const,
      status: 'Draft' as const,
    };

    const outdatedInfo = getOutdatedFieldsInfo(updatedDraft);

    setFormData({
      ...updatedDraft,
      hasOutdatedSampleTextFlag: outdatedInfo.hasOutdatedText,
      outdatedFieldsList: outdatedInfo.outdatedFields,
    });

    setIsResetModalOpen(false);
    setSaveSuccessMsg('Conditions reset to "Pending Petra’s confirmation" in English & Spanish and status set to Draft. Click "Save Draft" to persist.');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Save handler with validation
  const handleSaveWithStatus = async (newStatus: Quotation['status']) => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    // Rule: Prevent saving Ready for review if pricing is unconfirmed, terms are draft, or customer name is missing
    if (newStatus === 'Ready for review') {
      const isUnpriced =
        formData.pricingStatus === 'Rates to Be Confirmed' ||
        (formData.pricingMode === 'first_night_additional' && (!formData.firstNightRate || formData.firstNightRate <= 0)) ||
        (formData.pricingMode === 'single_total' && (!formData.totalPackagePrice || formData.totalPackagePrice <= 0)) ||
        (formData.pricingMode === 'custom_itemized' && (!formData.subtotal || formData.subtotal <= 0));

      if (isUnpriced) {
        setErrorMsg(
          'Cannot mark quotation as "Ready for review" while Pricing Status is "Rates to Be Confirmed" or rates are set to $0.00. Please enter confirmed prices and set Pricing Status to "Priced Quotation" before finalizing.'
        );
        setActiveTab('pricing');
        return;
      }
      if (formData.termsStatus === 'Draft') {
        setErrorMsg(
          'Cannot save as "Ready for review" while Terms Status is "Draft". Please approve terms (Set Terms Status to "Approved by Petra") or save as "Draft".'
        );
        setActiveTab('conditions');
        return;
      }
      if (!formData.customerName || formData.customerName.trim() === '') {
        setErrorMsg('Customer name is required before marking quotation as Ready for review.');
        setActiveTab('trip');
        return;
      }
    }

    // Check dates validity if both provided
    if (formData.arrivalDate && formData.departureDate) {
      if (new Date(formData.departureDate) < new Date(formData.arrivalDate)) {
        setErrorMsg('Departure date cannot be earlier than arrival date.');
        setActiveTab('trip');
        return;
      }
    }

    // Line items check
    for (const item of formData.lineItems) {
      if (item.unitPrice < 0) {
        setErrorMsg(`Unit price for "${item.description || 'line item'}" cannot be negative.`);
        setActiveTab('pricing');
        return;
      }
    }

    setIsSaving(true);
    try {
      const updated = { ...formData, status: newStatus };
      const saved = await onSave(updated);
      if (saved) {
        setFormData(saved);
      }

      // Draft successfully persisted to database, clear local draft key
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
          sessionStorage.removeItem('guna_yala_admin_active_view');
          sessionStorage.removeItem('guna_yala_admin_selected_id');
        }
      } catch (e) {}

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const statusLabel = newStatus === 'Draft' ? 'Draft saved successfully' : 'Quotation saved as Ready for review';
      setSaveSuccessMsg(`${statusLabel} at ${timeStr}`);
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err?.message || 'Failed to save quotation.';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelAction = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        sessionStorage.removeItem('guna_yala_admin_active_view');
        sessionStorage.removeItem('guna_yala_admin_selected_id');
      }
    } catch (e) {}
    onCancel();
  };

  // Helper text for pricing basis
  const getPricingBasisExplanation = (item: LineItem) => {
    switch (item.pricingBasis) {
      case 'per_person_total':
        return `${formData.travelers} traveler${formData.travelers !== 1 ? 's' : ''} × 1 stay = ${item.quantity}`;
      case 'per_person_night':
        return `${formData.travelers} traveler${formData.travelers !== 1 ? 's' : ''} × ${formData.nights} night${formData.nights !== 1 ? 's' : ''} = ${item.quantity}`;
      case 'per_cabin_night':
        return `${formData.cabinsCount} cabin${formData.cabinsCount !== 1 ? 's' : ''} × ${formData.nights} night${formData.nights !== 1 ? 's' : ''} = ${item.quantity}`;
      case 'per_booking':
        return `Flat per-booking fee = 1`;
      case 'per_vehicle':
        return `${item.vehicleCount || 1} vehicle${(item.vehicleCount || 1) !== 1 ? 's' : ''} = ${item.quantity}`;
      case 'custom':
      default:
        return `Custom quantity = ${item.quantity}`;
    }
  };

  const rootRef = formData.rootReference || extractRootReference(formData.reference);
  const familyQuotes = (allQuotations || []).filter((q) => {
    const qRoot = q.rootReference || extractRootReference(q.reference);
    return qRoot.toUpperCase() === rootRef.toUpperCase();
  }).sort((a, b) => a.reference.localeCompare(b.reference));

  const nextRevRef = generateNextRevisionReference(formData, allQuotations || []).nextReference;

  return (
    <div className="space-y-6 pb-16">
      {/* Revision Status & History Bar */}
      <div className="bg-[#f7f4ed] border border-[#e0d6c1] rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1 font-mono font-bold text-[#0e3b2f] bg-[#0e3b2f] text-white px-2 py-0.5 rounded">
            <GitBranch className="w-3 h-3 text-[#c9a96e]" />
            {formData.reference}
          </span>
          {formData.revisionLetter ? (
            <span className="font-semibold text-[#0e3b2f]">
              {tr(`Proposal Revision ${formData.revisionLetter}`, `Revisión de propuesta ${formData.revisionLetter}`)}
            </span>
          ) : (
            <span className="font-semibold text-[#52606d]">
              {tr('Original Proposal Offer', 'Oferta de propuesta original')}
            </span>
          )}
          {formData.revisionNote && (
            <span className="text-[#687785] italic border-l border-[#cfc7b2] pl-2 max-w-md truncate">
              "{formData.revisionNote}"
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {familyQuotes.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-[#52606d]">
              <span className="font-medium text-[#1c242c]">{tr(`Revision Family (${familyQuotes.length}):`, `Familia de revisiones (${familyQuotes.length}):`)}</span>
              <div className="flex items-center gap-1">
                {familyQuotes.map((q) => {
                  const isSelected = q.id === formData.id || q.reference === formData.reference;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => onSelectQuotation && onSelectQuotation(q)}
                      className={`px-2 py-0.5 font-mono text-[11px] rounded transition-colors ${
                        isSelected
                          ? 'bg-[#0e3b2f] text-[#f7f4ed] font-bold shadow-xs'
                          : 'bg-white hover:bg-[#e6dece] text-[#1c242c] border border-[#cfc7b2]'
                      }`}
                      title={`${q.reference} - $${q.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${q.status})`}
                    >
                      {q.reference}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onCreateRevision && (
            <button
              type="button"
              onClick={() => {
                setRevisionNoteInput(formData.revisionNote || '');
                setIsRevisionModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0e3b2f] hover:bg-[#155243] text-white rounded font-medium transition-colors shadow-xs cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#c9a96e]" />
              <span>{tr(`Create Revision ${nextRevRef}`, `Crear revisión ${nextRevRef}`)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-[#e5dec9] rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelAction}
            className="p-2 text-[#52606d] hover:text-[#0e3b2f] hover:bg-[#f2ece0] rounded transition-colors"
            title={tr('Return to Quotations List', 'Volver a la lista de cotizaciones')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0e3b2f] bg-[#e4ede8] px-2 py-0.5 rounded">
                {formData.reference}
              </span>
              <span className="text-xs text-[#687785]">
                {formData.customerName ? formData.customerName : tr('New Customer Quotation', 'Nueva cotización de cliente')}
              </span>
            </div>
            <h2 className="text-lg font-serif font-semibold text-[#1c242c] mt-0.5">
              {tr('Quotation Editor', 'Editor de cotizaciones')}
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bilingual Language Switcher */}
          <div className="inline-flex items-center rounded-md border border-[#cfc7b2] bg-[#f7f4ed] p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                (formData.language || 'en') === 'en'
                  ? 'bg-[#0e3b2f] text-white shadow-xs'
                  : 'text-[#52606d] hover:text-[#0e3b2f]'
              }`}
              title="Edit English proposal content"
            >
              <span>🇬🇧 English</span>
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('es')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                formData.language === 'es'
                  ? 'bg-[#0e3b2f] text-white shadow-xs'
                  : 'text-[#52606d] hover:text-[#0e3b2f]'
              }`}
              title="Edit Spanish proposal content"
            >
              <span>🇵🇦 Español</span>
            </button>
          </div>

          {/* Spanish Translation Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${spanishStatus.badgeColor}`}
            title={
              spanishStatus.isComplete
                ? 'All official Spanish fields populated'
                : `Pending review: ${spanishStatus.missing.join(', ')}`
            }
          >
            {spanishStatus.badgeText}
          </span>

          {saveSuccessMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {saveSuccessMsg}
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSaveWithStatus('Draft')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#f0eae0] hover:bg-[#e6dece] disabled:opacity-50 text-[#1c242c] rounded transition-colors"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0e3b2f]" />
            ) : (
              <Save className="w-3.5 h-3.5 text-[#0e3b2f]" />
            )}
            <span>{isSaving ? tr('Saving…', 'Guardando…') : tr('Save Draft', 'Guardar borrador')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveWithStatus('Ready for review')}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white rounded transition-colors shadow-sm"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a96e]" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#c9a96e]" />
            )}
            <span>{isSaving ? tr('Saving…', 'Guardando…') : tr('Save & Mark Ready', 'Guardar y marcar como lista')}</span>
          </button>

          <button
            onClick={() => {
              try {
                if (typeof window !== 'undefined' && formData) {
                  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
                  sessionStorage.setItem('guna_yala_admin_active_view', 'preview');
                  localStorage.setItem('guna_yala_admin_active_view', 'preview');
                  if (formData.id || formData.reference) {
                    sessionStorage.setItem('guna_yala_admin_selected_id', formData.id || formData.reference);
                    localStorage.setItem('guna_yala_admin_selected_id', formData.id || formData.reference);
                  }
                }
              } catch (e) {}
              onPreview(formData);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#c9a96e] hover:bg-[#d8b87d] text-[#0e2720] font-semibold rounded transition-colors shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{tr('Customer Preview', 'Vista previa del cliente')}</span>
          </button>
        </div>
      </div>

      {/* Error Message Notice Banner */}
      {errorMsg && (
        <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-amber-950 mb-0.5">{tr('Validation Requirement:', 'Requisito de validación:')}</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Spanish Mode Notice Banner */}
      {formData.language === 'es' && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] shrink-0">
              MODO ESPAÑOL ACTIVO
            </span>
            <span>
              Editando cotización en <strong>Español</strong>. Las modificaciones en textos de paquete, inclusiones, exclusiones y términos se guardan en la versión en español; el contenido en inglés y los cálculos de precios se conservan intactos.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className="text-emerald-800 underline hover:text-emerald-950 font-medium text-xs shrink-0 self-start sm:self-auto cursor-pointer"
          >
            Cambiar a English →
          </button>
        </div>
      )}

      {/* Outdated Sample Text Banner Notice */}
      {formData.hasOutdatedSampleTextFlag && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-950 mb-0.5">{tr('Administrator Review Required — Outdated Sample Text Detected:', 'Revisión administrativa requerida — Texto de muestra obsoleto detectado:')}</strong>
              <span>
                {tr('This quotation contains legacy sample text (such as unconfirmed cancellation rules or former entrance fee descriptions). Please review and update terms, inclusions, or exclusions before finalizing.', 'Esta cotización contiene texto de muestra heredado (como reglas de cancelación sin confirmar o descripciones de tarifas de entrada anteriores). Revise y actualize los términos, inclusiones o exclusiones antes de finalizar.')}
              </span>
            </div>
          </div>

          <button
            onClick={handleResetConditionsToPending}
            className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-xs shrink-0 self-start sm:self-auto transition-colors"
          >
            {tr('Reset Conditions to Pending', 'Restablecer condiciones a pendiente')}
          </button>
        </div>
      )}

      {/* Package Template Quick Loader Bar */}
      <div className="bg-[#f7f4ed] border border-[#d8caa8] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c9a96e] shrink-0" />
          <div>
            <span className="text-xs font-semibold text-[#0e3b2f]">
              {tr('Package Template Selector:', 'Selector de plantilla de paquete:')}
            </span>
            <p className="text-[11px] text-[#687785]">
              {tr('Populates reusable package content without overwriting customer contact info or travel dates.', 'Rellena contenido reutilizable del paquete sin sobrescribir la información de contacto o fechas de viaje.')}
            </p>
          </div>
        </div>

        <select
          value={formData.packageTemplateId || ''}
          onChange={(e) => e.target.value && handleApplyPackageTemplate(e.target.value)}
          className="text-xs border border-[#cfc7b2] rounded px-3 py-1.5 bg-white text-[#0e3b2f] font-medium focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
        >
          <option value="" disabled>
            {tr('-- Select Package Template --', '-- Seleccionar plantilla de paquete --')}
          </option>
          {PACKAGE_TEMPLATES.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {isEs && tmpl.nameEs ? tmpl.nameEs : tmpl.name}
            </option>
          ))}
        </select>
      </div>

      {templateMsg && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg text-xs text-emerald-950 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{templateMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5dec9] overflow-x-auto pb-px">
        {[
          { id: 'trip', label: tr('1. Trip & Logistics', '1. Viaje y logística'), icon: User },
          { id: 'package', label: tr('2. Structured Package', '2. Detalles del paquete'), icon: Layers },
          { id: 'pricing', label: tr('3. Pricing & Line Items', '3. Precios y conceptos'), icon: DollarSign },
          { id: 'conditions', label: tr('4. Terms & Conditions', '4. Términos y condiciones'), icon: FileText },
          { id: 'photos', label: tr('5. Photos & Media', '5. Fotos y contenido multimedia'), icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-[#0e3b2f] text-[#0e3b2f] font-semibold bg-white rounded-t-md'
                  : 'border-transparent text-[#687785] hover:text-[#1c242c] hover:border-[#c4ba9f]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#c9a96e]' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TRIP & LOGISTICS */}
      {activeTab === 'trip' && (
        <div className="space-y-6">
          {/* Customer Information Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <User className="w-4 h-4 text-[#c9a96e]" />
              <span>{tr('Customer Contact Information', 'Información de contacto del cliente')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Customer Name *', 'Nombre del cliente *')}</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder={tr('e.g. Oliver & Emma Vance', 'p. ej. Oliver y Emma Vance')}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Customer Email', 'Correo electrónico del cliente')}</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="oliver.vance@example.com"
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[9px] font-bold">💬</span>
                  <span>{tr('WhatsApp Number', 'Número de WhatsApp')}</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative w-40 shrink-0">
                    <input
                      type="text"
                      placeholder={tr('Search code...', 'Buscar código...')}
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] border border-[#cfc7b2] rounded-t bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                    />
                    <select
                      value={countryCode}
                      onChange={(e) => handlePhoneChange(e.target.value, phoneNumber)}
                      className="w-full px-2.5 py-1.5 text-xs border border-t-0 border-[#cfc7b2] rounded-b bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                    >
                      {INTERNATIONAL_COUNTRY_CODES
                        .filter(
                          (c) =>
                            c.label.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            c.code.includes(countrySearch)
                        )
                        .map((c) => (
                          <option key={c.code + c.label} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneChange(countryCode, e.target.value)}
                      placeholder="6123-4567 or (555) 234-8901"
                      className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Quotation Date (Fixed)', 'Fecha de cotización (Fija)')}</label>
                <input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Quotation Expiry Date', 'Fecha de vencimiento de cotización')}</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                  <span>{tr('Quotation Language / Idioma', 'Idioma de cotización')}</span>
                  <span className="text-[10px] font-mono text-[#8a98a5]">
                    {formData.language === 'es' ? 'ES' : 'EN'}
                  </span>
                </label>
                <select
                  value={formData.language || 'en'}
                  onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'es')}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-white font-medium text-[#0e3b2f] focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                >
                  <option value="en">English (Official English proposal)</option>
                  <option value="es">Español (Propuesta oficial en español)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#f0eae0]">
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-[#c9a96e]" />
                <span>{tr('Revision Note / Reason for Change', 'Nota de revisión / Motivo del cambio')}</span>
              </label>
              <input
                type="text"
                value={formData.revisionNote || ''}
                onChange={(e) => setFormData({ ...formData, revisionNote: e.target.value })}
                placeholder={tr('e.g. Switched to private 4x4, upgraded cabaña to beachfront, and added Cayos Limón excursion.', 'p. ej. Cambio a 4x4 privado, mejora de cabaña a frente de playa y excursión a Cayos Limón.')}
                className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
              />
              <p className="text-[10px] text-[#687785] mt-1">
                {tr('Internal administrator note explaining what was modified in this revision (e.g. 695-A vs 695).', 'Nota interna del administrador que explica qué se modificó en esta revisión (p. ej. 695-A vs 695).')}
              </p>
            </div>
          </div>

          {/* Bilingual Translation Status Banner */}
          <div
            className={`p-4 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              spanishStatus.isComplete
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {spanishStatus.isComplete ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <span>{spanishStatus.isComplete ? tr('Spanish Translation Ready', 'Traducción al español lista') : tr('Spanish Translation Status: Review Recommended', 'Estado de traducción al español: Revisión recomendada')}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/80 border border-current">
                    {tr('Active:', 'Activo:')} {formData.language === 'es' ? 'Español' : 'English'}
                  </span>
                </div>
                <p className="text-[11px] text-[#52606d] mt-0.5">
                  {spanishStatus.isComplete
                    ? tr('All package titles, itinerary overview, inclusions, exclusions, and booking terms have verified Spanish translations.', 'Todos los títulos del paquete, resumen de itinerario, inclusiones, exclusiones y términos de reserva tienen traducciones al español verificadas.')
                    : `${tr('Pending Spanish verification:', 'Pendiente de verificación en español:')} ${spanishStatus.missing.join(', ')}. ${tr('Switch to Español to review and edit.', 'Cambie a Español para revisar y editar.')}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleLanguageChange(formData.language === 'es' ? 'en' : 'es')}
              className="px-3 py-1.5 rounded text-xs font-semibold bg-white border border-[#cfc7b2] text-[#0e3b2f] hover:bg-[#faf8f5] transition-colors shrink-0 cursor-pointer shadow-2xs self-start sm:self-auto"
            >
              {formData.language === 'es' ? 'Switch to English View 🇬🇧' : 'Switch to Spanish View 🇵🇦'}
            </button>
          </div>

          {/* Trip Logistics & Accommodation Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <Calendar className="w-4 h-4 text-[#c9a96e]" />
              <span>{tr('Trip Logistics & Accommodation Parameters', 'Parámetros de viaje y logística de alojamiento')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Arrival Date', 'Fecha de llegada')}</label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Departure Date', 'Fecha de salida')}</label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Nights (Auto-calculated)', 'Noches (Calculado automáticamente)')}</label>
                <NumericInput
                  min={0}
                  value={formData.nights}
                  onChange={(val) => setFormData({ ...formData, nights: val })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] font-semibold text-[#0e3b2f]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Number of Travelers', 'Número de viajeros')}</label>
                <NumericInput
                  min={1}
                  value={formData.travelers}
                  onChange={(val) => setFormData({ ...formData, travelers: val })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Island / Destination', 'Isla / Destino')}</label>
                <input
                  type="text"
                  value={formData.island}
                  onChange={(e) => setFormData({ ...formData, island: e.target.value })}
                  placeholder={tr('e.g. Isla Chichime, Isla Chichime Chico', 'p. ej. Isla Chichime, Isla Chichime Chico')}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1 flex items-center justify-between">
                  <span>{tr('Experience / Package Title', 'Título de la experiencia / paquete')}</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#f7f4ed] text-[#0e3b2f] border border-[#cfc7b2]">
                    {formData.language === 'es' ? 'ESPAÑOL' : 'ENGLISH'}
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.language === 'es' ? (formData.experienceEs ?? '') : (formData.experience ?? '')}
                  onChange={(e) => {
                    if (formData.language === 'es') {
                      setFormData({ ...formData, experienceEs: e.target.value, packageTitleEs: e.target.value });
                    } else {
                      setFormData({ ...formData, experience: e.target.value, packageTitle: e.target.value });
                    }
                  }}
                  placeholder={formData.language === 'es' ? 'p. ej. Experiencia Nocturna en Isla Chichime' : 'e.g. Island Overnight Experience'}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[#52606d] font-medium mb-1 flex items-center justify-between">
                  <span>{tr('Cabin Category', 'Categoría de cabaña')}</span>
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#f7f4ed] text-[#0e3b2f] border border-[#cfc7b2]">
                    {formData.language === 'es' ? 'ESPAÑOL' : 'ENGLISH'}
                  </span>
                </label>
                <input
                  type="text"
                  value={formData.language === 'es' ? (formData.cabinCategoryEs ?? '') : (formData.cabinCategory ?? '')}
                  onChange={(e) => {
                    if (formData.language === 'es') {
                      setFormData({ ...formData, cabinCategoryEs: e.target.value });
                    } else {
                      setFormData({ ...formData, cabinCategory: e.target.value });
                    }
                  }}
                  placeholder={formData.language === 'es' ? 'p. ej. Cabaña privada frente al mar' : 'e.g. Beach Cabin'}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Number of Cabins', 'Número de cabañas')}</label>
                <NumericInput
                  min={1}
                  value={formData.cabinsCount}
                  onChange={(val) => setFormData({ ...formData, cabinsCount: val })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>
            </div>

            {/* Separate Controls for Bathroom, Ground Transport, Boat Transfers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-3">
              {/* Bathroom */}
              <div className="bg-[#faf8f5] p-3 rounded border border-[#e2d8c3]">
                <label className="block text-[#52606d] font-semibold mb-1.5 flex items-center justify-between">
                  <span>{tr('Bathroom Facilities', 'Instalaciones de baño')}</span>
                  <span className="text-[10px] font-mono text-[#8a98a5]">
                    {formData.language === 'es' ? 'ES: ' + (formData.bathroomTypeEs || (formData.bathroomType === 'Private' ? 'Privado' : 'Compartido')) : 'EN'}
                  </span>
                </label>
                <select
                  value={formData.bathroomType}
                  onChange={(e) => {
                    const bType = e.target.value as 'Shared' | 'Private';
                    setFormData({
                      ...formData,
                      bathroomType: bType,
                      bathroomTypeEs: bType === 'Private' ? 'Privado' : 'Compartido',
                    });
                  }}
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Private">{formData.language === 'es' ? 'Baño Privado' : 'Private Bathroom'}</option>
                  <option value="Shared">{formData.language === 'es' ? 'Baño Compartido' : 'Shared Bathroom'}</option>
                </select>
              </div>

              {/* Ground Transportation */}
              <div className="bg-[#faf8f5] p-3 rounded border border-[#e2d8c3]">
                <label className="block text-[#52606d] font-semibold mb-1.5">{tr('Ground Transportation (4x4)', 'Transporte terrestre (4x4)')}</label>
                <select
                  value={formData.groundTransportation}
                  onChange={(e) =>
                    setFormData({ ...formData, groundTransportation: e.target.value as TransportOption })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Shared">{tr('Shared 4x4 Transfer', 'Traslado en 4x4 compartido')}</option>
                  <option value="Private">{tr('Private Exclusive 4x4 SUV', 'SUV 4x4 privado exclusivo')}</option>
                  <option value="Not included">{tr('Not included', 'No incluido')}</option>
                  <option value="Review required">{tr('Review required', 'Revisión requerida')}</option>
                </select>
              </div>

              {/* Boat Transfers */}
              <div className="bg-[#faf8f5] p-3 rounded border border-[#e2d8c3]">
                <label className="block text-[#52606d] font-semibold mb-1.5">{tr('Boat Transfers (Water Taxi)', 'Traslado en lancha (Water Taxi)')}</label>
                <select
                  value={formData.boatTransfers}
                  onChange={(e) =>
                    setFormData({ ...formData, boatTransfers: e.target.value as TransportOption })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Shared">{tr('Shared Water Taxi Boat', 'Lancha de transporte compartido')}</option>
                  <option value="Private">{tr('Private Exclusive Boat', 'Lancha privada exclusiva')}</option>
                  <option value="Not included">{tr('Not included', 'No incluido')}</option>
                  <option value="Review required">{tr('Review required', 'Revisión requerida')}</option>
                </select>
              </div>
            </div>

            {formData.transportationReviewFlag && (
              <div className="bg-amber-50 text-amber-900 border border-amber-300 p-3 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>{tr('Review Required:', 'Revisión requerida:')}</strong> {tr('This quotation contains an ambiguous legacy transportation value. Please select specific settings for Ground Transport and Boat Transfers above.', 'Esta cotización contiene un valor de transporte heredado ambiguo. Seleccione configuraciones específicas para el transporte terrestre y traslados en lancha arriba.')}
                </span>
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="bg-[#fffdfa] p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>{tr('Internal Administrator Notes', 'Notas administrativas internas')}</span>
              </h3>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                {tr('Internal Only — Excluded from Customer View', 'Solo uso interno — Excluido de la vista de cliente')}
              </span>
            </div>

            <textarea
              rows={3}
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder={tr('e.g. Special anniversary request, dietary allergies, captain notes...', 'p. ej. Solicitud especial de aniversario, alergias alimentarias, notas del capitán...')}
              className="w-full p-3 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* TAB 2: STRUCTURED PACKAGE DETAILS */}
      {activeTab === 'package' && (
        <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0eae0] pb-2">
            <div>
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#c9a96e]" />
                <span>{tr('Structured Package Information', 'Información estructurada del paquete')} ({formData.language === 'es' ? 'Español' : 'English'})</span>
              </h3>
              <p className="text-xs text-[#687785] mt-1">
                {formData.language === 'es'
                  ? 'Editando detalles estructurados en español. Los cambios se guardan en packageSnapshotEs sin sobreescribir la versión en inglés.'
                  : 'These details are saved directly inside the quotation snapshot in English as clean readable text.'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded border uppercase font-mono tracking-wider text-[#0e3b2f] bg-[#f7f4ed] border-[#cfc7b2]">
                {formData.language === 'es' ? '🇵🇦 Vista Español' : '🇬🇧 English View'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Experience Overview', 'Descripción general de la experiencia')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('overview')}
                onChange={(e) => handleSnapshotChange('overview', e.target.value)}
                placeholder={formData.language === 'es' ? 'Resumen general de la estadía...' : 'Experience overview...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Accommodation & Bathroom Details', 'Detalles de alojamiento y baño')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('accommodationDetails')}
                onChange={(e) => handleSnapshotChange('accommodationDetails', e.target.value)}
                placeholder={formData.language === 'es' ? 'Detalles de la cabaña y baño...' : 'Accommodation and bathroom details...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Meals by Day', 'Régimen de comidas por día')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('mealsByDay')}
                onChange={(e) => handleSnapshotChange('mealsByDay', e.target.value)}
                placeholder={formData.language === 'es' ? 'Régimen de comidas por día...' : 'Meals included by day...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Ground Transportation Details', 'Detalles de transporte terrestre')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('groundTransportationDetails')}
                onChange={(e) => handleSnapshotChange('groundTransportationDetails', e.target.value)}
                placeholder={formData.language === 'es' ? 'Detalles de traslado en vehículo 4x4...' : 'Ground transportation details...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Boat Transfer Details', 'Detalles de traslado en lancha')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('boatTransferDetails')}
                onChange={(e) => handleSnapshotChange('boatTransferDetails', e.target.value)}
                placeholder={formData.language === 'es' ? 'Detalles del traslado marítimo en lancha...' : 'Boat transfer details...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Included Tours & Activities', 'Tours y actividades incluidas')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('toursAndActivities')}
                onChange={(e) => handleSnapshotChange('toursAndActivities', e.target.value)}
                placeholder={formData.language === 'es' ? 'Tours e islas visitadas incluidas...' : 'Included tours and activities...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Other Inclusions', 'Otras inclusiones')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('otherInclusions')}
                onChange={(e) => handleSnapshotChange('otherInclusions', e.target.value)}
                placeholder={formData.language === 'es' ? 'Otras inclusiones y amenidades...' : 'Other inclusions...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Optional Extras', 'Servicios opcionales')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('optionalExtras')}
                onChange={(e) => handleSnapshotChange('optionalExtras', e.target.value)}
                placeholder={formData.language === 'es' ? 'Servicios opcionales y mejoras disponibles...' : 'Optional extras...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Exclusions', 'Exclusiones')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('exclusions')}
                onChange={(e) => handleSnapshotChange('exclusions', e.target.value)}
                placeholder={formData.language === 'es' ? 'Impuestos de entrada y conceptos no incluidos...' : 'Exclusions...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Island Arrival & Departure Schedule', 'Horarios de llegada y salida a la isla')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('islandSchedule')}
                onChange={(e) => handleSnapshotChange('islandSchedule', e.target.value)}
                placeholder={formData.language === 'es' ? 'Horarios de salida, llegada y checkout...' : 'Island arrival and departure schedule...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#0e3b2f] font-semibold mb-1 flex items-center justify-between">
                <span>{tr('Important Travel Instructions', 'Instrucciones de viaje importantes')}</span>
                <span className="text-[10px] text-[#8a98a5]">{formData.language === 'es' ? 'ES' : 'EN'}</span>
              </label>
              <textarea
                rows={3}
                value={getSnapshotValue('importantInstructions')}
                onChange={(e) => handleSnapshotChange('importantInstructions', e.target.value)}
                placeholder={formData.language === 'es' ? 'Instrucciones importantes (pasaportes, efectivo, equipaje)...' : 'Important travel instructions...'}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING & LINE ITEMS */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Quotation Pricing Status Card */}
          <div className="bg-white p-5 rounded-lg border border-[#e5dec9] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr('Quotation Pricing Status', 'Estado de precios de la cotización')}</span>
                </h3>
                <p className="text-xs text-[#687785] mt-0.5">
                  {tr('Set whether this quotation contains confirmed rates or is an unpriced inquiry.', 'Establezca si esta cotización contiene tarifas confirmadas o es una consulta sin precio.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={formData.pricingStatus || 'Priced Quotation'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricingStatus: e.target.value as QuotationPricingStatus,
                    })
                  }
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-[#cfc7b2] bg-[#faf8f5] text-[#0e3b2f] focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                >
                  <option value="Priced Quotation">{tr('Priced Quotation (Confirmed rates)', 'Cotización con tarifas (Tarifas confirmadas)')}</option>
                  <option value="Rates to Be Confirmed">{tr('Rates to Be Confirmed (Unpriced inquiry)', 'Tarifas por confirmar (Consulta sin precio)')}</option>
                </select>
              </div>
            </div>

            {formData.pricingStatus === 'Rates to Be Confirmed' && (
              <div className="p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-950">{tr('Rates to Be Confirmed Active:', 'Tarifas por confirmar activas:')}</strong>
                  <span>
                    {tr('Customer preview and exported PDFs will clearly display “Rates to Be Confirmed” instead of $0.00. You may save this proposal as a Draft, but “Save & Mark Ready” is disabled until rates are entered and marked as confirmed.', 'La vista previa del cliente y los PDF exportados mostrarán claramente “Tarifas por confirmar” en lugar de $0.00. Puede guardar esta propuesta como borrador, pero “Guardar y marcar como lista” está deshabilitado hasta que se ingresen las tarifas y se marquen como confirmadas.')}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quotation Pricing Method Selector Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <DollarSign className="w-4 h-4 text-[#c9a96e]" />
              <span>{tr('Quotation Pricing Method', 'Método de tarificación de la cotización')}</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'first_night_additional', label: tr('A. First Night + Additional Nights', 'A. Primera noche + Noches adicionales'), desc: tr('Per person rates for first night & additional nights', 'Tarifas por persona para primera noche y noches adicionales') },
                { id: 'single_total', label: tr('B. Single Total Package Price', 'B. Precio total único del paquete'), desc: tr('Complete fixed package price for booking', 'Precio fijo completo del paquete para la reserva') },
                { id: 'custom_itemized', label: tr('C. Custom Itemized Services', 'C. Servicios personalizados detallados'), desc: tr('Detailed itemized pricing table with custom bases', 'Tabla de precios detallada con bases personalizadas') },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, pricingMode: mode.id as any })}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    formData.pricingMode === mode.id
                      ? 'border-[#0e3b2f] bg-[#f2edd8] ring-1 ring-[#0e3b2f]'
                      : 'border-[#cfc7b2] bg-[#faf8f5] hover:bg-white'
                  }`}
                >
                  <div className="font-semibold text-[#0e3b2f] text-xs mb-1">{mode.label}</div>
                  <div className="text-[11px] text-[#52606d]">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode A: First Night + Additional Nights */}
          {formData.pricingMode === 'first_night_additional' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
                  <Calendar className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr('First Night & Additional Nights Rates (Per Person)', 'Tarifas por primera noche y noches adicionales (Por persona)')}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[#52606d] font-medium mb-1">{tr('First-Night Price Per Person (USD)', 'Precio por persona primera noche (USD)')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5] font-mono">$</span>
                      <NumericInput
                        min={0}
                        value={formData.firstNightRate}
                        onChange={(val) => setFormData({ ...formData, firstNightRate: val })}
                        className="w-full pl-7 pr-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#52606d] font-medium mb-1">{tr('Additional-Night Price Per Person Per Night (USD)', 'Precio por persona por noche adicional (USD)')}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5] font-mono">$</span>
                      <NumericInput
                        min={0}
                        value={formData.additionalNightRate}
                        onChange={(val) => setFormData({ ...formData, additionalNightRate: val })}
                        className="w-full pl-7 pr-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated Breakdown Card */}
                <div className="bg-[#f5f1e8] p-4 rounded border border-[#e5dec9] space-y-2 text-xs font-mono">
                  <div className="font-semibold text-[#0e3b2f] font-sans border-b border-[#e5dec9] pb-1.5 mb-2">
                    {tr(`Live Calculation Breakdown (${formData.travelers} Travelers, ${formData.nights} Nights)`, `Desglose de cálculo en vivo (${formData.travelers} viajeros, ${formData.nights} noches)`)}
                  </div>
                  <div className="flex justify-between text-[#52606d]">
                    <span>{tr(`First Night (${formData.travelers} travelers × $${formData.firstNightRate}):`, `Primera noche (${formData.travelers} viajeros × $${formData.firstNightRate}):`)}</span>
                    <span>${(formData.travelers * formData.firstNightRate).toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-[#52606d]">
                    <span>{tr(`Additional Nights (${formData.travelers} travelers × ${Math.max(formData.nights - 1, 0)} nts × $${formData.additionalNightRate}):`, `Noches adicionales (${formData.travelers} viajeros × ${Math.max(formData.nights - 1, 0)} nts × $${formData.additionalNightRate}):`)}</span>
                    <span>${(formData.travelers * Math.max(formData.nights - 1, 0) * formData.additionalNightRate).toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between font-semibold text-[#0e3b2f] border-t border-[#d8caac] pt-1.5">
                    <span>{tr('Base Package Total:', 'Total del paquete base:')}</span>
                    <span>${((formData.travelers * formData.firstNightRate) + (formData.travelers * Math.max(formData.nights - 1, 0) * formData.additionalNightRate)).toFixed(2)} USD</span>
                  </div>
                  {formData.lineItems && formData.lineItems.length > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>{tr(`Optional Extras (${formData.lineItems.length} item${formData.lineItems.length !== 1 ? 's' : ''}):`, `Servicios opcionales (${formData.lineItems.length} item${formData.lineItems.length !== 1 ? 's' : ''}):`)}</span>
                      <span>+${formData.lineItems.reduce((acc, it) => acc + (it.total || 0), 0).toFixed(2)} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-[#0e3b2f] border-t border-[#cfc7b2] pt-1.5">
                    <span>{tr('Combined Subtotal:', 'Subtotal combinado:')}</span>
                    <span>${formData.subtotal.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Optional Add-On Extras & Services Card */}
              <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0eae0] pb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                      <Plus className="w-4 h-4 text-[#c9a96e]" />
                      <span>{tr('Optional Add-On Extras & Services', 'Servicios y extras opcionales adicionales')}</span>
                    </h3>
                    <p className="text-xs text-[#687785]">
                      {tr('Add optional chargeable extras (e.g. Afternoon Departure w/ lunch, Seasonal Lobster Upgrade, Suburban Transfer, Cultural Tour). These are itemized and summed into the quotation subtotal.', 'Agregue extras facturables opcionales (p. ej. salida por la tarde con almuerzo, mejora de langosta de temporada, traslado suburbano, tour cultural). Estos se detallan y suman en el subtotal de la cotización.')}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
                    <span>{tr('Add Optional Extra', 'Agregar servicio opcional')}</span>
                  </button>
                </div>

                {formData.lineItems.length === 0 ? (
                  <div className="p-4 rounded border border-dashed border-[#cfc7b2] text-center text-xs text-[#687785] bg-[#faf8f5]">
                    {tr('No optional extras added. Base package includes all standard services. Click “Add Optional Extra” above to add chargeable extras.', 'No se agregaron servicios opcionales. El paquete base incluye todos los servicios estándar. Haga clic en “Agregar servicio opcional” arriba para añadir extras facturables.')}
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[#e5dec9] rounded">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase border-b border-[#e5dec9]">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold w-8 text-center">#</th>
                          <th className="py-2.5 px-3 font-semibold">{tr('Description', 'Descripción')}</th>
                          <th className="py-2.5 px-3 font-semibold w-48">{tr('Pricing Basis', 'Base de tarificación')}</th>
                          <th className="py-2.5 px-3 font-semibold w-20 text-center">{tr('Qty', 'Cant.')}</th>
                          <th className="py-2.5 px-3 font-semibold w-28 text-right">{tr('Unit Price ($)', 'Precio unitario ($)')}</th>
                          <th className="py-2.5 px-3 font-semibold w-32 text-right">{tr('Total ($)', 'Total ($)')}</th>
                          <th className="py-2.5 px-3 font-semibold w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eee7d8]">
                        {formData.lineItems.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-[#faf8f5]">
                            <td className="py-3 px-3 text-center text-[#687785] font-mono">{index + 1}</td>
                            <td className="py-3 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                                placeholder={tr('e.g. Afternoon departure w/ lunch, Lobster upgrade...', 'p. ej. Salida por la tarde c/ almuerzo, mejora de langosta...')}
                                className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white"
                              />
                              <span className="block text-[10px] text-[#687785] mt-1 font-mono">
                                {getPricingBasisExplanation(item)}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <select
                                value={item.pricingBasis}
                                onChange={(e) => handleLineItemChange(index, 'pricingBasis', e.target.value)}
                                className="w-full px-2 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium text-[#0e3b2f]"
                              >
                                <option value="per_person_total">{tr('Per person for entire stay', 'Por persona para toda la estancia')}</option>
                                <option value="per_person_night">{tr('Per person per night', 'Por persona por noche')}</option>
                                <option value="per_cabin_night">{tr('Per cabin per night', 'Por cabaña por noche')}</option>
                                <option value="per_booking">{tr('Per booking', 'Por reserva')}</option>
                                <option value="per_vehicle">{tr('Per vehicle', 'Por vehículo')}</option>
                                <option value="custom">{tr('Custom quantity', 'Cantidad personalizada')}</option>
                              </select>

                              {item.pricingBasis === 'per_vehicle' && (
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-[10px] text-[#52606d]">{tr('Vehicles:', 'Vehículos:')}</span>
                                  <NumericInput
                                    min={1}
                                    value={item.vehicleCount || 1}
                                    onChange={(val) => handleLineItemChange(index, 'vehicleCount', val)}
                                    className="w-16 px-1.5 py-0.5 border border-[#cfc7b2] rounded text-xs text-center"
                                  />
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <NumericInput
                                min={0}
                                disabled={item.pricingBasis !== 'custom'}
                                value={item.quantity}
                                onChange={(val) => handleLineItemChange(index, 'quantity', val)}
                                className={`w-full text-center px-1.5 py-1.5 border rounded text-xs font-mono font-semibold ${
                                  item.pricingBasis === 'custom'
                                    ? 'border-[#cfc7b2] bg-white'
                                    : 'border-[#e2dac6] bg-[#f2edd8] text-[#0e3b2f]'
                                }`}
                              />
                            </td>

                            <td className="py-3 px-3 text-right">
                              <NumericInput
                                min={0}
                                value={item.unitPrice}
                                onChange={(val) => handleLineItemChange(index, 'unitPrice', val)}
                                className="w-full text-right px-2 py-1.5 border border-[#cfc7b2] rounded text-xs font-mono"
                              />
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                              ${item.total.toFixed(2)}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(index)}
                                className="p-1 text-[#a84444] hover:bg-[#fcebeb] rounded cursor-pointer"
                                title={tr('Remove item', 'Eliminar concepto')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mode B: Single Total Package Price */}
          {formData.pricingMode === 'single_total' && (
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
                <DollarSign className="w-4 h-4 text-[#c9a96e]" />
                <span>{tr('Single Total Package Price', 'Precio total único del paquete')}</span>
              </h3>
              <div className="max-w-md space-y-2 text-xs">
                <label className="block text-[#52606d] font-medium">{tr('Complete Package Price (USD)', 'Precio completo del paquete (USD)')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a98a5] font-mono">$</span>
                  <NumericInput
                    min={0}
                    value={formData.totalPackagePrice}
                    onChange={(val) => setFormData({ ...formData, totalPackagePrice: val })}
                    className="w-full pl-7 pr-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white font-mono text-sm font-semibold text-[#0e3b2f]"
                  />
                </div>
                <p className="text-[11px] text-[#687785]">
                  {tr(`This amount represents the total fixed price for the booking covering ${formData.travelers} travelers and ${formData.nights} nights stay duration.`, `Este monto representa el precio fijo total de la reserva que cubre ${formData.travelers} viajeros y ${formData.nights} noches de estancia.`)}
                </p>
              </div>
            </div>
          )}

          {/* Mode C: Custom Itemized Services */}
          {formData.pricingMode === 'custom_itemized' && (
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#f0eae0] pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#c9a96e]" />
                    <span>{tr('Itemized Pricing Breakdown with Pricing Basis', 'Desglose de precios detallado con base de tarificación')}</span>
                  </h3>
                  <p className="text-xs text-[#687785]">
                    {tr('Select the pricing basis for each item. Quantities and line totals calculate automatically based on trip parameters.', 'Seleccione la base de tarificación para cada concepto. Las cantidades y los totales de línea se calculan automáticamente según los parámetros del viaje.')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
                  <span>{tr('Add Item Row', 'Agregar concepto')}</span>
                </button>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto border border-[#e5dec9] rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase border-b border-[#e5dec9]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-8 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">{tr('Description', 'Descripción')}</th>
                      <th className="py-2.5 px-3 font-semibold w-48">{tr('Pricing Basis', 'Base de tarificación')}</th>
                      <th className="py-2.5 px-3 font-semibold w-20 text-center">{tr('Qty', 'Cant.')}</th>
                      <th className="py-2.5 px-3 font-semibold w-28 text-right">{tr('Unit Price ($)', 'Precio unitario ($)')}</th>
                      <th className="py-2.5 px-3 font-semibold w-32 text-right">{tr('Total ($)', 'Total ($)')}</th>
                      <th className="py-2.5 px-3 font-semibold w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee7d8]">
                    {formData.lineItems.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-[#faf8f5]">
                        <td className="py-3 px-3 text-center text-[#687785] font-mono">{index + 1}</td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            placeholder={tr('Item description...', 'Descripción del concepto...')}
                            className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white"
                          />
                          <span className="block text-[10px] text-[#687785] mt-1 font-mono">
                            {getPricingBasisExplanation(item)}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={item.pricingBasis}
                            onChange={(e) => handleLineItemChange(index, 'pricingBasis', e.target.value)}
                            className="w-full px-2 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium text-[#0e3b2f]"
                          >
                            <option value="per_person_total">{tr('Per person for entire stay', 'Por persona para toda la estancia')}</option>
                            <option value="per_person_night">{tr('Per person per night', 'Por persona por noche')}</option>
                            <option value="per_cabin_night">{tr('Per cabin per night', 'Por cabaña por noche')}</option>
                            <option value="per_booking">{tr('Per booking', 'Por reserva')}</option>
                            <option value="per_vehicle">{tr('Per vehicle', 'Por vehículo')}</option>
                            <option value="custom">{tr('Custom quantity', 'Cantidad personalizada')}</option>
                          </select>

                          {item.pricingBasis === 'per_vehicle' && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-[#52606d]">{tr('Vehicles:', 'Vehículos:')}</span>
                              <NumericInput
                                min={1}
                                value={item.vehicleCount || 1}
                                onChange={(val) => handleLineItemChange(index, 'vehicleCount', val)}
                                className="w-16 px-1.5 py-0.5 border border-[#cfc7b2] rounded text-xs text-center"
                              />
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <NumericInput
                            min={0}
                            disabled={item.pricingBasis !== 'custom'}
                            value={item.quantity}
                            onChange={(val) => handleLineItemChange(index, 'quantity', val)}
                            className={`w-full text-center px-1.5 py-1.5 border rounded text-xs font-mono font-semibold ${
                              item.pricingBasis === 'custom'
                                ? 'border-[#cfc7b2] bg-white'
                                : 'border-[#e2dac6] bg-[#f2edd8] text-[#0e3b2f]'
                            }`}
                          />
                        </td>

                        <td className="py-3 px-3 text-right">
                          <NumericInput
                            min={0}
                            value={item.unitPrice}
                            onChange={(val) => handleLineItemChange(index, 'unitPrice', val)}
                            className="w-full text-right px-2 py-1.5 border border-[#cfc7b2] rounded text-xs font-mono"
                          />
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                          ${item.total.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(index)}
                            className="p-1 text-[#a84444] hover:bg-[#fcebeb] rounded"
                            title={tr('Remove item', 'Eliminar concepto')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tax & Grand Totals Box */}
          <div className="bg-[#faf8f5] p-5 rounded-lg border border-[#e5dec9] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5dec9] pb-4">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableTax}
                  onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                  className="rounded text-[#0e3b2f] focus:ring-[#0e3b2f]"
                />
                <span className="text-xs font-semibold text-[#0e3b2f]">
                  {tr(`Enable Territory & Service Tax (${formData.taxPercent || 7}%)`, `Habilitar impuesto territorial y de servicio (${formData.taxPercent || 7}%)`)}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52606d]">{tr('Tax Percentage (%):', 'Porcentaje de impuesto (%):')}</span>
                <NumericInput
                  min={0}
                  value={formData.taxPercent}
                  onChange={(val) => setFormData({ ...formData, taxPercent: val })}
                  className="w-20 px-2 py-1 border border-[#cfc7b2] rounded text-xs font-mono text-center bg-white"
                />
              </div>
            </div>

            <div className="space-y-2 max-w-sm ml-auto text-xs font-mono">
              <div className="flex justify-between text-[#52606d]">
                <span>{tr('Package Subtotal:', 'Subtotal del paquete:')}</span>
                <span>${formData.subtotal.toFixed(2)} USD</span>
              </div>

              {formData.enableTax && (
                <div className="flex justify-between text-[#805e24]">
                  <span>{tr(`Territory & Service Tax (${formData.taxPercent}%):`, `Impuesto territorial y de servicio (${formData.taxPercent}%):`)}</span>
                  <span>+${formData.taxAmount.toFixed(2)} USD</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#0e3b2f] border-t border-[#cfc7b2] pt-2 mt-1">
                <span>{tr('Total USD:', 'Total USD:')}</span>
                <span>${formData.total.toFixed(2)} USD</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB 4: CONDITIONS & TERMS */}
      {activeTab === 'conditions' && (
        <div className="space-y-6">
          {/* Terms Status & Approval Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eae0] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr('Terms Status & Business Approval', 'Estado de términos y aprobación comercial')}</span>
                </h3>
                <p className="text-xs text-[#687785] mt-0.5">
                  {tr('“Approved by Petra” confirms terms approval for business use. It does not imply legal review.', '“Aprobado por Petra” confirma la aprobación de los términos para uso comercial. No implica revisión legal.')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleResetConditionsToPending}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-medium transition-colors"
                >
                  {tr('Reset Conditions to Pending', 'Restablecer condiciones a pendiente')}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#52606d] font-medium">{tr('Terms Status:', 'Estado de términos:')}</span>
                  <select
                    value={formData.termsStatus}
                    onChange={(e) => setFormData({ ...formData, termsStatus: e.target.value as any })}
                    className={`px-3 py-1.5 text-xs font-bold rounded border ${
                      formData.termsStatus === 'Approved by Petra'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <option value="Draft">{tr('Draft (Unapproved Terms)', 'Borrador (Términos no aprobados)')}</option>
                    <option value="Approved by Petra">{tr('Approved by Petra', 'Aprobado por Petra')}</option>
                  </select>
                </div>
              </div>
            </div>

            {formData.termsStatus === 'Draft' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-900">
                <strong>{tr('Note:', 'Nota:')}</strong> {tr('While Terms Status is "Draft", this quotation cannot be saved as "Ready for review". Please review and approve the terms above when ready.', 'Mientras el estado de los términos sea "Borrador", esta cotización no se puede guardar como "Lista para revisión". Revise y apruebe los términos arriba cuando esté listo.')}
              </div>
            )}
          </div>

          {/* Inclusions & Exclusions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inclusions */}
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
                <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{tr('Package Inclusions List', 'Lista de inclusiones del paquete')}</span>
                </h3>
                <button
                  onClick={() => handleAddArrayItem('inclusions')}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0e3b2f] font-medium hover:underline"
                >
                  <Plus className="w-3 h-3" /> {tr('Add Inclusion', 'Agregar inclusión')}
                </button>
              </div>

              <div className="space-y-2">
                {formData.inclusions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold text-xs shrink-0">✓</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayItemChange('inclusions', idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                    />
                    <button
                      onClick={() => handleRemoveArrayItem('inclusions', idx)}
                      className="p-1 text-[#a84444] hover:bg-[#fcebeb] rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusions */}
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
                <h3 className="text-sm font-semibold text-[#802424] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#a84444]" />
                  <span>{tr('Package Exclusions List', 'Lista de exclusiones del paquete')}</span>
                </h3>
                <button
                  onClick={() => handleAddArrayItem('exclusions')}
                  className="inline-flex items-center gap-1 text-[11px] text-[#802424] font-medium hover:underline"
                >
                  <Plus className="w-3 h-3" /> {tr('Add Exclusion', 'Agregar exclusión')}
                </button>
              </div>

              <div className="space-y-2">
                {formData.exclusions.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-[#a84444] font-bold text-xs shrink-0">✕</span>
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleArrayItemChange('exclusions', idx, e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                    />
                    <button
                      onClick={() => handleRemoveArrayItem('exclusions', idx)}
                      className="p-1 text-[#a84444] hover:bg-[#fcebeb] rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Conditions & Seasonal Notes */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <FileText className="w-4 h-4 text-[#c9a96e]" />
              <span>{tr('Customer Booking Terms & Conditions', 'Términos y condiciones de reserva del cliente')}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Payment Schedule', 'Calendario de pagos')}</label>
                <textarea
                  rows={2}
                  value={formData.paymentSchedule}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, paymentSchedule: e.target.value });
                  }}
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Deposit Requirement', 'Requisito de depósito')}</label>
                <textarea
                  rows={2}
                  value={formData.depositRequirement}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, depositRequirement: e.target.value });
                  }}
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Cancellation Terms', 'Condiciones de cancelación')}</label>
                <textarea
                  rows={2}
                  value={formData.cancellationTerms}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, cancellationTerms: e.target.value });
                  }}
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Weather & Logistics Note', 'Nota de clima y logística')}</label>
                <textarea
                  rows={2}
                  value={formData.weatherLogisticsNote}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, weatherLogisticsNote: e.target.value });
                  }}
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">{tr('Seasonal / Special Conditions', 'Condiciones estacionales / especiales')}</label>
                <textarea
                  rows={2}
                  value={formData.seasonalConditions}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, seasonalConditions: e.target.value });
                  }}
                  placeholder={tr('e.g. Dry trade wind season weather notice...', 'p. ej. Aviso meteorológico de temporada de vientos alisios...')}
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div className="bg-[#fffdfa] p-3 rounded border border-amber-200">
                <label className="block text-amber-900 font-semibold mb-1">
                  {tr('Internal Supplier-Payment Notes (Excluded from Preview/Print)', 'Notas internas de pago a proveedores (Excluidas de vista previa/impresión)')}
                </label>
                <textarea
                  rows={2}
                  value={formData.supplierPaymentNotes}
                  onChange={(e) => setFormData({ ...formData, supplierPaymentNotes: e.target.value })}
                  placeholder={tr('Internal notes regarding payments to island hosts or drivers...', 'Notas internas sobre pagos a anfitriones de la isla o conductores...')}
                  className="w-full p-2 border border-amber-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PHOTOS & MEDIA */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
          {/* Selected Photos Order & Captions */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eae0] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#c9a96e]" />
                  <span>{tr(`Selected Photos (${formData.selectedPhotos.length}) — Reorder & Edit Captions`, `Fotos seleccionadas (${formData.selectedPhotos.length}) — Reordenar y editar leyendas`)}</span>
                </h3>
                <p className="text-xs text-[#687785] mt-0.5">
                  {tr('Photos appear in this exact order on customer previews and printed PDFs.', 'Las fotos aparecen en este orden exacto en las vistas previas de los clientes y en los PDF impresos.')}
                </p>
              </div>

              {/* Local Temporary Upload Button */}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded cursor-pointer transition-colors shadow-sm self-start sm:self-auto">
                <Upload className="w-3.5 h-3.5 text-[#c9a96e]" />
                <span>{tr('Temporary Local Upload', 'Carga local temporal')}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[11px] text-[#687785] italic">
              {tr('Note: Temporary uploaded images are kept in browser memory for previewing during this session and are not stored in permanent cloud storage.', 'Nota: Las imágenes temporales cargadas se mantienen en la memoria del navegador para previsualizar durante esta sesión y no se almacenan en el almacenamiento en la nube permanente.')}
            </p>

            {/* Selected Photos List */}
            {formData.selectedPhotos.length === 0 ? (
              <div className="p-8 text-center text-[#687785] border border-dashed border-[#cfc7b2] rounded">
                {tr('No photos selected yet. Select photos from the gallery below or upload a temporary photo.', 'No hay fotos seleccionadas aún. Seleccione fotos de la galería de abajo o cargue una foto temporal.')}
              </div>
            ) : (
              <div className="space-y-3">
                {formData.selectedPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="p-3 bg-[#faf8f5] border border-[#e2d8c3] rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    {/* Thumbnail */}
                    <div className="w-24 h-16 shrink-0 bg-[#e8e2d5] rounded overflow-hidden relative">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                        onError={(e: any) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.parentNode.innerHTML = '<div class="p-1 text-[9px] text-center text-red-600">Temporary upload unavailable. Please re-upload image.</div>';
                        }}
                      />
                    </div>

                    {/* Meta & Editable Caption */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs text-[#1c242c]">{photo.title}</span>

                        {/* Verification Status Control */}
                        <select
                          value={photo.verificationStatus}
                          onChange={(e) => handleUpdatePhotoVerification(photo.id, e.target.value)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border focus:outline-none ${
                            photo.verificationStatus === 'Confirmed by Petra'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-amber-50 text-amber-900 border-amber-300'
                          }`}
                        >
                          <option value="Unverified demo">{tr('Unverified Photo', 'Foto no verificada')}</option>
                          <option value="Confirmed by Petra">{tr('Confirmed by Petra (Verified)', 'Confirmado por Petra (Verificado)')}</option>
                        </select>

                        {photo.isTemporaryUpload && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono">
                            {tr('Admin Note: Temporary Browser Upload', 'Nota de admin: Carga temporal del navegador')}
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                        placeholder={tr('Caption for customer quotation...', 'Leyenda para la cotización del cliente...')}
                        className="w-full px-2.5 py-1 border border-[#cfc7b2] rounded text-xs bg-white"
                      />
                    </div>

                    {/* Reorder & Remove Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleMovePhoto(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-[#52606d] hover:bg-[#e6dece] rounded disabled:opacity-30"
                        title={tr('Move Up', 'Mover arriba')}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePhoto(index, 'down')}
                        disabled={index === formData.selectedPhotos.length - 1}
                        className="p-1.5 text-[#52606d] hover:bg-[#e6dece] rounded disabled:opacity-30"
                        title={tr('Move Down', 'Mover abajo')}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePhotoSelect(photo)}
                        className="p-1.5 text-[#a84444] hover:bg-[#fcebeb] rounded"
                        title={tr('Deselect photo', 'Deseleccionar foto')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample Destination Photo Library */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eae0] pb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0e3b2f]">
                  {tr('Destination Asset Library', 'Biblioteca de recursos de destino')}
                </h3>
                <p className="text-xs text-[#687785]">
                  {tr("Select or deselect images to include in this quotation's showcase.", 'Seleccione o deseleccione imágenes para incluir en la galería de esta cotización.')}
                </p>
              </div>

              {/* Destination Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52606d]">{tr('Filter by Destination:', 'Filtrar por destino:')}</span>
                <select
                  value={photoIslandFilter}
                  onChange={(e) => setPhotoIslandFilter(e.target.value)}
                  className="text-xs border border-[#cfc7b2] rounded px-2.5 py-1 bg-white"
                >
                  <option value="All">{tr('All Destinations', 'Todos los destinos')}</option>
                  <option value="Isla Chichime">Isla Chichime</option>
                  <option value="Isla Chichime Chico">Isla Chichime Chico</option>
                  <option value="Cayos Limón">Cayos Limón</option>
                  <option value="Sailing / Catamaran">Sailing / Catamaran</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_DESTINATION_PHOTOS.filter(
                (p) => photoIslandFilter === 'All' || p.island === photoIslandFilter
              ).map((photo) => {
                const isSelected = formData.selectedPhotos.some((p) => p.id === photo.id);
                return (
                  <div
                    key={photo.id}
                    onClick={() => handleTogglePhotoSelect(photo)}
                    className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#0e3b2f] ring-2 ring-[#0e3b2f]/30 bg-[#f4f8f6]'
                        : 'border-[#cfc7b2] opacity-80 hover:opacity-100 hover:border-[#809689]'
                    }`}
                  >
                    <div className="h-36 relative bg-[#e8e2d5]">
                      <img
                        src={photo.url}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-[#0e3b2f] text-white shadow-md'
                              : 'bg-white/80 text-gray-500 border border-gray-300'
                          }`}
                        >
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-amber-200 px-2 py-0.5 rounded">
                        {photo.verificationStatus}
                      </span>
                    </div>

                    <div className="p-3 space-y-1">
                      <h4 className="text-xs font-semibold text-[#1c242c]">{photo.title}</h4>
                      <p className="text-[11px] text-[#687785] line-clamp-2 leading-relaxed">
                        {photo.caption}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset Conditions Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e5dec9] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#f0eae0] pb-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0e3b2f]">{tr('Reset quotation conditions?', '¿Restablecer las condiciones de la cotización?')}</h3>
                <p className="text-xs text-[#687785]">{tr('Confirm reset of customer-facing terms', 'Confirmar restablecimiento de términos orientados al cliente')}</p>
              </div>
            </div>

            <p className="text-xs text-[#45525f] leading-relaxed">
              {tr('Replace customer-facing conditions with ‘Pending Petra’s confirmation’. Other quotation details will remain unchanged.', 'Reemplazar las condiciones orientadas al cliente con “Pendiente de confirmación de Petra”. Los demás detalles de la cotización permanecerán sin cambios.')}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f0eae0]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#52606d] bg-[#f0eae0] hover:bg-[#e6dece] rounded transition-colors"
              >
                {tr('Cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                onClick={handleConfirmResetConditions}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-sm"
              >
                {tr('Confirm Reset', 'Confirmar restablecimiento')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Revision Confirmation Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e5dec9] space-y-4 text-left">
            <div className="flex items-center gap-3 text-[#0e3b2f]">
              <GitBranch className="w-6 h-6 text-[#c9a96e] shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-[#1c242c]">
                  {tr('Create Proposal Revision', 'Crear revisión de propuesta')}
                </h3>
                <p className="text-xs text-[#52606d]">
                  {tr('Generate a separate, persistent revision record for this proposal.', 'Generar un registro de revisión independiente y persistente para esta propuesta.')}
                </p>
              </div>
            </div>

            <div className="bg-[#faf8f5] p-3 rounded border border-[#e0d6c1] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#687785]">{tr('Base Reference:', 'Referencia base:')}</span>
                <span className="font-mono font-semibold text-[#1c242c]">{formData.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687785]">{tr('New Revision Reference:', 'Nueva referencia de revisión:')}</span>
                <span className="font-mono font-bold text-[#0e3b2f] text-sm">{nextRevRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687785]">{tr('Customer:', 'Cliente:')}</span>
                <span className="font-semibold text-[#1c242c]">{formData.customerName || tr('Unnamed Customer', 'Cliente sin nombre')}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1c242c]">
                {tr('Revision Note / Summary of Changes (Optional)', 'Nota de revisión / Resumen de cambios (Opcional)')}
              </label>
              <textarea
                value={revisionNoteInput}
                onChange={(e) => setRevisionNoteInput(e.target.value)}
                placeholder={tr('e.g. Switched to private 4x4, upgraded cabaña to beachfront, and added Cayos Limón excursion.', 'p. ej. Cambio a 4x4 privado, mejora de cabaña a frente de playa y excursión a Cayos Limón.')}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-[#cfc7b2] rounded focus:outline-none focus:ring-1 focus:ring-[#0e3b2f] focus:border-[#0e3b2f] bg-white text-[#1c242c]"
              />
            </div>

            <p className="text-[11px] text-[#687785] leading-relaxed">
              {tr(`The original proposal (${formData.reference}) will remain completely unchanged in Supabase.`, `La propuesta original (${formData.reference}) permanecerá completamente intacta en Supabase.`)}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingRevision}
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#52606d] hover:bg-[#f0eae0] rounded transition-colors disabled:opacity-50"
              >
                {tr('Cancel', 'Cancelar')}
              </button>
              <button
                type="button"
                disabled={isSubmittingRevision}
                onClick={async () => {
                  if (onCreateRevision) {
                    setIsSubmittingRevision(true);
                    try {
                      await onCreateRevision(formData, revisionNoteInput.trim());
                      setIsRevisionModalOpen(false);
                    } catch (err: any) {
                      console.error('Revision creation error:', err);
                    } finally {
                      setIsSubmittingRevision(false);
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white rounded transition-colors shadow-sm cursor-pointer"
              >
                {isSubmittingRevision ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a96e]" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5 text-[#c9a96e]" />
                )}
                <span>{isSubmittingRevision ? tr('Creating…', 'Creando…') : tr(`Confirm Create Revision ${nextRevRef}`, `Confirmar creación de revisión ${nextRevRef}`)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

