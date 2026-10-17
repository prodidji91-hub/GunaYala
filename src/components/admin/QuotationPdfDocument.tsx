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

// Define explicit PDF styles with 10pt body text, zero letterSpacing, left alignment, and comfortable line spacing
const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingHorizontal: 28,
    paddingBottom: 48, // Room for fixed footer
    fontFamily: 'NimbusSans',
    fontSize: 10,
    color: '#1c242c',
    backgroundColor: '#FFFFFF',
    letterSpacing: 0,
    textAlign: 'left',
  },
  watermarkBanner: {
    backgroundColor: '#112d24',
    color: '#fde68a',
    paddingVertical: 5,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 8.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    marginBottom: 10,
    borderRadius: 2,
    letterSpacing: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ebdcb8',
    marginBottom: 10,
  },
  brandLeft: {
    flexDirection: 'column',
    gap: 2,
  },
  companyName: {
    fontSize: 15,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    textTransform: 'uppercase',
    letterSpacing: 0,
    textAlign: 'left',
  },
  tagline: {
    fontSize: 8.5,
    color: '#c9a96e',
    fontStyle: 'italic',
    marginBottom: 4,
    letterSpacing: 0,
    textAlign: 'left',
  },
  contactItem: {
    fontSize: 8,
    color: '#52606d',
    marginBottom: 1,
    letterSpacing: 0,
    textAlign: 'left',
  },
  metaBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e5dec9',
    borderRadius: 4,
    padding: 8,
    width: 150,
    textAlign: 'right',
  },
  metaHeader: {
    fontSize: 8.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#f0eae0',
    paddingBottom: 3,
    marginBottom: 5,
    letterSpacing: 0,
    textAlign: 'right',
  },
  metaRow: {
    fontSize: 8,
    color: '#687785',
    marginBottom: 3,
    letterSpacing: 0,
    textAlign: 'right',
  },
  metaVal: {
    color: '#1c242c',
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    letterSpacing: 0,
  },
  guestBox: {
    backgroundColor: '#f7f4ed',
    borderWidth: 1,
    borderColor: '#e0d6c1',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  guestBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e0d6c1',
    paddingBottom: 4,
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 9.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  travelersBadge: {
    backgroundColor: '#0e3b2f',
    color: '#ffffff',
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    letterSpacing: 0,
  },
  grid3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  col: {
    flex: 1,
  },
  lbl: {
    fontSize: 7.5,
    color: '#687785',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0,
    textAlign: 'left',
  },
  val: {
    fontSize: 9.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#1c242c',
    letterSpacing: 0,
    textAlign: 'left',
  },
  subVal: {
    fontSize: 8,
    color: '#52606d',
    marginTop: 1,
    letterSpacing: 0,
    textAlign: 'left',
  },
  logisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#ebdcb8',
    paddingTop: 6,
    marginTop: 4,
    fontSize: 8,
    color: '#45525f',
    letterSpacing: 0,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#e5dec9',
    paddingBottom: 3,
    marginTop: 10,
    marginBottom: 8,
    letterSpacing: 0,
    textAlign: 'left',
  },
  grid2: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: '#faf8f5',
    borderWidth: 1,
    borderColor: '#e5dec9',
    borderRadius: 3,
    padding: 8,
  },
  incCard: {
    flex: 1,
    backgroundColor: '#f4f8f6',
    borderWidth: 1,
    borderColor: '#c1ded3',
    borderRadius: 3,
    padding: 8,
  },
  excCard: {
    backgroundColor: '#fff8f8',
    borderWidth: 1,
    borderColor: '#f0c2c2',
    borderRadius: 3,
    padding: 8,
    marginTop: 8,
  },
  cardTitle: {
    fontSize: 9,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5dec9',
    paddingBottom: 3,
    letterSpacing: 0,
    textAlign: 'left',
  },
  cardText: {
    fontSize: 8.5,
    color: '#2d3a45',
    lineHeight: 1.35,
    letterSpacing: 0,
    textAlign: 'left',
  },
  listItem: {
    fontSize: 8.5,
    color: '#283e35',
    marginBottom: 3,
    lineHeight: 1.3,
    letterSpacing: 0,
    textAlign: 'left',
  },
  excListItem: {
    fontSize: 8.5,
    color: '#522b2b',
    marginBottom: 3,
    lineHeight: 1.3,
    letterSpacing: 0,
    textAlign: 'left',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5dec9',
    borderRadius: 3,
    marginVertical: 8,
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f5f1e8',
    borderBottomWidth: 1,
    borderBottomColor: '#e5dec9',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee7d8',
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  thDesc: { flex: 3, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#52606d', textTransform: 'uppercase', letterSpacing: 0, textAlign: 'left' },
  thQty: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#52606d', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0 },
  thRate: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#52606d', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0 },
  thTotal: { flex: 1, fontSize: 8, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#52606d', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0 },
  tdDesc: { flex: 3, fontSize: 8.5, color: '#1c242c', lineHeight: 1.3, letterSpacing: 0, textAlign: 'left' },
  tdQty: { flex: 1, fontSize: 8.5, color: '#52606d', textAlign: 'center', letterSpacing: 0 },
  tdRate: { flex: 1, fontSize: 8.5, color: '#52606d', textAlign: 'right', letterSpacing: 0 },
  tdTotal: { flex: 1, fontSize: 8.5, fontFamily: 'NimbusSans', fontWeight: 'bold', color: '#0e3b2f', textAlign: 'right', letterSpacing: 0 },
  totalBox: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#e5dec9',
    borderRadius: 3,
    padding: 8,
    width: 180,
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
    fontSize: 8.5,
    color: '#52606d',
    letterSpacing: 0,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#cfc7b2',
    paddingTop: 4,
    marginTop: 3,
    fontSize: 10,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    letterSpacing: 0,
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
    borderColor: '#e5dec9',
    borderRadius: 3,
    backgroundColor: '#faf8f5',
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: 75,
    objectFit: 'cover',
  },
  photoTitle: {
    fontSize: 8,
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#0e3b2f',
    paddingHorizontal: 5,
    paddingTop: 4,
    letterSpacing: 0,
    textAlign: 'left',
  },
  photoCaption: {
    fontSize: 7,
    color: '#687785',
    paddingHorizontal: 5,
    paddingBottom: 4,
    marginTop: 2,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: 'left',
  },
  unverifiedBadge: {
    fontSize: 6.5,
    color: '#92400e',
    backgroundColor: '#fef3c7',
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
    color: '#065f46',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginHorizontal: 5,
    marginBottom: 4,
    borderRadius: 2,
    letterSpacing: 0,
    textAlign: 'left',
  },
  conditionsBox: {
    backgroundColor: '#faf8f5',
    borderWidth: 1,
    borderColor: '#ebdcb8',
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    borderTopWidth: 1,
    borderTopColor: '#e5dec9',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    fontFamily: 'NimbusSans',
    color: '#687785',
    letterSpacing: 0,
  },
  fixedFooterLabel: {
    fontFamily: 'NimbusSans',
    fontWeight: 'bold',
    color: '#8a6218',
    letterSpacing: 0,
  },
  fixedFooterPage: {
    fontFamily: 'NimbusSans',
    color: '#687785',
    letterSpacing: 0,
  },
});

