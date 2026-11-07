import fs from 'node:fs';
import path from 'node:path';
import { SEO_CONTENT, getLandingSchemaJsonLd, SeoRoute } from '../src/utils/seo';
import { Language } from '../src/types';

interface PrerenderTarget {
  routePath: string; // e.g. 'san-blas-day-trips' or 'es/san-blas-day-trips'
  seoKey: 'landing-day-trips' | 'landing-overnight-stays' | 'landing-sailing';
  lang: Language;
  h1: string;
  tagline: string;
  breadcrumbs: string;
  highlights: { title: string; desc: string }[];
  inclusions: string[];
  exclusions: string[];
  faqs: { q: string; a: string }[];
}

const PRERENDER_TARGETS: PrerenderTarget[] = [
  // 1. Day Trips (English)
  {
    routePath: 'san-blas-day-trips',
    seoKey: 'landing-day-trips',
    lang: 'en',
    h1: 'San Blas Day Trips from Panama City',
    tagline: 'Full-day Caribbean island-hopping excursion into the pristine Guna Yala archipelago. Crystal turquoise waters, starfish sandbanks, and fresh traditional catch.',
    breadcrumbs: 'Day Trips',
    highlights: [
      { title: '2 to 3 Pristine Coral Islands', desc: 'Explore postcard-perfect cayes including Isla Perro Chico, famous for its offshore shipwreck reef bustling with marine life.' },
      { title: 'Natural Pool Sandbank Snorkel', desc: 'Wade waist-deep in open ocean on a shallow sandbank surrounded by starfish and turquoise transparency.' },
      { title: 'Traditional Fresh Catch Lunch', desc: 'Enjoy authentic whole fried Caribbean catch or fresh chicken with coconut rice and salad, prepared by our Guna hosts.' },
      { title: 'Roundtrip 4x4 & Boat Logistics', desc: 'Effortless early morning pickup from your Panama City hotel in a 4x4 SUV followed by motorboat navigation from Cartí Port.' },
    ],
    inclusions: [
      'Roundtrip 4x4 SUV ground transfer from Panama City hotel/residence',
      'Roundtrip motorboat transit between Cartí Port and itinerary islands',
      'Freshly prepared traditional island lunch and one non-alcoholic drink',
      'Visits to 2 to 3 designated coral sand islands and Natural Pool',
      'Island landing fees on all scheduled itinerary stops',
      'Licensed and experienced local Guna boat captain and guide',
    ],
    exclusions: [
      'Comarca Guna Yala checkpoint entry fee ($22 foreign / $7 national; payable in cash)',
      'Municipal port tax ($5 per person; payable in cash)',
      'Additional bottled sodas, beers, or personal snacks',
      'Snorkel gear rental (we strongly recommend bringing your own mask)',
    ],
    faqs: [
      { q: 'Is a day trip from Panama City enough time to enjoy San Blas?', a: 'Yes, departing at 5:00 AM allows over 6 hours of island relaxation, swimming, and reef snorkeling before afternoon return.' },
      { q: 'What travel documents are required at the checkpoint?', a: 'An original physical passport with at least 6 months validity (or Panamanian cédula) is strictly required by Comarca border authorities.' },
      { q: 'What happens in case of rough weather or marine advisories?', a: 'We operate in strict coordination with SINAPROC and maritime port authorities. Port closures offer free rescheduling or full refunds.' },
    ],
  },
  // 2. Day Trips (Spanish)
  {
    routePath: 'es/san-blas-day-trips',
    seoKey: 'landing-day-trips',
    lang: 'es',
    h1: 'Pasadías en San Blas desde Ciudad de Panamá',
    tagline: 'Excursión de un día completo por el archipiélago de Guna Yala: islas vírgenes de arena blanca, snorkel en la Piscina Natural y almuerzo caribeño.',
    breadcrumbs: 'Pasadías',
    highlights: [
      { title: 'Visita a 2 o 3 Islas Vírgenes', desc: 'Exploración de cayos paradisíacos como Isla Perro Chico, famosa por su barco hundido cubierto de corales y peces multicolores.' },
      { title: 'Snorkel en la Piscina Natural', desc: 'Caminar con el agua a la cintura en medio del mar sobre un banco de arena poco profundo habitado por estrellas de mar gigantes.' },
      { title: 'Almuerzo Isleño Tradicional', desc: 'Pescado entero del día o pollo fresco con arroz con coco tradicional y ensalada, preparado al momento por anfitriones gunas.' },
      { title: 'Transporte 4x4 y Bote Incluidos', desc: 'Recogida de madrugada en su hotel o residencia en Ciudad de Panamá en vehículo 4x4 SUV y lancha motora con capitán guna.' },
    ],
    inclusions: [
      'Transporte terrestre 4x4 ida y vuelta desde Ciudad de Panamá',
      'Transporte en lancha motora tradicional ida y vuelta desde Puerto Cartí',
      'Almuerzo tradicional recién preparado y una bebida no alcohólica',
      'Visita a 2 o 3 islas designadas y parada guiada en la Piscina Natural',
      'Impuestos de desembarque en las islas visitadas del itinerario',
      'Capitán y guía local guna autorizado',
    ],
    exclusions: [
      'Impuesto de entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales en efectivo)',
      'Tasa portuaria municipal ($5 por persona en efectivo)',
      'Bebidas embotelladas adicionales, cervezas o aperitivos personales',
      'Alquiler de máscara de snorkel (se recomienda traer la propia)',
    ],
    faqs: [
      { q: '¿Es realmente posible conocer San Blas en un solo día desde Ciudad de Panamá?', a: 'Sí, al salir a las 5:00 AM se llega a las 8:30 AM a Cartí, permitiendo más de 6 horas completas de mar, sol y snorkel antes de regresar.' },
      { q: '¿Qué documentos son obligatorios para viajar?', a: 'El pasaporte físico original vigente (o cédula nacional) es obligatorio. No se aceptan fotos ni copias digitales.' },
      { q: '¿Qué sucede si hay mal tiempo o restricciones de navegación?', a: 'En caso de suspensión oficial de zarpe por SINAPROC, se ofrece reprogramación sin penalización o reembolso íntegro.' },
    ],
  },
  // 3. Overnight Stays (English)
  {
    routePath: 'san-blas-overnight-stays',
    seoKey: 'landing-overnight-stays',
    lang: 'en',
    h1: 'San Blas Overnight Stays & Island Experiences',
    tagline: 'Sleep steps from the Caribbean surf in traditional beachfront and overwater cabanas. Untamed Caribbean stars, digital detox, and authentic Guna hospitality.',
    breadcrumbs: 'Overnight Stays',
    highlights: [
      { title: 'Beachfront & Overwater Cabanas', desc: 'Rustic island dwellings built with local hardwood and thatched palm roofs, positioned directly on the sand or standing over the shallow lagoon.' },
      { title: 'Private & Shared Bathroom Options', desc: 'Choose comfortable cabins with ensuite private bathrooms (such as on Isla Chichime Grande) or authentic traditional shared facility stays.' },
      { title: 'All Daily Meals Included', desc: 'Full island board featuring fresh seafood, coconut rice, fried plantains, and tropical fruit prepared by local Guna families.' },
      { title: 'Daily Boat Excursions to Outer Cays', desc: 'Every full day of your stay includes guided boat trips to neighboring uninhabited islands, barrier reef drop-offs, and starfish sandbanks.' },
    ],
    inclusions: [
      'Beach cabin accommodation (private or shared bathroom as selected)',
      'Shared round-trip 4x4 ground transportation from Panama City',
      'Shared round-trip motorboat transit between Cartí Port and host island',
      'Complete meal plan (Lunch & Dinner Day 1; 3 meals intermediate days; Breakfast departure day)',
      'Daily guided island-hopping boat excursions to reefs and neighboring cays',
      'Personal travel coordination and pre-arrival verification by Petra',
    ],
    exclusions: [
      'Guna Yala entrance checkpoint fee ($22 foreign / $7 resident in cash)',
      'Port tax ($5 per person in cash)',
      'Bottled beverages, beers, sodas, and personal snacks',
      'Optional afternoon late checkout with extra lunch ($35 per person)',
    ],
    faqs: [
      { q: 'What are the cabins like and what amenities are provided?', a: 'Cabins are authentic eco-rustic structures built from local wood and thatched palm. Solar or generator electricity operates during evening hours.' },
      { q: 'Is there fresh water and how do the bathrooms work?', a: 'Host islands have freshwater reserves for rinsing and showering. Select islands offer private ensuite bathrooms.' },
      { q: 'Is there Wi-Fi or reliable phone coverage?', a: 'Cellular reception is faint and outer islands have no Wi-Fi, offering guests a true digital detox.' },
    ],
  },
  // 4. Overnight Stays (Spanish)
  {
    routePath: 'es/san-blas-overnight-stays',
    seoKey: 'landing-overnight-stays',
    lang: 'es',
    h1: 'Estadías y Cabañas en Islas San Blas',
    tagline: 'Duerma frente al mar en cabañas tradicionales de madera y paja. Desconexión auténtica, cielo estrellado y el ritmo pausado de las comunidades gunas.',
    breadcrumbs: 'Estadías en Isla',
    highlights: [
      { title: 'Cabañas Frente al Mar y Sobre el Agua', desc: 'Alojamientos rústicos construidos en madera autóctona y paja de palma, ubicados directamente sobre la arena blanca o suspendidos sobre la laguna turquesa.' },
      { title: 'Opciones con Baño Privado y Compartido', desc: 'Cabañas en islas como Chichime Grande con baño privado en suite, o cabañas tradicionales con servicios higiénicos compartidos bien mantenidos.' },
      { title: 'Plan de 3 Comidas Diarias Incluidas', desc: 'Desayunos, almuerzos y cenas preparados con pesca fresca local, plátano, arroz con coco y frutas tropicales servidos por familias anfitrionas.' },
      { title: 'Excursiones Diarias en Bote', desc: 'Cada día de su estadía incluye una excursión en lancha hacia cayos vecinos deshabitados, arrecifes de coral y la Piscina Natural.' },
    ],
    inclusions: [
      'Alojamiento en cabaña de playa (privada o compartida según reserva)',
      'Transporte terrestre compartido en 4x4 ida y vuelta desde Ciudad de Panamá',
      'Transporte marítimo compartido ida y vuelta desde Puerto Cartí a la isla',
      'Plan completo de comidas tradicionales durante la estadía',
      'Excursión guiada diaria en bote a cayos y arrecifes cercanos',
      'Atención personalizada y coordinación directa con Petra',
    ],
    exclusions: [
      'Entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales en efectivo)',
      'Tasa portuaria ($5 por persona en efectivo)',
      'Bebidas embotelladas, cervezas, sodas y gastos personales',
      'Salida tardía opcional después del mediodía con almuerzo ($35 por persona)',
    ],
    faqs: [
      { q: '¿Cómo son las cabañas y qué servicios tienen?', a: 'Son cabañas rústicas tradicionales de madera y paja con camas y mosquiteros. La electricidad por generador o paneles solares funciona en horarios nocturnos.' },
      { q: '¿Hay agua dulce y cómo son los baños?', a: 'Las islas cuentan con depósitos de agua dulce para aseo. Cabañas en Chichime ofrecen baños privados completos.' },
      { q: '¿Hay señal de teléfono o internet Wi-Fi en las islas?', a: 'La señal celular es débil y la mayoría de las islas no disponen de conexión Wi-Fi, propiciando un descanso absoluto.' },
    ],
  },
  // 5. Sailing & Charters (English)
  {
    routePath: 'san-blas-sailing',
    seoKey: 'landing-sailing',
    lang: 'en',
    h1: 'San Blas Sailing & Private Charters',
    tagline: 'Sail the outer barrier reefs aboard private catamarans and classic sailboats. Secluded anchorages, untouched lagoons, and all-inclusive nautical living.',
    breadcrumbs: 'Sailing Charters',
    highlights: [
      { title: 'Exclusive Wind-Powered Cruising', desc: 'Harness the trade winds to reach untouched outer atolls beyond the reach of standard day tours, including Cayos Holandeses and Coco Bandero.' },
      { title: 'Private Monohull & Catamaran Options', desc: 'Charters featuring private double cabins, spacious salons, open trampolines, shaded cockpits, and motorized dinghies for island landings.' },
      { title: 'Dedicated Skipper & Full Board', desc: 'Experienced captain and crew managing all navigation, with fresh meals prepared daily featuring Caribbean seafood, tropical fruit, and provisions.' },
      { title: 'Water Sports Gear Included', desc: 'Complimentary stand-up paddleboards (SUP), complete snorkeling gear for deep reef drop-offs, and kayaks for exploring uninhabited islets.' },
    ],
    inclusions: [
      'Exclusive private charter of sailboat or catamaran with crew',
      'Licensed captain managing navigation, anchoring, and maritime safety',
      'Full board meals prepared on board (breakfast, lunch, dinner, and snacks)',
      'Filtered water, coffee, tea, and non-alcoholic refreshments',
      'Complimentary use of stand-up paddleboards (SUP) and snorkeling masks',
      'Motorized dinghy for island shore landings and beach visits',
      'Boat fuel, marine insurance, and comarca anchorage permits',
    ],
    exclusions: [
      '4x4 overland transfer between Panama City and Cartí Port (coordinated upon request)',
      'Guna Yala entrance checkpoint fee ($22 foreign / $7 resident cash)',
      'Port tax ($5 per person cash)',
      'Special alcoholic beverages or spirits',
      'Crew gratuities',
    ],
    faqs: [
      { q: 'What is the difference between a catamaran and a monohull sailboat?', a: 'Catamarans offer dual-hull stability, minimal heel, and expansive trampolines. Monohulls offer a romantic classic sailing experience.' },
      { q: 'Is sailing in San Blas safe from storms?', a: 'San Blas lies completely outside the Caribbean hurricane belt and is protected by extensive coral reef systems.' },
      { q: 'Can we customize our sailing route and island stops?', a: 'Yes, charters are 100% private. Petra and your captain will customize your itinerary based on weather, wind, and preferences.' },
    ],
  },
  // 6. Sailing & Charters (Spanish)
  {
    routePath: 'es/san-blas-sailing',
    seoKey: 'landing-sailing',
    lang: 'es',
    h1: 'Veleros y Catamaranes en San Blas Panamá',
    tagline: 'Navegue por el archipiélago a bordo de veleros monocasco y catamaranes privados. Atolones vírgenes, fondeos en lagunas turquesas y cocina a bordo.',
    breadcrumbs: 'Veleros y Catamaranes',
    highlights: [
      { title: 'Navegación Exclusiva a Vela', desc: 'Impulsados por el viento caribeño, explore atolones alejados del turismo masivo como Cayos Holandeses, Coco Bandero y Cambombia.' },
      { title: 'Veleros Monocasco y Catamaranes', desc: 'Embarcaciones privadas con cabinas dobles independientes, salón interior, cubierta para tomar sol y auxiliar semirrígido (dinghy).' },
      { title: 'Capitán Dedicado y Pensión Completa', desc: 'Patrón profesional a cargo de la navegación y comidas gourmet preparadas a bordo con mariscos frescos, langosta en temporada y cocina internacional.' },
      { title: 'Equipo Náutico y Deportes Acuáticos', desc: 'Uso libre de tablas de paddleboard (SUP), equipos de snorkel completos para arrecifes profundos y kayaks para explorar cayos solitarios.' },
    ],
    inclusions: [
      'Uso exclusivo del velero o catamarán privado con tripulación',
      'Capitán experimentado a cargo de la navegación y seguridad marítima',
      'Todas las comidas a bordo (desayunos, almuerzos, cenas y aperitivos)',
      'Agua purificada, café, té y refrescos a bordo',
      'Uso libre de tablas de paddleboard (SUP) y equipo de snorkel',
      'Bote auxiliar con motor para desembarques en las islas',
      'Combustible del barco y tasas de fondeo en la comarca',
    ],
    exclusions: [
      'Transporte terrestre 4x4 desde Ciudad de Panamá al puerto (coordinado por separado)',
      'Impuesto de entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales en efectivo)',
      'Tasa de puerto ($5 por persona en efectivo)',
      'Bebidas alcohólicas especiales',
      'Propinas para la tripulación',
    ],
    faqs: [
      { q: '¿Cuál es la diferencia entre un catamarán y un velero monocasco?', a: 'El catamarán ofrece mayor estabilidad sin inclinación, espacio amplio en red y salón grande. El velero monocasco ofrece la sensación náutica clásica.' },
      { q: '¿Es seguro navegar en San Blas?', a: 'San Blas se encuentra fuera del cinturón de huracanes y sus aguas están protegidas por barreras coralinas que atenúan el oleaje.' },
      { q: '¿Puedo personalizar el itinerario de navegación?', a: 'Sí, todas las salidas son 100% privadas y adaptables en coordinación directa con Petra y el capitán.' },
    ],
  },
];

