export interface BookingEmailPayload {
  bookingReference: string;
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  experienceTitle: string;
  targetDate?: string;
  departureDate?: string;
  nights?: string;
  adults: number;
  children: number;
  accommodationPreference?: string;
  pickupLocation?: string;
  specialNotes?: string;
  termsAccepted: boolean;
  termsVersion: string;
  customerLanguage: 'en' | 'es';
  submittedAt: string;
}

/**
 * Generates customer booking request acknowledgement email HTML (Bilingual)
 */
export function generateCustomerAcknowledgementEmail(p: BookingEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const isEs = p.customerLanguage === 'es';

  const subject = isEs
    ? `Solicitud de Reserva Recibida: ${p.bookingReference} – Guna Yala Panama Travel`
    : `Booking Request Received: ${p.bookingReference} – Guna Yala Panama Travel`;

  const bannerText = isEs
    ? 'ESTA ES UNA SOLICITUD DE RESERVA, NO UNA RESERVA CONFIRMADA. NO SE REQUIERE PAGO AÚN.'
    : 'THIS IS A BOOKING REQUEST, NOT A CONFIRMED RESERVATION. PAYMENT IS NOT YET REQUIRED.';

  const headingText = isEs ? 'Solicitud de Reserva Recibida' : 'Booking Request Received';

  const introParagraph = isEs
    ? `Estimado/a ${p.customerName}, gracias por enviar su solicitud de reserva para su viaje a Guna Yala (San Blas). Hemos recibido los detalles de su viaje. Nuestro equipo encabezado por Petra verificará la disponibilidad de cabañas e itinerarios con las familias locales de las islas antes de emitir cualquier solicitud de pago.`
    : `Dear ${p.customerName}, thank you for submitting your booking request for your trip to Guna Yala (San Blas). We have received your trip details. Our team led by Petra will check cabana and boat availability with local island family hosts before issuing any payment request.`;

  const detailsHeader = isEs ? 'Resumen de su Solicitud' : 'Request Details';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #faf7f2; color: #06121e; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5dccb; border-radius: 16px; overflow: hidden; }
          .header { background: #06121e; color: #c8ac75; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; }
          .banner { background: #fffbebf5; border-bottom: 2px solid #f59e0b; color: #92400e; padding: 14px 20px; font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 0.05em; }
          .content { padding: 30px 24px; }
          .ref-badge { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; padding: 6px 14px; border-radius: 20px; font-family: monospace; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
          .summary-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
          .summary-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .summary-table td.label { color: #64748b; font-weight: 500; width: 40%; }
          .summary-table td.value { color: #0f172a; font-weight: 600; }
          .footer { background: #faf8f5; border-top: 1px solid #e2d8c5; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Guna Yala Panama Travel</h1>
          </div>
          <div class="banner">
            ⚠️ ${bannerText}
          </div>
          <div class="content">
            <h2 style="margin-top:0; color:#06121e; font-size:22px;">${headingText}</h2>
            <div class="ref-badge">Ref: ${p.bookingReference}</div>
            <p style="font-size:14px; line-height:1.6; color:#334155;">${introParagraph}</p>
            
            <h3 style="font-size:15px; border-bottom:1px solid #e2d8c5; padding-bottom:8px; margin-top:28px; color:#06121e;">${detailsHeader}</h3>
            <table class="summary-table">
              <tr><td class="label">${isEs ? 'Experiencia:' : 'Experience:'}</td><td class="value">${p.experienceTitle}</td></tr>
              <tr><td class="label">${isEs ? 'Tipo de Viaje:' : 'Trip Type:'}</td><td class="value">${p.bookingType.toUpperCase()}</td></tr>
              ${p.targetDate ? `<tr><td class="label">${isEs ? 'Fecha de Viaje:' : 'Target Travel Date:'}</td><td class="value">${p.targetDate}</td></tr>` : ''}
              ${p.nights ? `<tr><td class="label">${isEs ? 'Duración:' : 'Duration:'}</td><td class="value">${p.nights} ${isEs ? 'Noches' : 'Nights'}</td></tr>` : ''}
              <tr><td class="label">${isEs ? 'Viajeros:' : 'Travelers:'}</td><td class="value">${p.adults + p.children} (${p.adults} Adults, ${p.children} Children)</td></tr>
              ${p.accommodationPreference ? `<tr><td class="label">${isEs ? 'Alojamiento:' : 'Accommodation:'}</td><td class="value">${p.accommodationPreference}</td></tr>` : ''}
              ${p.pickupLocation ? `<tr><td class="label">${isEs ? 'Punto de Recogida:' : 'Pickup Location:'}</td><td class="value">${p.pickupLocation}</td></tr>` : ''}
              ${p.specialNotes ? `<tr><td class="label">${isEs ? 'Notas / Solicitudes:' : 'Notes / Requests:'}</td><td class="value">${p.specialNotes}</td></tr>` : ''}
              <tr><td class="label">${isEs ? 'Términos Aceptados:' : 'Terms Accepted:'}</td><td class="value">✓ ${p.termsVersion}</td></tr>
            </table>

            <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:16px; border-radius:12px; font-size:13px; color:#065f46; line-height:1.5;">
              <strong>${isEs ? '¿Siguientes Pasos?' : 'Next Steps:'}</strong><br>
              ${isEs 
                ? 'Petra revisará la disponibilidad de alojamiento en las islas y le enviará un correo o mensaje con la confirmación de disponibilidad y los detalles de pago.' 
                : 'Petra will check island host availability and reach out with availability confirmation and itemized payment instructions.'}
            </div>
          </div>
          <div class="footer">
            Guna Yala Panama Travel &bull; Direct Local Island Heritage Tours & Overnight Stays<br>
            Contact: info@gunayalapanamatravel.com &bull; WhatsApp: +507 6444-3649
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
GUNA YALA PANAMA TRAVEL
${bannerText}

Ref: ${p.bookingReference}
${headingText}

${introParagraph}

${detailsHeader}:
- ${isEs ? 'Experiencia:' : 'Experience:'} ${p.experienceTitle}
- ${isEs ? 'Cliente:' : 'Customer:'} ${p.customerName} (${p.customerEmail}, ${p.customerPhone})
- ${isEs ? 'Viajeros:' : 'Travelers:'} ${p.adults + p.children}
${p.targetDate ? `- ${isEs ? 'Fecha:' : 'Date:'} ${p.targetDate}` : ''}
${p.nights ? `- ${isEs ? 'Noches:' : 'Nights:'} ${p.nights}` : ''}

Next Steps: Petra will review island availability and contact you shortly.
  `.trim();

  return { subject, html, text };
}

/**
 * Generates Petra's internal new booking request notification email HTML
 */
export function generatePetraNotificationEmail(p: BookingEmailPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `NEW BOOKING REQUEST: ${p.bookingReference} – ${p.customerName} (${p.experienceTitle})`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; padding: 20px; }
          .card { max-width: 650px; margin: 0 auto; background: #ffffff; border: 2px solid #0284c7; border-radius: 16px; padding: 24px; }
          .badge { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          td.label { color: #64748b; font-weight: bold; width: 35%; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2 style="margin-top:0; color:#0369a1;">🔔 New Customer Booking Request</h2>
          <div className="badge">Ref: ${p.bookingReference}</div>
          <p style="font-size:14px; color:#334155;">A new booking request has been submitted on Guna Yala Panama Travel. Action required: Check island cabana/boat availability and send quotation/payment link.</p>

          <table>
            <tr><td class="label">Customer Name:</td><td><strong>${p.customerName}</strong></td></tr>
            <tr><td class="label">Email:</td><td><a href="mailto:${p.customerEmail}">${p.customerEmail}</a></td></tr>
            <tr><td class="label">WhatsApp / Phone:</td><td><a href="https://wa.me/${p.customerPhone.replace(/[^0-9]/g, '')}">${p.customerPhone}</a></td></tr>
            <tr><td class="label">Experience:</td><td>${p.experienceTitle} (${p.bookingType.toUpperCase()})</td></tr>
            <tr><td class="label">Target Travel Date:</td><td>${p.targetDate || 'Flexible'}</td></tr>
            <tr><td class="label">Nights / Duration:</td><td>${p.nights || 'N/A'}</td></tr>
            <tr><td class="label">Travelers:</td><td>${p.adults + p.children} (${p.adults} Adults, ${p.children} Children)</td></tr>
            <tr><td class="label">Accommodation:</td><td>${p.accommodationPreference || 'Standard'}</td></tr>
            <tr><td class="label">Pickup Address:</td><td>${p.pickupLocation || 'None specified'}</td></tr>
            <tr><td class="label">Special Requests:</td><td>${p.specialNotes || 'None'}</td></tr>
            <tr><td class="label">Language:</td><td>${p.customerLanguage.toUpperCase()}</td></tr>
            <tr><td class="label">T&C Agreed:</td><td>✓ Version ${p.termsVersion}</td></tr>
            <tr><td class="label">Submitted At:</td><td>${p.submittedAt}</td></tr>
          </table>
        </div>
      </body>
    </html>
  `;

  const text = `
NEW BOOKING REQUEST: ${p.bookingReference}
Customer: ${p.customerName}
Email: ${p.customerEmail}
Phone: ${p.customerPhone}
Experience: ${p.experienceTitle} (${p.bookingType})
Date: ${p.targetDate || 'Flexible'}
Travelers: ${p.adults} Adults, ${p.children} Children
Notes: ${p.specialNotes || 'None'}
  `.trim();

  return { subject, html, text };
}
