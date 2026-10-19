import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { Quotation, AttachedPhoto } from '../../types/quotation';
import { getPhotoBadgeInfo } from '../../data/samplePhotos';

// 1. Register locally bundled, production-included Nimbus Sans TTF fonts
Font.register({
  family: 'NimbusSans',
  fonts: [
    { src: '/fonts/NimbusSans-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NimbusSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NimbusSans-Italic.ttf', fontWeight: 'normal', fontStyle: 'italic' },
  ],
});

// Disable automatic word hyphenation so words are never awkwardly broken
Font.registerHyphenationCallback((word) => [word]);

const PENDING_TEXT = 'Pending Petra’s confirmation.';

// Luxury Executive PDF Stylesheet (Part 14C Polished)
const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 32,
    paddingBottom: 52, // Room for executive footer
    fontFamily: 'NimbusSans',
    fontSize: 9.5,
    color: '#1c242c',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0,
    textAlign: 'left',
  },
  header: {
    backgroundColor: '#0E3B2F',
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#C8AC75',
  },
  brandLeft: {
    flexDirection: 'column',
    gap: 3,
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  tagline: {
    fontSize: 8.5,
    color: '#C8AC75',
    fontStyle: 'italic',
    marginBottom: 4,
    letterSpacing: 0,
    textAlign: 'left',
  },
  contactItem: {
    fontSize: 7.5,
    color: '#E5DEC9',
    marginBottom: 1.5,
    letterSpacing: 0,
    textAlign: 'left',
  },
  metaBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200, 172, 117, 0.4)',
    borderRadius: 4,
    padding: 10,
    width: 160,
    textAlign: 'right',
  },
  metaHeader: {
    fontSize: 8.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#C8AC75',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 172, 117, 0.3)',
    paddingBottom: 3,
    marginBottom: 6,
    letterSpacing: 0.5,
    textAlign: 'right',
  },
  metaRow: {
    fontSize: 7.5,
    color: '#E5DEC9',
    marginBottom: 3,
    letterSpacing: 0,
    textAlign: 'right',
  },
  metaVal: {
    color: '#FFFFFF',
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    letterSpacing: 0,
  },
  guestBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#C8AC75',
    borderRadius: 5,
    padding: 12,
    marginBottom: 12,
  },
  guestBoxHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5DEC9',
    paddingBottom: 5,
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 9.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  col: {
    flex: 1,
  },
  lbl: {
    fontSize: 7.5,
    color: '#717D8A',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  val: {
    fontSize: 9.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    letterSpacing: 0,
    textAlign: 'left',
  },
  subVal: {
    fontSize: 8,
    color: '#4A5568',
    marginTop: 1,
    letterSpacing: 0,
    textAlign: 'left',
  },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    textTransform: 'uppercase',
    borderBottomWidth: 1.5,
    borderBottomColor: '#C8AC75',
    paddingBottom: 4,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5DEC9',
    borderRadius: 4,
    padding: 10,
  },
  incCard: {
    flex: 1,
    backgroundColor: '#F4F8F6',
    borderWidth: 1,
    borderColor: '#C1DED3',
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  excCard: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#F0C2C2',
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  alertNotice: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  alertNoticeHeading: {
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#78350F',
    fontSize: 8.5,
    letterSpacing: 0,
    textAlign: 'left',
  },
  alertNoticeText: {
    color: '#92400E',
    fontSize: 8,
    marginTop: 2,
    lineHeight: 1.3,
    letterSpacing: 0,
    textAlign: 'left',
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DEC9',
    paddingBottom: 4,
    letterSpacing: 0.3,
    textAlign: 'left',
  },
  cardText: {
    fontSize: 8.5,
    color: '#2D3A45',
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: 'left',
  },
  listItem: {
    fontSize: 8.5,
    color: '#1F3A2E',
    marginBottom: 3.5,
    lineHeight: 1.35,
    letterSpacing: 0,
    textAlign: 'left',
  },
  excListItem: {
    fontSize: 8.5,
    color: '#5C2828',
    marginBottom: 3.5,
    lineHeight: 1.35,
    letterSpacing: 0,
    textAlign: 'left',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#C8AC75',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#0E3B2F',
    borderBottomWidth: 1,
    borderBottomColor: '#C8AC75',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DEC9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DEC9',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FAF8F5',
  },
  thDesc: { flex: 3, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left' },
  thQty: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.5 },
  thRate: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  thTotal: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#FFFFFF', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  tdDesc: { flex: 3, fontSize: 8.5, color: '#1C242C', lineHeight: 1.35, letterSpacing: 0, textAlign: 'left' },
  tdQty: { flex: 1, fontSize: 8.5, color: '#4A5568', textAlign: 'center', letterSpacing: 0 },
  tdRate: { flex: 1, fontSize: 8.5, color: '#4A5568', textAlign: 'right', letterSpacing: 0 },
  tdTotal: { flex: 1, fontSize: 8.5, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#0E3B2F', textAlign: 'right', letterSpacing: 0 },
  totalBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1.5,
    borderColor: '#C8AC75',
    borderRadius: 5,
    padding: 10,
    width: 230,
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    fontSize: 8.5,
    color: '#4A5568',
    letterSpacing: 0,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#C8AC75',
    paddingTop: 6,
    marginTop: 4,
    fontSize: 10.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    letterSpacing: 0.3,
  },
  photoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  photoCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#C8AC75',
    borderRadius: 4,
    backgroundColor: '#FAF8F5',
    overflow: 'hidden',
    marginBottom: 6,
  },
  photoImg: {
    width: '100%',
    height: 85,
    objectFit: 'cover',
  },
  photoTitle: {
    fontSize: 8,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    paddingHorizontal: 6,
    paddingTop: 5,
    letterSpacing: 0,
    textAlign: 'left',
  },
  photoCaption: {
    fontSize: 7,
    color: '#687785',
    paddingHorizontal: 6,
    paddingBottom: 5,
    marginTop: 2,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: 'left',
  },
  unverifiedBadge: {
    fontSize: 6.5,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 5,
    marginBottom: 4,
    borderRadius: 2,
    letterSpacing: 0,
    textAlign: 'left',
  },
  verifiedBadge: {
    fontSize: 6.5,
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 5,
    marginBottom: 4,
    borderRadius: 2,
    letterSpacing: 0,
    textAlign: 'left',
  },
  conditionsBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#C8AC75',
    borderRadius: 5,
    padding: 12,
    marginTop: 10,
    marginBottom: 12,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 14,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: '#C8AC75',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    fontFamily: 'NimbusSans',
    color: '#687785',
    letterSpacing: 0.3,
  },
  fixedFooterLabel: {
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0E3B2F',
    letterSpacing: 0.3,
  },
  fixedFooterPage: {
    fontFamily: 'NimbusSans',
    color: '#687785',
    letterSpacing: 0.3,
  },
});