interface QuotationPdfDocumentProps {
  quotation: Quotation;
  preparedPhotos?: AttachedPhoto[];
}

export const QuotationPdfDocument: React.FC<QuotationPdfDocumentProps> = ({
  quotation,
  preparedPhotos,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
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

  const snapshot = quotation.packageSnapshot || {
    overview: 'Experience island life in Guna Yala.',
    accommodationDetails: `${quotation.cabinCategory} (${quotation.bathroomType} Bathroom)`,
    mealsByDay: 'Daily meal plan included as per island schedule.',
    groundTransportationDetails: `Ground transport: ${quotation.groundTransportation}`,
    boatTransferDetails: `Boat transfers: ${quotation.boatTransfers}`,
    toursAndActivities: 'Island hopping and reef activities.',
    otherInclusions: quotation.inclusions.join('; '),
    optionalExtras: 'Custom requests upon inquiry.',
    exclusions: quotation.exclusions.join('; '),
    islandSchedule: 'Morning Panama City departures.',
    importantInstructions: 'Original passport required at Guna Yala border.',
  };

  const displayPhotos = preparedPhotos || quotation.selectedPhotos || [];

  // Conditions Title
  const conditionsHeading =
    quotation.termsStatus === 'Approved by Petra'
      ? 'Booking Conditions & Seasonal Travel Terms'
      : 'Draft conditions — pending Petra’s approval';

  return (
    <Document title={`Quotation ${quotation.reference}`}>
      <Page size="A4" style={styles.page}>
        {/* Prototype Watermark Notice */}
        <View style={styles.watermarkBanner}>
          <Text>PROTOTYPE DEMO QUOTATION — SAMPLE PRESENTATION (REF: {quotation.reference})</Text>
        </View>

        {/* Business Header */}
        <View style={styles.header}>
          <View style={styles.brandLeft}>
            <Text style={styles.companyName}>Guna Yala Panama Travel</Text>
            <Text style={styles.tagline}>A Guna-owned local company offering authentic, personalised San Blas experiences.</Text>
            <Text style={styles.contactItem}>Email: hello@gunayalapanamatravel.com</Text>
            <Text style={styles.contactItem}>WhatsApp: +507 6444 3649</Text>
            <Text style={styles.contactItem}>RUC: 10-710-599 DV 16</Text>
            <Text style={styles.contactItem}>Web: www.gunayalapanamatravel.com</Text>
          </View>

          <View style={styles.metaBox}>
            <Text style={styles.metaHeader}>Official Quotation</Text>
            <Text style={styles.metaRow}>Reference: <Text style={styles.metaVal}>{quotation.reference}</Text></Text>
            <Text style={styles.metaRow}>Date: <Text style={styles.metaVal}>{formatDate(quotation.quotationDate)}</Text></Text>
            <Text style={styles.metaRow}>Valid Through: <Text style={styles.metaVal}>{formatDate(quotation.expiryDate)}</Text></Text>
            <Text style={[styles.metaRow, { color: '#802424', fontSize: 7, marginTop: 4 }]}>Availability is subject to confirmation.</Text>
          </View>
        </View>

        {/* Guest & Trip Parameters Box (YOUR BOOKING DETAILS) */}
        <View style={styles.guestBox} wrap={false}>
          <View style={styles.guestBoxHeader}>
            <Text style={styles.guestTitle}>YOUR BOOKING DETAILS</Text>
          </View>

          <View style={styles.grid3}>
            <View style={styles.col}>
              <Text style={styles.lbl}>Lead Booker</Text>
              <Text style={styles.val}>{quotation.customerName || 'Valued Guest'}</Text>
              {quotation.customerEmail ? <Text style={styles.subVal}>Email: {quotation.customerEmail}</Text> : null}
              {quotation.customerPhone ? <Text style={styles.subVal}>WhatsApp: {quotation.customerPhone}</Text> : null}
            </View>

            <View style={styles.col}>
              <Text style={styles.lbl}>Destination / Island & Experience</Text>
              <Text style={styles.val}>{quotation.island}</Text>
              <Text style={styles.subVal}>Experience: {quotation.experience || 'Island Overnight Experience'}</Text>
              <Text style={styles.subVal}>Number of Travellers: {quotation.travelers}</Text>
            </View>

            <View style={styles.col}>
              <Text style={styles.lbl}>Travel Dates</Text>
              <Text style={styles.val}>{formatDate(quotation.arrivalDate)} – {formatDate(quotation.departureDate)}</Text>
              <Text style={styles.subVal}>Duration: {quotation.nights} Night{quotation.nights !== 1 ? 's' : ''}</Text>
            </View>
          </View>
        </View>

        {/* Pricing Breakdown Table & Totals (QUOTATION DETAILS) */}
        <View wrap={false}>
          <Text style={styles.sectionHeading}>QUOTATION DETAILS</Text>
          
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={styles.thDesc}>Service Description</Text>
              <Text style={styles.thQty}>Qty / Pax</Text>
              <Text style={styles.thRate}>Rate (USD)</Text>
              <Text style={styles.thTotal}>Total (USD)</Text>
            </View>

            {quotation.pricingMode === 'first_night_additional' ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.tdDesc}>Island Cabaña Accommodation & Meals (First Night)</Text>
                  <Text style={styles.tdQty}>{quotation.travelers}</Text>
                  <Text style={styles.tdRate}>${(quotation.firstNightRate || 0).toFixed(2)}</Text>
                  <Text style={styles.tdTotal}>${(quotation.travelers * (quotation.firstNightRate || 0)).toFixed(2)}</Text>
                </View>
                {Math.max(quotation.nights - 1, 0) > 0 && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tdDesc}>Island Cabaña Accommodation & Meals ({Math.max(quotation.nights - 1, 0)} Additional Night{Math.max(quotation.nights - 1, 0) !== 1 ? 's' : ''})</Text>
                    <Text style={styles.tdQty}>{quotation.travelers} pax × {Math.max(quotation.nights - 1, 0)}</Text>
                    <Text style={styles.tdRate}>${(quotation.additionalNightRate || 0).toFixed(2)}</Text>
                    <Text style={styles.tdTotal}>${(quotation.travelers * Math.max(quotation.nights - 1, 0) * (quotation.additionalNightRate || 0)).toFixed(2)}</Text>
                  </View>
                )}
              </>
            ) : quotation.pricingMode === 'single_total' ? (
              <View style={styles.tableRow}>
                <Text style={styles.tdDesc}>Complete Package Price (Island Stay & All Inclusions)</Text>
                <Text style={styles.tdQty}>{quotation.travelers} pax</Text>
                <Text style={styles.tdRate}>—</Text>
                <Text style={styles.tdTotal}>${(quotation.totalPackagePrice || quotation.subtotal).toFixed(2)}</Text>
              </View>
            ) : (
              quotation.lineItems.map((item, idx) => (
                <View style={styles.tableRow} key={item.id || idx}>
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
              <Text>Subtotal:</Text>
              <Text>${quotation.subtotal.toFixed(2)} USD</Text>
            </View>

            {quotation.enableAdditionalCharge ? (
              <View style={styles.totalRow}>
                <Text>{quotation.additionalChargeLabel} ({quotation.additionalChargePercent}%):</Text>
                <Text>+${quotation.additionalChargeAmount.toFixed(2)} USD</Text>
              </View>
            ) : null}

            <View style={styles.grandTotalRow}>
              <Text>Grand Total:</Text>
              <Text>${quotation.total.toFixed(2)} USD</Text>
            </View>
          </View>
        </View>

        {/* Unified WHAT'S INCLUDED Section */}
        <Text style={styles.sectionHeading}>WHAT'S INCLUDED</Text>

        <View style={styles.incCard} wrap={false}>
          <Text style={styles.cardTitle}>Included Services & Summary</Text>
          {quotation.inclusions.map((inc, i) => (
            <Text key={i} style={styles.listItem}>✓ {inc}</Text>
          ))}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.overview ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Experience Overview</Text>
              <Text style={styles.cardText}>{snapshot.overview}</Text>
            </View>
          ) : null}

          {snapshot.accommodationDetails ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Accommodation & Bathroom</Text>
              <Text style={styles.cardText}>Category: {quotation.cabinCategory} ({quotation.cabinsCount} unit, {quotation.bathroomType} Bathroom). {snapshot.accommodationDetails}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.mealsByDay ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Meals by Day</Text>
              <Text style={styles.cardText}>{snapshot.mealsByDay}</Text>
            </View>
          ) : null}

          {snapshot.groundTransportationDetails ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Ground Transportation</Text>
              <Text style={styles.cardText}>Type: {quotation.groundTransportation}. {snapshot.groundTransportationDetails}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.boatTransferDetails ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Boat Transfers</Text>
              <Text style={styles.cardText}>Type: {quotation.boatTransfers}. {snapshot.boatTransferDetails}</Text>
            </View>
          ) : null}

          {snapshot.toursAndActivities ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Included Tours & Activities</Text>
              <Text style={styles.cardText}>{snapshot.toursAndActivities}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.grid2} wrap={false}>
          {snapshot.islandSchedule ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Island Schedule & Timing</Text>
              <Text style={styles.cardText}>{snapshot.islandSchedule}</Text>
            </View>
          ) : null}

          {snapshot.importantInstructions ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Important Travel Instructions</Text>
              <Text style={styles.cardText}>{snapshot.importantInstructions}</Text>
            </View>
          ) : null}
        </View>

        {/* What Is Excluded */}
        <View style={styles.excCard} wrap={false}>
          <Text style={styles.cardTitle}>What Is Excluded (Cash Required on Site)</Text>
          {quotation.exclusions.map((exc, i) => (
            <Text key={i} style={styles.excListItem}>✕ {exc}</Text>
          ))}
        </View>



        {/* Destination Photos Gallery */}
        {displayPhotos.length > 0 ? (
          <View>
            <Text style={styles.sectionHeading}>Destination Visual Showcase</Text>
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

        {/* Booking Terms & Conditions Container (Faithful display; avoids repeating pending confirmation) */}
        <View style={styles.conditionsBox} wrap={false}>
          <Text style={styles.cardTitle}>{conditionsHeading}</Text>
          <Text style={styles.cardText}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>1. Payment Schedule & Deposit: </Text>
            {getCombinedPayAndDeposit(quotation.paymentSchedule, quotation.depositRequirement)}
          </Text>
          <Text style={[styles.cardText, { marginTop: 4 }]}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>2. Cancellation Terms: </Text>
            {renderCondition(quotation.cancellationTerms)}
          </Text>
          {renderCondition(quotation.seasonalConditions) !== PENDING_TEXT || quotation.seasonalConditions ? (
            <Text style={[styles.cardText, { marginTop: 4 }]}>
              <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>3. Seasonal Conditions: </Text>
              {renderCondition(quotation.seasonalConditions)}
            </Text>
          ) : null}
          <Text style={[styles.cardText, { marginTop: 4 }]}>
            <Text style={{ fontFamily: 'NimbusSans', fontWeight: 'bold' }}>4. Territory Logistics & Weather: </Text>
            {renderCondition(quotation.weatherLogisticsNote)}
          </Text>
        </View>

        {/* Fixed Footer on Every Page (Requirement 2) */}
        <View style={styles.fixedFooter} fixed>
          <Text style={styles.fixedFooterLabel}>
            PROTOTYPE — NOT A LIVE QUOTATION (REF: {quotation.reference})
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
