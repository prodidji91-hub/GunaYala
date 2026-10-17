import React, { useState, useEffect } from 'react';
import {
  Quotation,
  LineItem,
  PricingBasis,
  TransportOption,
  AttachedPhoto,
  StructuredPackageSnapshot,
} from '../../types/quotation';
import { PACKAGE_TEMPLATES } from '../../data/packageTemplates';
import { SAMPLE_DESTINATION_PHOTOS, DEMO_PHOTO_UNVERIFIED_LABEL } from '../../data/samplePhotos';
import { calculateLineQuantity, getOutdatedFieldsInfo } from '../../services/quotationStorageService';
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
} from 'lucide-react';

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
  onSave: (updatedQuotation: Quotation) => Promise<Quotation | void> | void;
  onPreview: (quotation: Quotation) => void;
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

export const QuotationEditor: React.FC<QuotationEditorProps> = ({
  initialQuotation,
  onSave,
  onPreview,
  onCancel,
}) => {
  const [formData, setFormData] = useState<Quotation>(initialQuotation);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'trip' | 'package' | 'pricing' | 'conditions' | 'photos'>('trip');
  const [photoIslandFilter, setPhotoIslandFilter] = useState<string>('All');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const initialParsedPhone = parseCustomerPhone(initialQuotation.customerPhone);
  const [countryCode, setCountryCode] = useState<string>(initialParsedPhone.code);
  const [phoneNumber, setPhoneNumber] = useState<string>(initialParsedPhone.number);
  const [countrySearch, setCountrySearch] = useState<string>('');

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

  // Recalculate pricing totals based on pricingMode
  useEffect(() => {
    let subtotal = 0;
    if (formData.pricingMode === 'first_night_additional') {
      const firstNightTotal = formData.travelers * (formData.firstNightRate || 0);
      const additionalNightsCount = Math.max(formData.nights - 1, 0);
      const additionalNightsTotal = formData.travelers * additionalNightsCount * (formData.additionalNightRate || 0);
      subtotal = Math.round((firstNightTotal + additionalNightsTotal) * 100) / 100;
    } else if (formData.pricingMode === 'single_total') {
      subtotal = Math.round((formData.totalPackagePrice || 0) * 100) / 100;
    } else {
      subtotal = Math.round(formData.lineItems.reduce((acc, item) => acc + item.total, 0) * 100) / 100;
    }

    const taxAmt = formData.enableTax ? Math.round((subtotal * (formData.taxPercent || 7) / 100) * 100) / 100 : 0;
    const total = Math.round((subtotal + taxAmt) * 100) / 100;

    setFormData((prev) => {
      if (
        prev.subtotal === subtotal &&
        prev.taxAmount === taxAmt &&
        prev.total === total
      ) {
        return prev;
      }
      return {
        ...prev,
        subtotal,
        taxAmount: taxAmt,
        enableAdditionalCharge: formData.enableTax,
        additionalChargeLabel: 'Territory & Service Tax',
        additionalChargePercent: formData.taxPercent,
        additionalChargeAmount: taxAmt,
        total,
      };
    });
  }, [
    formData.pricingMode,
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
  const handleApplyPackageTemplate = (templateId: string) => {
    const template = PACKAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    if (
      window.confirm(
        `Apply "${template.name}"? This will populate package details, inclusions, exclusions, and line items without overwriting customer contact info or travel dates.`
      )
    ) {
      const isPackagePricing = template.pricingMode === 'first_night_additional' || template.pricingMode === 'single_total';
      const newLineItems: LineItem[] = isPackagePricing
        ? []
        : template.lineItems.map((item, idx) => {
            const qty = calculateLineQuantity(
              item.pricingBasis,
              formData.travelers,
              formData.nights,
              formData.cabinsCount,
              item.vehicleCount || 1,
              1
            );
            return {
              id: `item-${Date.now()}-${idx}`,
              description: item.description,
              pricingBasis: item.pricingBasis,
              quantity: qty,
              unitPrice: item.unitPrice,
              total: qty * item.unitPrice,
              vehicleCount: item.vehicleCount || 1,
            };
          });

      // Filter default photos
      const defaultPhotos = SAMPLE_DESTINATION_PHOTOS.filter((p) =>
        template.defaultPhotoIds.includes(p.id)
      );

      setFormData((prev) => ({
        ...prev,
        island: template.island,
        cabinCategory: template.cabinCategory,
        bathroomType: template.bathroomType,
        groundTransportation: template.groundTransportation,
        boatTransfers: template.boatTransfers,
        pricingMode: template.pricingMode || 'custom_itemized',
        firstNightRate: template.firstNightRate ?? prev.firstNightRate ?? 0,
        additionalNightRate: template.additionalNightRate ?? prev.additionalNightRate ?? 0,
        totalPackagePrice: template.totalPackagePrice ?? prev.totalPackagePrice ?? 0,
        enableTax: template.enableTax ?? prev.enableTax ?? true,
        taxPercent: template.taxPercent ?? prev.taxPercent ?? 7,
        transportationReviewFlag: false,
        lineItems: newLineItems,
        inclusions: [...template.inclusions],
        exclusions: [...template.exclusions],
        packageSnapshot: { ...template.packageSnapshot },
        selectedPhotos: defaultPhotos.length > 0 ? defaultPhotos : prev.selectedPhotos,
      }));
    }
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
      target.description = String(value);
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
      pricingBasis: 'per_person_total',
      quantity: formData.travelers,
      unitPrice: 50,
      total: formData.travelers * 50,
    };
    setFormData((prev) => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  };

  const handleRemoveLineItem = (index: number) => {
    if (formData.lineItems.length <= 1) {
      alert('A quotation must contain at least one line item.');
      return;
    }
    const updated = formData.lineItems.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, lineItems: updated }));
  };

  // Structured package snapshot handler
  const handleSnapshotChange = (field: keyof StructuredPackageSnapshot, value: string) => {
    setFormData((prev) => ({
      ...prev,
      packageSnapshot: {
        ...prev.packageSnapshot,
        [field]: value,
      },
    }));
  };

  // Array handlers for inclusions / exclusions
  const handleArrayItemChange = (
    listKey: 'inclusions' | 'exclusions',
    index: number,
    newValue: string
  ) => {
    const list = [...formData[listKey]];
    list[index] = newValue;
    setFormData((prev) => ({ ...prev, [listKey]: list }));
  };

  const handleAddArrayItem = (listKey: 'inclusions' | 'exclusions') => {
    const list = [...formData[listKey], 'New item specification'];
    setFormData((prev) => ({ ...prev, [listKey]: list }));
  };

  const handleRemoveArrayItem = (listKey: 'inclusions' | 'exclusions', index: number) => {
    const list = formData[listKey].filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, [listKey]: list }));
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
    const updatedDraft = {
      ...formData,
      paymentSchedule: PENDING_TEXT,
      depositRequirement: PENDING_TEXT,
      cancellationTerms: PENDING_TEXT,
      weatherLogisticsNote: PENDING_TEXT,
      seasonalConditions: PENDING_TEXT,
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
    setSaveSuccessMsg('Conditions reset to "Pending Petra’s confirmation" and status set to Draft. Click "Save Draft" to persist.');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  // Save handler with validation
  const handleSaveWithStatus = async (newStatus: Quotation['status']) => {
    setErrorMsg(null);
    setSaveSuccessMsg(null);

    // Rule: Prevent saving Ready for review if termsStatus is Draft or customer name missing
    if (newStatus === 'Ready for review') {
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

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-[#e5dec9] rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-[#52606d] hover:text-[#0e3b2f] hover:bg-[#f2ece0] rounded transition-colors"
            title="Return to Quotations List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#0e3b2f] bg-[#e4ede8] px-2 py-0.5 rounded">
                {formData.reference}
              </span>
              <span className="text-xs text-[#687785]">
                {formData.customerName ? formData.customerName : 'New Customer Quotation'}
              </span>
            </div>
            <h2 className="text-lg font-serif font-semibold text-[#1c242c] mt-0.5">
              Quotation Editor
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            <span>{isSaving ? 'Saving…' : 'Save Draft'}</span>
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
            <span>{isSaving ? 'Saving…' : 'Save & Mark Ready'}</span>
          </button>

          <button
            onClick={() => onPreview(formData)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#c9a96e] hover:bg-[#d8b87d] text-[#0e2720] font-semibold rounded transition-colors shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Customer Preview</span>
          </button>
        </div>
      </div>

      {/* Error Message Notice Banner */}
      {errorMsg && (
        <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold block text-amber-950 mb-0.5">Validation Requirement:</strong>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Outdated Sample Text Banner Notice */}
      {formData.hasOutdatedSampleTextFlag && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-950 mb-0.5">Administrator Review Required — Outdated Sample Text Detected:</strong>
              <span>
                This quotation contains legacy sample text (such as unconfirmed cancellation rules or former entrance fee descriptions). Please review and update terms, inclusions, or exclusions before finalizing.
              </span>
            </div>
          </div>

          <button
            onClick={handleResetConditionsToPending}
            className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-xs shrink-0 self-start sm:self-auto transition-colors"
          >
            Reset Conditions to Pending
          </button>
        </div>
      )}

      {/* Package Template Quick Loader Bar */}
      <div className="bg-[#f7f4ed] border border-[#d8caa8] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#c9a96e] shrink-0" />
          <div>
            <span className="text-xs font-semibold text-[#0e3b2f]">
              Package Template Selector:
            </span>
            <p className="text-[11px] text-[#687785]">
              Populates reusable package content without overwriting customer contact info or travel dates.
            </p>
          </div>
        </div>

        <select
          onChange={(e) => e.target.value && handleApplyPackageTemplate(e.target.value)}
          defaultValue=""
          className="text-xs border border-[#cfc7b2] rounded px-3 py-1.5 bg-white text-[#0e3b2f] font-medium focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
        >
          <option value="" disabled>
            -- Select Package Template --
          </option>
          {PACKAGE_TEMPLATES.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {tmpl.name}
            </option>
          ))}
        </select>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5dec9] overflow-x-auto pb-px">
        {[
          { id: 'trip', label: '1. Trip & Logistics', icon: User },
          { id: 'package', label: '2. Structured Package', icon: Layers },
          { id: 'pricing', label: '3. Pricing & Line Items', icon: DollarSign },
          { id: 'conditions', label: '4. Terms & Conditions', icon: FileText },
          { id: 'photos', label: '5. Photos & Media', icon: ImageIcon },
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
              <span>Customer Contact Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="e.g. Oliver & Emma Vance"
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Customer Email</label>
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
                  <span>WhatsApp Number</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative w-40 shrink-0">
                    <input
                      type="text"
                      placeholder="Search code..."
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
                <label className="block text-[#52606d] font-medium mb-1">Quotation Date (Fixed)</label>
                <input
                  type="date"
                  value={formData.quotationDate}
                  onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Quotation Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Quotation Language</label>
                <input
                  type="text"
                  disabled
                  value="English"
                  className="w-full px-3 py-2 border border-[#e2dac6] rounded text-xs bg-[#f2edd8] text-[#52606d] font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Trip Logistics & Accommodation Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <Calendar className="w-4 h-4 text-[#c9a96e]" />
              <span>Trip Logistics & Accommodation Parameters</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">Arrival Date</label>
                <input
                  type="date"
                  value={formData.arrivalDate}
                  onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Departure Date</label>
                <input
                  type="date"
                  value={formData.departureDate}
                  onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Nights (Auto-calculated)</label>
                <NumericInput
                  min={0}
                  value={formData.nights}
                  onChange={(val) => setFormData({ ...formData, nights: val })}
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] font-semibold text-[#0e3b2f]"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Number of Travelers</label>
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
                <label className="block text-[#52606d] font-medium mb-1">Island / Destination</label>
                <input
                  type="text"
                  value={formData.island}
                  onChange={(e) => setFormData({ ...formData, island: e.target.value })}
                  placeholder="e.g. Isla Chichime, Isla Chichime Chico"
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Experience / Package Title</label>
                <input
                  type="text"
                  value={formData.experience || ''}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="e.g. Island Overnight Experience"
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">Cabin Category</label>
                <input
                  type="text"
                  value={formData.cabinCategory}
                  onChange={(e) => setFormData({ ...formData, cabinCategory: e.target.value })}
                  placeholder="e.g. Beach Cabin"
                  className="w-full px-3 py-2 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#52606d] font-medium mb-1">Number of Cabins</label>
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
                <label className="block text-[#52606d] font-semibold mb-1.5">Bathroom Facilities</label>
                <select
                  value={formData.bathroomType}
                  onChange={(e) =>
                    setFormData({ ...formData, bathroomType: e.target.value as 'Shared' | 'Private' })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Private">Private Bathroom</option>
                  <option value="Shared">Shared Bathroom</option>
                </select>
              </div>

              {/* Ground Transportation */}
              <div className="bg-[#faf8f5] p-3 rounded border border-[#e2d8c3]">
                <label className="block text-[#52606d] font-semibold mb-1.5">Ground Transportation (4x4)</label>
                <select
                  value={formData.groundTransportation}
                  onChange={(e) =>
                    setFormData({ ...formData, groundTransportation: e.target.value as TransportOption })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Shared">Shared 4x4 Transfer</option>
                  <option value="Private">Private Exclusive 4x4 SUV</option>
                  <option value="Not included">Not included</option>
                  <option value="Review required">Review required</option>
                </select>
              </div>

              {/* Boat Transfers */}
              <div className="bg-[#faf8f5] p-3 rounded border border-[#e2d8c3]">
                <label className="block text-[#52606d] font-semibold mb-1.5">Boat Transfers (Water Taxi)</label>
                <select
                  value={formData.boatTransfers}
                  onChange={(e) =>
                    setFormData({ ...formData, boatTransfers: e.target.value as TransportOption })
                  }
                  className="w-full px-2.5 py-1.5 border border-[#cfc7b2] rounded text-xs bg-white font-medium"
                >
                  <option value="Shared">Shared Water Taxi Boat</option>
                  <option value="Private">Private Exclusive Boat</option>
                  <option value="Not included">Not included</option>
                  <option value="Review required">Review required</option>
                </select>
              </div>
            </div>

            {formData.transportationReviewFlag && (
              <div className="bg-amber-50 text-amber-900 border border-amber-300 p-3 rounded text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Review Required:</strong> This quotation contains an ambiguous legacy transportation value. Please select specific settings for Ground Transport and Boat Transfers above.
                </span>
              </div>
            )}
          </div>

          {/* Internal Notes Card */}
          <div className="bg-[#fffdfa] p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#f0eae0] pb-2">
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Internal Administrator Notes</span>
              </h3>
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                Internal Only — Excluded from Customer View
              </span>
            </div>

            <textarea
              rows={3}
              value={formData.internalNotes}
              onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
              placeholder="e.g. Special anniversary request, dietary allergies, captain notes..."
              className="w-full p-3 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5] focus:bg-white"
            />
          </div>
        </div>
      )}

      {/* TAB 2: STRUCTURED PACKAGE DETAILS */}
      {activeTab === 'package' && (
        <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <Layers className="w-4 h-4 text-[#c9a96e]" />
              <span>Structured Package Information & Travel Details</span>
            </h3>
            <p className="text-xs text-[#687785] mt-1">
              These details are saved directly inside the quotation snapshot as clean readable text.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Experience Overview</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.overview}
                onChange={(e) => handleSnapshotChange('overview', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Accommodation & Bathroom Details</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.accommodationDetails}
                onChange={(e) => handleSnapshotChange('accommodationDetails', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Meals by Day</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.mealsByDay}
                onChange={(e) => handleSnapshotChange('mealsByDay', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Ground Transportation Details</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.groundTransportationDetails}
                onChange={(e) => handleSnapshotChange('groundTransportationDetails', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Boat Transfer Details</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.boatTransferDetails}
                onChange={(e) => handleSnapshotChange('boatTransferDetails', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Included Tours & Activities</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.toursAndActivities}
                onChange={(e) => handleSnapshotChange('toursAndActivities', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Other Inclusions</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.otherInclusions}
                onChange={(e) => handleSnapshotChange('otherInclusions', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Optional Extras</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.optionalExtras}
                onChange={(e) => handleSnapshotChange('optionalExtras', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Exclusions</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.exclusions}
                onChange={(e) => handleSnapshotChange('exclusions', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div>
              <label className="block text-[#0e3b2f] font-semibold mb-1">Island Arrival & Departure Schedule</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.islandSchedule}
                onChange={(e) => handleSnapshotChange('islandSchedule', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[#0e3b2f] font-semibold mb-1">Important Travel Instructions</label>
              <textarea
                rows={3}
                value={formData.packageSnapshot.importantInstructions}
                onChange={(e) => handleSnapshotChange('importantInstructions', e.target.value)}
                className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING & LINE ITEMS */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Quotation Pricing Method Selector Card */}
          <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
              <DollarSign className="w-4 h-4 text-[#c9a96e]" />
              <span>Quotation Pricing Method</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'first_night_additional', label: 'A. First Night + Additional Nights', desc: 'Per person rates for first night & additional nights' },
                { id: 'single_total', label: 'B. Single Total Package Price', desc: 'Complete fixed package price for booking' },
                { id: 'custom_itemized', label: 'C. Custom Itemized Services', desc: 'Detailed itemized pricing table with custom bases' },
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
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
                <Calendar className="w-4 h-4 text-[#c9a96e]" />
                <span>First Night & Additional Nights Rates (Per Person)</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[#52606d] font-medium mb-1">First-Night Price Per Person (USD)</label>
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
                  <label className="block text-[#52606d] font-medium mb-1">Additional-Night Price Per Person Per Night (USD)</label>
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
                  Live Calculation Breakdown ({formData.travelers} Travelers, {formData.nights} Nights)
                </div>
                <div className="flex justify-between text-[#52606d]">
                  <span>First Night ({formData.travelers} travelers × ${formData.firstNightRate}):</span>
                  <span>${(formData.travelers * formData.firstNightRate).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-[#52606d]">
                  <span>Additional Nights ({formData.travelers} travelers × {Math.max(formData.nights - 1, 0)} nts × ${formData.additionalNightRate}):</span>
                  <span>${(formData.travelers * Math.max(formData.nights - 1, 0) * formData.additionalNightRate).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between font-bold text-[#0e3b2f] border-t border-[#d8caac] pt-1.5">
                  <span>Package Subtotal:</span>
                  <span>${formData.subtotal.toFixed(2)} USD</span>
                </div>
              </div>
            </div>
          )}

          {/* Mode B: Single Total Package Price */}
          {formData.pricingMode === 'single_total' && (
            <div className="bg-white p-6 rounded-lg border border-[#e5dec9] shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-2 border-b border-[#f0eae0] pb-2">
                <DollarSign className="w-4 h-4 text-[#c9a96e]" />
                <span>Single Total Package Price</span>
              </h3>
              <div className="max-w-md space-y-2 text-xs">
                <label className="block text-[#52606d] font-medium">Complete Package Price (USD)</label>
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
                  This amount represents the total fixed price for the booking covering {formData.travelers} travelers and {formData.nights} nights stay duration.
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
                    <span>Itemized Pricing Breakdown with Pricing Basis</span>
                  </h3>
                  <p className="text-xs text-[#687785]">
                    Select the pricing basis for each item. Quantities and line totals calculate automatically based on trip parameters.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
                  <span>Add Item Row</span>
                </button>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto border border-[#e5dec9] rounded">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase border-b border-[#e5dec9]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold w-8 text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">Description</th>
                      <th className="py-2.5 px-3 font-semibold w-48">Pricing Basis</th>
                      <th className="py-2.5 px-3 font-semibold w-20 text-center">Qty</th>
                      <th className="py-2.5 px-3 font-semibold w-28 text-right">Unit Price ($)</th>
                      <th className="py-2.5 px-3 font-semibold w-32 text-right">Total ($)</th>
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
                            placeholder="Item description..."
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
                            <option value="per_person_total">Per person for entire stay</option>
                            <option value="per_person_night">Per person per night</option>
                            <option value="per_cabin_night">Per cabin per night</option>
                            <option value="per_booking">Per booking</option>
                            <option value="per_vehicle">Per vehicle</option>
                            <option value="custom">Custom quantity</option>
                          </select>

                          {item.pricingBasis === 'per_vehicle' && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] text-[#52606d]">Vehicles:</span>
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
                            title="Remove item"
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
                  Enable Territory & Service Tax ({formData.taxPercent || 7}%)
                </span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52606d]">Tax Percentage (%):</span>
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
                <span>Package Subtotal:</span>
                <span>${formData.subtotal.toFixed(2)} USD</span>
              </div>

              {formData.enableTax && (
                <div className="flex justify-between text-[#805e24]">
                  <span>Territory & Service Tax ({formData.taxPercent}%):</span>
                  <span>+${formData.taxAmount.toFixed(2)} USD</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#0e3b2f] border-t border-[#cfc7b2] pt-2 mt-1">
                <span>Total USD:</span>
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
                  <span>Terms Status & Business Approval</span>
                </h3>
                <p className="text-xs text-[#687785] mt-0.5">
                  “Approved by Petra” confirms terms approval for business use. It does not imply legal review.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleResetConditionsToPending}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-xs font-medium transition-colors"
                >
                  Reset Conditions to Pending
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#52606d] font-medium">Terms Status:</span>
                  <select
                    value={formData.termsStatus}
                    onChange={(e) => setFormData({ ...formData, termsStatus: e.target.value as any })}
                    className={`px-3 py-1.5 text-xs font-bold rounded border ${
                      formData.termsStatus === 'Approved by Petra'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <option value="Draft">Draft (Unapproved Terms)</option>
                    <option value="Approved by Petra">Approved by Petra</option>
                  </select>
                </div>
              </div>
            </div>

            {formData.termsStatus === 'Draft' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded text-xs text-amber-900">
                <strong>Note:</strong> While Terms Status is "Draft", this quotation cannot be saved as "Ready for review". Please review and approve the terms above when ready.
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
                  <span>Package Inclusions List</span>
                </h3>
                <button
                  onClick={() => handleAddArrayItem('inclusions')}
                  className="inline-flex items-center gap-1 text-[11px] text-[#0e3b2f] font-medium hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Inclusion
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
                  <span>Package Exclusions List</span>
                </h3>
                <button
                  onClick={() => handleAddArrayItem('exclusions')}
                  className="inline-flex items-center gap-1 text-[11px] text-[#802424] font-medium hover:underline"
                >
                  <Plus className="w-3 h-3" /> Add Exclusion
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
              <span>Customer Booking Terms & Conditions</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[#52606d] font-medium mb-1">Payment Schedule</label>
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
                <label className="block text-[#52606d] font-medium mb-1">Deposit Requirement</label>
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
                <label className="block text-[#52606d] font-medium mb-1">Cancellation Terms</label>
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
                <label className="block text-[#52606d] font-medium mb-1">Weather & Logistics Note</label>
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
                <label className="block text-[#52606d] font-medium mb-1">Seasonal / Special Conditions</label>
                <textarea
                  rows={2}
                  value={formData.seasonalConditions}
                  onChange={(e) => {
                    touchTermsCondition();
                    setFormData({ ...formData, seasonalConditions: e.target.value });
                  }}
                  placeholder="e.g. Dry trade wind season weather notice..."
                  className="w-full p-2.5 border border-[#cfc7b2] rounded text-xs bg-[#faf8f5]"
                />
              </div>

              <div className="bg-[#fffdfa] p-3 rounded border border-amber-200">
                <label className="block text-amber-900 font-semibold mb-1">
                  Internal Supplier-Payment Notes (Excluded from Preview/Print)
                </label>
                <textarea
                  rows={2}
                  value={formData.supplierPaymentNotes}
                  onChange={(e) => setFormData({ ...formData, supplierPaymentNotes: e.target.value })}
                  placeholder="Internal notes regarding payments to island hosts or drivers..."
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
                  <span>Selected Photos ({formData.selectedPhotos.length}) — Reorder & Edit Captions</span>
                </h3>
                <p className="text-xs text-[#687785] mt-0.5">
                  Photos appear in this exact order on customer previews and printed PDFs.
                </p>
              </div>

              {/* Local Temporary Upload Button */}
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded cursor-pointer transition-colors shadow-sm self-start sm:self-auto">
                <Upload className="w-3.5 h-3.5 text-[#c9a96e]" />
                <span>Temporary Local Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLocalImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[11px] text-[#687785] italic">
              Note: Temporary uploaded images are kept in browser memory for previewing during this session and are not stored in permanent cloud storage.
            </p>

            {/* Selected Photos List */}
            {formData.selectedPhotos.length === 0 ? (
              <div className="p-8 text-center text-[#687785] border border-dashed border-[#cfc7b2] rounded">
                No photos selected yet. Select photos from the gallery below or upload a temporary photo.
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
                          <option value="Unverified demo">Unverified Photo</option>
                          <option value="Confirmed by Petra">Confirmed by Petra (Verified)</option>
                        </select>

                        {photo.isTemporaryUpload && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded font-mono">
                            Admin Note: Temporary Browser Upload
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={photo.caption}
                        onChange={(e) => handleUpdatePhotoCaption(photo.id, e.target.value)}
                        placeholder="Caption for customer quotation..."
                        className="w-full px-2.5 py-1 border border-[#cfc7b2] rounded text-xs bg-white"
                      />
                    </div>

                    {/* Reorder & Remove Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleMovePhoto(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 text-[#52606d] hover:bg-[#e6dece] rounded disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMovePhoto(index, 'down')}
                        disabled={index === formData.selectedPhotos.length - 1}
                        className="p-1.5 text-[#52606d] hover:bg-[#e6dece] rounded disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleTogglePhotoSelect(photo)}
                        className="p-1.5 text-[#a84444] hover:bg-[#fcebeb] rounded"
                        title="Deselect photo"
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
                  Destination Asset Library
                </h3>
                <p className="text-xs text-[#687785]">
                  Select or deselect images to include in this quotation's showcase.
                </p>
              </div>

              {/* Destination Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#52606d]">Filter by Destination:</span>
                <select
                  value={photoIslandFilter}
                  onChange={(e) => setPhotoIslandFilter(e.target.value)}
                  className="text-xs border border-[#cfc7b2] rounded px-2.5 py-1 bg-white"
                >
                  <option value="All">All Destinations</option>
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
                <h3 className="text-sm font-bold text-[#0e3b2f]">Reset quotation conditions?</h3>
                <p className="text-xs text-[#687785]">Confirm reset of customer-facing terms</p>
              </div>
            </div>

            <p className="text-xs text-[#45525f] leading-relaxed">
              Replace customer-facing conditions with ‘Pending Petra’s confirmation’. Other quotation details will remain unchanged.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f0eae0]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#52606d] bg-[#f0eae0] hover:bg-[#e6dece] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetConditions}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