interface QuotationPdfDocumentProps {
  quotation: Quotation;
  preparedPhotos?: AttachedPhoto[];
  logoDataUrl?: string;
}

export const QuotationPdfDocument: React.FC<QuotationPdfDocumentProps> = ({
  quotation,
  preparedPhotos,
  logoDataUrl,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(quotation.language === 'es' ? 'es-ES' : 'en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Faithful display helper: only blank/empty strings fallback to PENDING_TEXT
  const renderCondition = (text?: string): string => {
    if (!text || text.trim() === '') return PENDING_TEXT;
    return text.trim();
  };

  // Helper for combining Payment Schedule & Deposit without repeating PENDING_TEXT twice
  const getCombinedPayAndDeposit = (pay?: string, dep?: string): string => {
    const payStr = renderCondition(pay);
    const depStr = renderCondition(dep);

    if (payStr === PENDING_TEXT && depStr === PENDING_TEXT) {
      return PENDING_TEXT;
    }
    if (payStr === depStr) {
      return payStr;
    }
    return `${payStr} ${depStr}`.trim();
  };

  const lang = quotation.language || 'en';
  const PENDING_TEXT = lang === 'es' ? 'Pendiente de confirmación por Petra.' : 'Pending Petra’s confirmation.';

  const l = {
    officialQuotation: lang === 'es' ? 'Cotización Oficial' : 'Official Quotation',
    reference: lang === 'es' ? 'Referencia' : 'Reference',
    date: lang === 'es' ? 'Fecha' : 'Date',
    validThrough: lang === 'es' ? 'Válida Hasta' : 'Valid Through',
    availabilityNotice: lang === 'es' ? 'La disponibilidad está sujeta a confirmación.' : 'Availability is subject to confirmation.',
    bookingDetails: lang === 'es' ? 'DETALLES DE SU RESERVA' : 'YOUR BOOKING DETAILS',
    leadBooker: lang === 'es' ? 'Titular de Reserva' : 'Lead Booker',
    destinationIslandExp: lang === 'es' ? 'Destino / Isla y Experiencia' : 'Destination / Island & Experience',
    experience: lang === 'es' ? 'Experiencia' : 'Experience',
    numberOfTravellers: lang === 'es' ? 'Número de Viajeros' : 'Number of Travellers',
    travelDates: lang === 'es' ? 'Fechas de Viaje' : 'Travel Dates',
    duration: lang === 'es' ? 'Duración' : 'Duration',
    night: lang === 'es' ? 'noche' : 'night',
    nights: lang === 'es' ? 'noches' : 'nights',
    quotationDetails: lang === 'es' ? 'DETALLES DE COTIZACIÓN' : 'QUOTATION DETAILS',
    ratesPending: lang === 'es' ? 'Tarifas por Confirmar' : 'Rates Pending Confirmation',
    ratesPendingMsg: lang === 'es'
      ? 'La tarifa oficial para este itinerario personalizado está pendiente de confirmación por parte de los operadores locales de Guna Yala y Petra. Las tarifas finales se confirmarán al validar el itinerario.'
      : 'Official pricing for this custom itinerary is currently pending confirmation from local Guna Yala island operators and Petra. Final rates will be confirmed upon itinerary validation.',
    serviceDescription: lang === 'es' ? 'Descripción del Servicio' : 'Service Description',
    qtyPax: lang === 'es' ? 'Cant. / Pax' : 'Qty / Pax',
    rateUsd: lang === 'es' ? 'Tarifa (USD)' : 'Rate (USD)',
    totalUsd: lang === 'es' ? 'Total (USD)' : 'Total (USD)',
    islandAccommodationFirstNight: lang === 'es' ? 'Alojamiento en Cabaña en Isla y Comidas (Primera Noche)' : 'Island Cabaña Accommodation & Meals (First Night)',
    completePackagePrice: lang === 'es' ? 'Precio de Paquete Completo (Estadía en Isla y Todas las Inclusiones)' : 'Complete Package Price (Island Stay & All Inclusions)',
    optionalExtra: lang === 'es' ? 'Servicio Opcional' : 'Optional Extra',
    packageSubtotal: lang === 'es' ? 'Subtotal del Paquete' : 'Package Subtotal',
    grandTotal: lang === 'es' ? 'Gran Total' : 'Grand Total',
    whatsIncluded: lang === 'es' ? 'QUÉ INCLUYE' : "WHAT'S INCLUDED",
    includedServicesSummary: lang === 'es' ? 'Servicios Incluidos y Resumen' : 'Included Services & Summary',
    experienceOverview: lang === 'es' ? 'Descripción de la Experiencia' : 'Experience Overview',
    accommodationBathroom: lang === 'es' ? 'Alojamiento y Baño' : 'Accommodation & Bathroom',
    category: lang === 'es' ? 'Categoría' : 'Category',
    bathroom: lang === 'es' ? 'Baño' : 'Bathroom',
    mealsByDay: lang === 'es' ? 'Comidas por Día' : 'Meals by Day',
    groundTransportation: lang === 'es' ? 'Transporte Terrestre' : 'Ground Transportation',
    boatTransfers: lang === 'es' ? 'Traslados en Bote' : 'Boat Transfers',
    includedToursActivities: lang === 'es' ? 'Tours y Actividades Incluidas' : 'Included Tours & Activities',
    islandScheduleTiming: lang === 'es' ? 'Horarios e Itinerario en Isla' : 'Island Schedule & Timing',
    importantTravelInstructions: lang === 'es' ? 'Instrucciones Importantes de Viaje' : 'Important Travel Instructions',
    whatIsExcluded: lang === 'es' ? 'Qué Excluye (Efectivo Requerido en Sitio)' : 'What Is Excluded (Cash Required on Site)',
    bookingConditionsTerms: lang === 'es' ? 'Condiciones de Reserva y Términos Estacionales' : 'Booking Conditions & Seasonal Travel Terms',
    draftConditions: lang === 'es' ? 'Condiciones en borrador — pendiente de aprobación de Petra' : 'Draft conditions — pending Petra’s approval',
    ratesToBeConfirmed: lang === 'es' ? 'Tarifas por confirmar' : 'Rates to Be Confirmed',
    ratesPendingShort: lang === 'es' ? 'Tarifas por Confirmar' : 'Rates Pending',
    toBeConfirmed: lang === 'es' ? 'Por confirmar' : 'To Be Confirmed',
    destinationVisualShowcase: lang === 'es' ? 'Galería Visual del Destino' : 'Destination Visual Showcase',
    officialProposalFooter: lang === 'es' ? 'GUNA YALA PANAMA TRAVEL — PROPUESTA OFICIAL' : 'GUNA YALA PANAMA TRAVEL — OFFICIAL PROPOSAL',
  };

  const snapshot = lang === 'es' ? (quotation.packageSnapshotEs || quotation.packageSnapshot || {
    overview: 'Experimente la vida en las islas de Guna Yala.',
    accommodationDetails: `${quotation.cabinCategoryEs || quotation.cabinCategory} (${quotation.bathroomType} Baño)`,
    mealsByDay: 'Plan de comidas diario incluido según el horario de la isla.',
    groundTransportationDetails: `Transporte terrestre: ${quotation.groundTransportation}`,
    boatTransferDetails: `Traslados en bote: ${quotation.boatTransfers}`,
    toursAndActivities: 'Recorridos por islas y actividades en arrecifes.',
    islandSchedule: 'Salidas matutinas desde Ciudad de Panamá.',
    importantInstructions: 'Se requiere pasaporte original en el puesto fronterizo de Guna Yala.',
  }) : (quotation.packageSnapshot || {
    overview: 'Experience island life in Guna Yala.',
    accommodationDetails: `${quotation.cabinCategory} (${quotation.bathroomType} Bathroom)`,
    mealsByDay: 'Daily meal plan included as per island schedule.',
    groundTransportationDetails: `Ground transport: ${quotation.groundTransportation}`,
    boatTransferDetails: `Boat transfers: ${quotation.boatTransfers}`,
    toursAndActivities: 'Island hopping and reef activities.',
    islandSchedule: 'Morning Panama City departures.',
    importantInstructions: 'Original passport required at Guna Yala border.',
  });

  const inclusions = lang === 'es' && quotation.inclusionsEs && quotation.inclusionsEs.length > 0
    ? quotation.inclusionsEs
    : quotation.inclusions;

  const exclusions = lang === 'es' && quotation.exclusionsEs && quotation.exclusionsEs.length > 0
    ? quotation.exclusionsEs
    : quotation.exclusions;

  const experienceName = lang === 'es' ? (quotation.experienceEs || quotation.experience || 'Experiencia Nocturna en Isla') : (quotation.experience || 'Island Overnight Experience');
  const cabinCategoryName = lang === 'es' ? (quotation.cabinCategoryEs || quotation.cabinCategory || 'Cabaña Estándar') : (quotation.cabinCategory || 'Standard Cabaña');

  const displayPhotos = preparedPhotos || quotation.selectedPhotos || [];

  // Conditions Title
  const conditionsHeading =
    quotation.termsStatus === 'Approved by Petra'
      ? l.bookingConditionsTerms
      : l.draftConditions;

  const isRatesPending =
    quotation.pricingStatus === 'Rates to Be Confirmed' ||
    (quotation.pricingMode === 'first_night_additional' && (!quotation.firstNightRate || quotation.firstNightRate <= 0)) ||
    (quotation.pricingMode === 'single_total' && (!quotation.totalPackagePrice || quotation.totalPackagePrice <= 0));

  return (
    <Document title={`Quotation ${quotation.reference}`}>
      <Page size="A4" style={styles.page}>
        {/* Executive Business Header */}
        <View style={styles.header}>
          <View style={styles.brandLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {logoDataUrl ? (
                <Image src={logoDataUrl} style={{ width: 28, height: 28, objectFit: 'contain' }} />
              ) : null}
              <Text style={styles.companyName}>Guna Yala Panama Travel</Text>
            </View>
            <Text style={styles.tagline}>A Guna-owned local company offering authentic, personalised San Blas experiences.</Text>
            <Text style={styles.contactItem}>Email: hello@gunayalapanamatravel.com</Text>
            <Text style={styles.contactItem}>WhatsApp: +507 6444 3649</Text>
            <Text style={styles.contactItem}>RUC: 10-710-599 DV 16 | Web: www.gunayalapanamatravel.com</Text>
          </View>

          <View style={styles.metaBox}>
            <Text style={styles.metaHeader}>{l.officialQuotation}</Text>
            <Text style={styles.metaRow}>{l.reference}: <Text style={styles.metaVal}>{quotation.reference}</Text></Text>
            {quotation.revisionLetter && (
              <Text style={styles.metaRow}>Revision: <Text style={styles.metaVal}>Rev {quotation.revisionLetter}</Text></Text>
            )}
            <Text style={styles.metaRow}>{l.date}: <Text style={styles.metaVal}>{formatDate(quotation.quotationDate)}</Text></Text>
            <Text style={styles.metaRow}>{l.validThrough}: <Text style={styles.metaVal}>{formatDate(quotation.expiryDate)}</Text></Text>
          </View>
        </View>

        {/* Guest & Trip Parameters Box (YOUR BOOKING DETAILS) */}
        <View style={styles.guestBox} wrap={false}>
          <View style={styles.guestBoxHeader}>
            <Text style={styles.guestTitle}>{l.bookingDetails}</Text>
          </View>

          <View style={styles.grid3}>
            <View style={styles.col}>
              <Text style={styles.lbl}>{l.leadBooker}</Text>
              <Text style={styles.val}>{quotation.customerName || (lang === 'es' ? 'Huésped Estimado' : 'Valued Guest')}</Text>
              {quotation.customerEmail ? <Text style={styles.subVal}>Email: {quotation.customerEmail}</Text> : null}
              {quotation.customerPhone ? <Text style={styles.subVal}>WhatsApp: {quotation.customerPhone}</Text> : null}
            </View>

            <View style={styles.col}>
              <Text style={styles.lbl}>{l.destinationIslandExp}</Text>
              <Text style={styles.val}>{quotation.island}</Text>
              <Text style={styles.subVal}>{l.experience}: {experienceName}</Text>
              <Text style={styles.subVal}>{l.numberOfTravellers}: {quotation.travelers}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.lbl}>{l.travelDates}</Text>
              <Text style={styles.val}>{formatDate(quotation.arrivalDate)} – {formatDate(quotation.departureDate)}</Text>
              <Text style={styles.subVal}>{l.duration}: {quotation.nights} {quotation.nights === 1 ? l.night : l.nights}</Text>
            </View>
          </View>
        </View>

        {/* Experience Overview (Placed directly below Booking Details) */}
        {snapshot.overview ? (
          <View style={styles.card} wrap={false}>
            <Text style={styles.cardTitle}>{lang === 'es' ? 'RESUMEN DE TU EXPERIENCIA' : 'YOUR EXPERIENCE OVERVIEW'}</Text>
            <Text style={styles.cardText}>{snapshot.overview}</Text>
          </View>
        ) : null}

        {/* Pricing Breakdown Table & Totals (QUOTATION DETAILS) */}
        <View wrap={false}>
          <Text style={styles.sectionHeading}>{l.quotationDetails}</Text>

          {isRatesPending && (
            <View style={styles.alertNotice}>
              <Text style={styles.alertNoticeHeading}>{l.ratesPending}</Text>
              <Text style={styles.alertNoticeText}>
                {l.ratesPendingMsg}
              </Text>
            </View>
          )}

          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={styles.thDesc}>{l.serviceDescription}</Text>
              <Text style={styles.thQty}>{l.qtyPax}</Text>
              <Text style={styles.thRate}>{l.rateUsd}</Text>
              <Text style={styles.thTotal}>{l.totalUsd}</Text>
            </View>

            {quotation.pricingMode === 'first_night_additional' ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tdDesc}>{l.islandAccommodationFirstNight}</Text>
                  <Text style={styles.tdQty}>{quotation.travelers}</Text>
                  <Text style={styles.tdRate}>
                    {isRatesPending ? l.ratesPendingShort : `$${(quotation.firstNightRate || 0).toFixed(2)}`}
                  </Text>
                  <Text style={styles.tdTotal}>
                    {isRatesPending ? l.toBeConfirmed : `$${(quotation.travelers * (quotation.firstNightRate || 0)).toFixed(2)}`}
                  </Text>
                </View>
                {Math.max(quotation.nights - 1, 0) > 0 && (
                  <View style={styles.tableRowAlt}>
                    <Text style={styles.tdDesc}>{lang === 'es' ? `Alojamiento en Cabaña en Isla y Comidas (${Math.max(quotation.nights - 1, 0)} ${Math.max(quotation.nights - 1, 0) === 1 ? l.night : l.nights} adicional${Math.max(quotation.nights - 1, 0) !== 1 ? 'es' : ''})` : `Island Cabaña Accommodation & Meals (${Math.max(quotation.nights - 1, 0)} Additional Night${Math.max(quotation.nights - 1, 0) !== 1 ? 's' : ''})`}</Text>
                    <Text style={styles.tdQty}>{quotation.travelers} pax × {Math.max(quotation.nights - 1, 0)}</Text>
                    <Text style={styles.tdRate}>
                      {isRatesPending ? l.ratesPendingShort : `$${(quotation.additionalNightRate || 0).toFixed(2)}`}
                    </Text>
                    <Text style={styles.tdTotal}>
                      {isRatesPending ? l.toBeConfirmed : `$${(quotation.travelers * Math.max(quotation.nights - 1, 0) * (quotation.additionalNightRate || 0)).toFixed(2)}`}
                    </Text>
                  </View>
                )}
                {/* Optional Add-on Line Items */}
                {quotation.lineItems && quotation.lineItems.length > 0 && quotation.lineItems.map((item, idx) => (
                  <View style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={item.id || idx}>
                    <Text style={styles.tdDesc}>+ {item.description} ({l.optionalExtra})</Text>
                    <Text style={styles.tdQty}>{item.quantity}</Text>
                    <Text style={styles.tdRate}>${item.unitPrice.toFixed(2)}</Text>
                    <Text style={styles.tdTotal}>${item.total.toFixed(2)}</Text>
                  </View>
                ))}
              </>
            ) : quotation.pricingMode === 'single_total' ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tdDesc}>{l.completePackagePrice}</Text>
                  <Text style={styles.tdQty}>{quotation.travelers} pax</Text>
                  <Text style={styles.tdRate}>—</Text>
                  <Text style={styles.tdTotal}>
                    {isRatesPending ? l.toBeConfirmed : `$${(quotation.totalPackagePrice || quotation.subtotal).toFixed(2)}`}
                  </Text>
                </View>
                {/* Optional Add-on Line Items */}
                {quotation.lineItems && quotation.lineItems.length > 0 && quotation.lineItems.map((item, idx) => (
                  <View style={idx % 2 === 0 ? styles.tableRowAlt : styles.tableRow} key={item.id || idx}>
                    <Text style={styles.tdDesc}>+ {item.description} ({l.optionalExtra})</Text>
                    <Text style={styles.tdQty}>{item.quantity}</Text>
                    <Text style={styles.tdRate}>${item.unitPrice.toFixed(2)}</Text>
                    <Text style={styles.tdTotal}>${item.total.toFixed(2)}</Text>
                  </View>
                ))}
              </>
            ) : (
              quotation.lineItems.map((item, idx) => (
                <View style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt} key={item.id || idx}>
                  <Text style={styles.tdDesc}>{item.description}</Text>
                  <Text style={styles.tdQty}>{item.quantity}</Text>
                  <Text style={styles.tdRate}>${item.unitPrice.toFixed(2)}</Text>
                  <Text style={styles.tdTotal}>${item.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Subtotal & Grand Total Box */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <Text>{l.packageSubtotal}:</Text>
              <Text>{isRatesPending ? l.ratesToBeConfirmed : `$${quotation.subtotal.toFixed(2)} USD`}</Text>
            </View>

            {!isRatesPending && quotation.enableAdditionalCharge ? (
              <View style={styles.totalRow}>
                <Text>{quotation.additionalChargeLabel} ({quotation.additionalChargePercent}%):</Text>
                <Text>+${quotation.additionalChargeAmount.toFixed(2)} USD</Text>
              </View>
            ) : null}

            <View style={styles.grandTotalRow}>
              <Text>{l.grandTotal}:</Text>
              <Text style={{ textAlign: 'right' }}>{isRatesPending ? l.ratesToBeConfirmed : `$${quotation.total.toFixed(2)} USD`}</Text>
            </View>
          </View>
        </View>

        {/* Unified WHAT'S INCLUDED Section */}
        <Text style={styles.sectionHeading}>{l.whatsIncluded}</Text>

        <View style={styles.incCard} wrap={false}>
          <Text style={styles.cardTitle}>{l.includedServicesSummary}</Text>
          {inclusions.map((inc, i) => (
            <Text key={i} style={styles.listItem}>✓ {inc}</Text>
          ))}
        </View>

        {snapshot.accommodationDetails ? (
          <View style={styles.card} wrap={false}>
            <Text style={styles.cardTitle}>{l.accommodationBathroom}</Text>
            <Text style={styles.cardText}>{l.category}: {cabinCategoryName} ({quotation.cabinsCount} {lang === 'es' ? (quotation.cabinsCount === 1 ? 'unidad' : 'unidades') : (quotation.cabinsCount === 1 ? 'unit' : 'units')}, {quotation.bathroomType} {l.bathroom}). {snapshot.accommodationDetails}</Text>
          </View>
        ) : null}

        <View style={styles.grid2} wrap={false}>
          {snapshot.mealsByDay ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.mealsByDay}</Text>
              <Text style={styles.cardText}>{snapshot.mealsByDay}</Text>
            </View>
          ) : null}

          {snapshot.groundTransportationDetails ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.groundTransportation}</Text>
              <Text style={styles.cardText}>{lang === 'es' ? 'Tipo' : 'Type'}: {quotation.groundTransportation}. {snapshot.groundTransportationDetails}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.boatTransferDetails ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.boatTransfers}</Text>
              <Text style={styles.cardText}>{lang === 'es' ? 'Tipo' : 'Type'}: {quotation.boatTransfers}. {snapshot.boatTransferDetails}</Text>
            </View>
          ) : null}

          {snapshot.toursAndActivities ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.includedToursActivities}</Text>
              <Text style={styles.cardText}>{snapshot.toursAndActivities}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.islandSchedule ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.islandScheduleTiming}</Text>
              <Text style={styles.cardText}>{snapshot.islandSchedule}</Text>
            </View>
          ) : null}

          {snapshot.importantInstructions ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{l.importantTravelInstructions}</Text>
              <Text style={styles.cardText}>{snapshot.importantInstructions}</Text>
            </View>
          ) : null}
        </View>

        {/* What Is Excluded */}
        <View style={styles.excCard} wrap={false}>
          <Text style={styles.cardTitle}>{l.whatIsExcluded}</Text>
          {exclusions.map((exc, i) => (
            <Text key={i} style={styles.excListItem}>✕ {exc}</Text>
          ))}
        </View>

        {/* Destination Photos Gallery */}
        {displayPhotos.length > 0 ? (
          <View wrap={false}>
            <Text style={styles.sectionHeading}>{l.destinationVisualShowcase}</Text>
            <View style={styles.photoContainer}>
              {displayPhotos.map((photo) => {
                const badgeInfo = getPhotoBadgeInfo(photo);
                return (
                  <View style={styles.photoCard} key={photo.id} wrap={false}>
                    {photo.url ? (
                      <Image src={photo.url} style={styles.photoImg} />
                    ) : null}
                    <Text style={styles.photoTitle}>{photo.title}</Text>
                    <Text style={styles.photoCaption}>{photo.caption}</Text>
                    {badgeInfo.type === 'unverified_upload' ? (
                      <Text style={styles.unverifiedBadge}>
                        Photo — destination/accommodation unverified.
                      </Text>
                    ) : badgeInfo.type === 'demo_illustration' ? (
                      <Text style={styles.unverifiedBadge}>
                        Demo illustration — not an actual destination or accommodation photo.
                      </Text>
                    ) : badgeInfo.type === 'verified' ? (
                      <Text style={styles.verifiedBadge}>
                        Confirmed photo — verified by Petra
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Booking Terms & Conditions Container */}
        <View style={styles.conditionsBox} wrap={false}>
          <Text style={styles.cardTitle}>{conditionsHeading}</Text>
          <Text style={styles.cardText}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>{lang === 'es' ? '1. Programa de Pagos y Depósito: ' : '1. Payment Schedule & Deposit: '}</Text>
            {getCombinedPayAndDeposit(
              lang === 'es' ? (quotation.paymentScheduleEs || quotation.paymentSchedule) : quotation.paymentSchedule,
              lang === 'es' ? (quotation.depositRequirementEs || quotation.depositRequirement) : quotation.depositRequirement
            )}
          </Text>
          <Text style={[styles.cardText, { marginTop: 4 }]}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>{lang === 'es' ? '2. Términos de Cancelación: ' : '2. Cancellation Terms: '}</Text>
            {renderCondition(lang === 'es' ? (quotation.cancellationTermsEs || quotation.cancellationTerms) : quotation.cancellationTerms)}
          </Text>
          {renderCondition(lang === 'es' ? (quotation.seasonalConditionsEs || quotation.seasonalConditions) : quotation.seasonalConditions) !== PENDING_TEXT || quotation.seasonalConditions ? (
            <Text style={[styles.cardText, { marginTop: 4 }]}>
              <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>{lang === 'es' ? '3. Condiciones Estacionales: ' : '3. Seasonal Conditions: '}</Text>
              {renderCondition(lang === 'es' ? (quotation.seasonalConditionsEs || quotation.seasonalConditions) : quotation.seasonalConditions)}
            </Text>
          ) : null}
          <Text style={[styles.cardText, { marginTop: 4 }]}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>{lang === 'es' ? '4. Logística del Territorio y Clima: ' : '4. Territory Logistics & Weather: '}</Text>
            {renderCondition(lang === 'es' ? (quotation.weatherLogisticsNoteEs || quotation.weatherLogisticsNote) : quotation.weatherLogisticsNote)}
          </Text>
        </View>

        {/* Professional Closing */}
        <View style={{ backgroundColor: '#FAF8F5', borderWidth: 1, borderColor: 'rgba(200, 172, 117, 0.4)', borderRadius: 4, padding: 12, marginTop: 14, marginBottom: 14, textAlign: 'center' }} wrap={false}>
          <Text style={{ fontSize: 10, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#0E3B2F', marginBottom: 3 }}>
            {lang === 'es' ? 'Esperamos darte la bienvenida a Guna Yala.' : 'We look forward to welcoming you to Guna Yala.'}
          </Text>
          <Text style={{ fontSize: 8.5, color: '#687785', fontStyle: 'italic' }}>
            {lang === 'es' ? 'Tu viaje al corazón del Caribe Guna comienza aquí.' : 'Your journey into the heart of the Guna Caribbean begins here.'}
          </Text>
        </View>

        {/* Executive Footer on Every Page */}
        <View style={styles.fixedFooter} fixed>
          <Text style={styles.fixedFooterLabel}>
            {l.officialProposalFooter} (REF: {quotation.reference})
          </Text>
          <Text
            style={styles.fixedFooterPage}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
};