export function prerenderLandingPages() {
  const rootDir = process.cwd();
  const distDir = path.resolve(rootDir, 'dist');
  const publicDir = path.resolve(rootDir, 'public');

  // Load base index.html from dist if built, else root index.html
  let baseHtmlPath = path.resolve(distDir, 'index.html');
  if (!fs.existsSync(baseHtmlPath)) {
    baseHtmlPath = path.resolve(rootDir, 'index.html');
  }

  const baseHtml = fs.readFileSync(baseHtmlPath, 'utf-8');

  console.log('Generating prerendered HTML for 6 landing pages...');

  for (const target of PRERENDER_TARGETS) {
    const config = SEO_CONTENT[target.seoKey][target.lang];
    const schema = getLandingSchemaJsonLd(target.seoKey, target.lang);

    // Build rich semantic initial HTML body
    const initialBodyContent = `
    <header class="bg-[#071722] text-[#FAF8F2] pt-28 pb-12 px-4 sm:px-6 lg:px-8 border-b border-[#C5A46B]/40">
      <div class="max-w-6xl mx-auto space-y-4">
        <nav aria-label="Breadcrumb" class="text-xs font-mono text-[#C8AC75]">
          <a href="${target.lang === 'es' ? '/?lang=es' : '/'}" class="hover:underline">${target.lang === 'es' ? 'Inicio' : 'Home'}</a> / 
          <span>${target.breadcrumbs}</span>
        </nav>
        <div class="inline-block px-3 py-1 rounded-full bg-[#C5A46B]/20 text-[11px] font-mono uppercase text-[#E2D2BB]">
          Guna Yala Panama Travel · Official Collection
        </div>
        <h1 class="text-3xl sm:text-5xl font-serif text-white">${target.h1}</h1>
        <p class="text-base sm:text-lg text-[#E2D2BB] font-serif italic max-w-3xl">${target.tagline}</p>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <section class="space-y-6">
        <h2 class="text-2xl font-serif text-[#173D36]">${target.lang === 'es' ? 'Aspectos Destacados' : 'Experience Highlights'}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${target.highlights.map(h => `
            <div class="bg-white border border-[#E2D2BB] p-6 rounded-2xl">
              <h3 class="font-serif font-bold text-lg text-[#173D36]">${h.title}</h3>
              <p class="text-sm text-[#4A5568] mt-2 font-light">${h.desc}</p>
            </div>
          `).join('')}
        </div>
      </section>
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border border-emerald-600/30 p-6 rounded-2xl">
          <h3 class="font-serif font-bold text-lg text-emerald-950">${target.lang === 'es' ? 'Qué Incluye el Paquete' : 'What is Included'}</h3>
          <ul class="mt-3 space-y-2 text-sm text-[#2D3748]">
            ${target.inclusions.map(inc => `<li>✓ ${inc}</li>`).join('')}
          </ul>
        </div>
        <div class="bg-white border border-amber-600/30 p-6 rounded-2xl">
          <h3 class="font-serif font-bold text-lg text-amber-950">${target.lang === 'es' ? 'No Incluido · Pagos en Efectivo' : 'Excluded · Cash on Site'}</h3>
          <ul class="mt-3 space-y-2 text-sm text-[#2D3748]">
            ${target.exclusions.map(exc => `<li>• ${exc}</li>`).join('')}
          </ul>
        </div>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-serif text-[#173D36]">${target.lang === 'es' ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}</h2>
        <div class="space-y-3">
          ${target.faqs.map(f => `
            <div class="bg-white border border-[#E2D2BB] p-5 rounded-xl">
              <h3 class="font-serif font-bold text-base text-[#173D36]">${f.q}</h3>
              <p class="text-sm text-[#4A5568] mt-2 font-light">${f.a}</p>
            </div>
          `).join('')}
        </div>
      </section>
    </main>
    `;

    // Construct tailored HTML
    let pageHtml = baseHtml;

    // Set html lang attribute
    pageHtml = pageHtml.replace(/<html\s+lang="[^"]*"/, `<html lang="${config.langAttr}"`);

    // Replace Title
    pageHtml = pageHtml.replace(/<title>[^<]*<\/title>/, `<title>${config.title}</title>`);

    // Replace Meta Description
    pageHtml = pageHtml.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${config.description}" />`
    );

    // Replace Canonical
    pageHtml = pageHtml.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${config.canonical}" />`
    );

    // Replace Reciprocal Hreflang Tags
    pageHtml = pageHtml.replace(
      /<link\s+rel="alternate"\s+hreflang="en"\s+href="[^"]*"\s*\/?>/,
      `<link rel="alternate" hreflang="en" href="${config.hreflangEn}" />`
    );
    pageHtml = pageHtml.replace(
      /<link\s+rel="alternate"\s+hreflang="es"\s+href="[^"]*"\s*\/?>/,
      `<link rel="alternate" hreflang="es" href="${config.hreflangEs}" />`
    );
    pageHtml = pageHtml.replace(
      /<link\s+rel="alternate"\s+hreflang="x-default"\s+href="[^"]*"\s*\/?>/,
      `<link rel="alternate" hreflang="x-default" href="${config.hreflangXDefault}" />`
    );

    // Replace OpenGraph
    pageHtml = pageHtml.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${config.title}" />`);
    pageHtml = pageHtml.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${config.description}" />`);
    pageHtml = pageHtml.replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${config.canonical}" />`);
    pageHtml = pageHtml.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${config.ogImage}" />`);
    pageHtml = pageHtml.replace(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/?>/, `<meta property="og:locale" content="${config.ogLocale}" />`);

    // Replace Twitter Card
    pageHtml = pageHtml.replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${config.title}" />`);
    pageHtml = pageHtml.replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:description" content="${config.description}" />`);
    pageHtml = pageHtml.replace(/<meta\s+name="twitter:url"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:url" content="${config.canonical}" />`);
    pageHtml = pageHtml.replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/, `<meta name="twitter:image" content="${config.ogImage}" />`);

    // Inject tailored Schema.org JSON-LD
    const schemaTag = `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n    </script>`;
    pageHtml = pageHtml.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, schemaTag);

    // Inject initial prerendered semantic body inside #root
    pageHtml = pageHtml.replace(
      '<div id="root"></div>',
      `<div id="root">${initialBodyContent}</div>`
    );

    // Write to both dist/ (if present) and public/ (for dev server and build distribution)
    // Support both folder-based (route/index.html) and clean URL file-based (route.html)
    const targets = [
      path.resolve(publicDir, target.routePath, 'index.html'),
      path.resolve(publicDir, `${target.routePath}.html`),
    ];
    if (fs.existsSync(distDir)) {
      targets.push(path.resolve(distDir, target.routePath, 'index.html'));
      targets.push(path.resolve(distDir, `${target.routePath}.html`));
    }

    for (const outPath of targets) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, pageHtml, 'utf-8');
      console.log(`[PRERENDER] Created -> ${path.relative(rootDir, outPath)}`);
    }
  }

  console.log('Prerendering completed successfully for all 6 landing pages (both index.html and .html variants)!');
}

// Execute when run as script
prerenderLandingPages();
