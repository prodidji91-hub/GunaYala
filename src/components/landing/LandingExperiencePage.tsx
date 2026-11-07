import React, { useState } from 'react';
import { Language, ExperienceCategory } from '../../types';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';
import {
  Compass,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Shield,
  Anchor,
  Sun,
  Waves,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Users,
  CreditCard,
  FileText
} from 'lucide-react';

export type LandingExperienceType = 'day-trips' | 'overnight-stays' | 'sailing';

interface LandingExperiencePageProps {
  experienceType: LandingExperienceType;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToHome: () => void;
  onOpenBooking: (category: ExperienceCategory) => void;
}

export const LandingExperiencePage: React.FC<LandingExperiencePageProps> = ({
  experienceType,
  currentLang,
  onLanguageChange,
  onBackToHome,
  onOpenBooking,
}) => {
  const isEs = currentLang === 'es';
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  // -------------------------------------------------------------
  // Content Definitions (Source of Truth from Guna Yala Panama Travel)
  // -------------------------------------------------------------
  const content = {
    'day-trips': {
      h1: isEs
        ? 'Pasadías en San Blas desde Ciudad de Panamá'
        : 'San Blas Day Trips from Panama City',
      tagline: isEs
        ? 'Excursión de un día completo por el archipiélago de Guna Yala: islas vírgenes de arena blanca, snorkel en la Piscina Natural y almuerzo caribeño.'
        : 'Full-day Caribbean island-hopping excursion into the pristine Guna Yala archipelago. Crystal turquoise waters, starfish sandbanks, and fresh traditional catch.',
      heroImage: '/pictures/10 Boat Day Tour.jpg',
      heroAlt: isEs
        ? 'Lancha tradicional guna navegando por aguas turquesas en tour de un día'
        : 'Traditional Guna motorboat navigating turquoise Caribbean waters on day tour',
      category: 'day-trip' as ExperienceCategory,
      ctaText: isEs ? 'Reservar Pasadía en San Blas' : 'Book San Blas Day Trip',
      breadcrumbs: isEs ? 'Pasadías' : 'Day Trips',
      highlights: isEs
        ? [
            {
              title: 'Visita a 2 o 3 Islas Vírgenes',
              desc: 'Exploración de cayos paradisíacos como Isla Perro Chico, famosa por su barco hundido cubierto de corales y peces multicolores.',
            },
            {
              title: 'Snorkel en la Piscina Natural',
              desc: 'Caminar con el agua a la cintura en medio del mar sobre un banco de arena poco profundo habitado por estrellas de mar gigantes.',
            },
            {
              title: 'Almuerzo Isleño Tradicional',
              desc: 'Pescado entero del día o pollo fresco con arroz con coco tradicional y ensalada, preparado al momento por anfitriones gunas.',
            },
            {
              title: 'Transporte 4x4 y Bote Incluidos',
              desc: 'Recogida de madrugada en su hotel o residencia en Ciudad de Panamá en vehículo 4x4 SUV y lancha motora con capitán guna.',
            },
          ]
        : [
            {
              title: '2 to 3 Pristine Coral Islands',
              desc: 'Explore postcard-perfect cayes including Isla Perro Chico, famous for its offshore shipwreck reef bustling with marine life.',
            },
            {
              title: 'Natural Pool Sandbank Snorkel',
              desc: 'Wade waist-deep in open ocean on a shallow sandbank surrounded by starfish and turquoise transparency.',
            },
            {
              title: 'Traditional Fresh Catch Lunch',
              desc: 'Enjoy authentic whole fried Caribbean catch or fresh chicken with coconut rice and salad, prepared by our Guna hosts.',
            },
            {
              title: 'Roundtrip 4x4 & Boat Logistics',
              desc: 'Effortless early morning pickup from your Panama City hotel in a 4x4 SUV followed by motorboat navigation from Cartí Port.',
            },
          ],
      itinerary: isEs
        ? [
            { time: '5:00 AM – 5:30 AM', title: 'Recogida en Ciudad de Panamá', desc: 'Vehículo 4x4 compartido le recoge en su hotel para cruzar la Serranía del Darién (~2.5 horas).' },
            { time: '8:30 AM – 9:00 AM', title: 'Llegada a Puerto Cartí', desc: 'Revisión en puesto fronterizo, pago de impuestos y abordaje del bote tradicional guna.' },
            { time: '9:30 AM – 12:30 PM', title: 'Primera Isla y Snorkel', desc: 'Navegación al primer cayo de arena blanca. Tiempo libre para baño y snorkel en arrecife.' },
            { time: '12:30 PM – 1:30 PM', title: 'Almuerzo Isleño Recién Preparado', desc: 'Comida típica caribeña servida bajo la sombra de las palmeras frente al mar.' },
            { time: '1:45 PM – 3:00 PM', title: 'Piscina Natural y Segunda Isla', desc: 'Parada en el banco de arena de estrellas de mar y visita al siguiente cayo del itinerario.' },
            { time: '3:30 PM – 7:00 PM', title: 'Regreso a Ciudad de Panamá', desc: 'Navegación de retorno al puerto y traslado por carretera hasta su punto de origen.' },
          ]
        : [
            { time: '5:00 AM – 5:30 AM', title: 'Panama City Hotel Pickup', desc: 'Shared 4x4 SUV pickup from your hotel or residence to cross the mountain range (~2.5 hrs).' },
            { time: '8:30 AM – 9:00 AM', title: 'Arrival at Cartí Port', desc: 'Comarca checkpoint pass, port fee processing, and boarding our licensed Guna motorboat.' },
            { time: '9:30 AM – 12:30 PM', title: 'First Island Hop & Snorkel', desc: 'Boat navigation to our first idyllic cay. Free time for swimming, sunbathing, and reef exploration.' },
            { time: '12:30 PM – 1:30 PM', title: 'Fresh Island Lunch', desc: 'Traditional fresh catch lunch with coconut rice served beachfront beneath swaying palms.' },
            { time: '1:45 PM – 3:00 PM', title: 'Natural Pool & Second Island', desc: 'Visit the waist-deep starfish sandbank and explore the second scenic island of the day.' },
            { time: '3:30 PM – 7:00 PM', title: 'Return Transfer to Panama City', desc: 'Boat transit back to Cartí Port and 4x4 overland journey returning to your hotel by early evening.' },
          ],
      included: isEs
        ? [
            'Transporte terrestre 4x4 ida y vuelta desde Ciudad de Panamá',
            'Transporte en lancha motora tradicional ida y vuelta desde Puerto Cartí',
            'Almuerzo tradicional recién preparado y una bebida no alcohólica',
            'Visita a 2 o 3 islas designadas según condiciones del día',
            'Parada guiada en la Piscina Natural (banco de estrellas de mar)',
            'Impuestos de desembarque en las islas visitadas del itinerario',
            'Capitán y guía local guna autorizado',
          ]
        : [
            'Roundtrip 4x4 SUV ground transfer from Panama City hotel/residence',
            'Roundtrip motorboat transit between Cartí Port and itinerary islands',
            'Freshly prepared traditional island lunch and one non-alcoholic drink',
            'Visits to 2 to 3 designated coral sand islands',
            'Guided stop at the Natural Pool (Piscina Natural starfish sandbank)',
            'Island landing fees on all scheduled itinerary stops',
            'Licensed and experienced local Guna boat captain and guide',
          ],
      excluded: isEs
        ? [
            'Impuesto de entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales; en efectivo)',
            'Tasa portuaria municipal ($5 por persona; en efectivo)',
            'Bebidas embotelladas adicionales, cervezas o aperitivos personales',
            'Alquiler de máscara de snorkel (se recomienda traer la propia)',
            'Compras personales y artesanías (molas hechas a mano)',
          ]
        : [
            'Comarca Guna Yala checkpoint entry fee ($22 foreign / $7 national; payable in cash)',
            'Municipal port tax ($5 per person; payable in cash)',
            'Additional bottled sodas, beers, or personal snacks',
            'Snorkel gear rental (we strongly recommend bringing your own mask)',
            'Personal souvenirs and handcrafted Guna molas',
          ],
      faqs: isEs
        ? [
            {
              q: '¿Es realmente posible conocer San Blas en un solo día desde Ciudad de Panamá?',
              a: 'Sí, totalmente. Al salir entre 5:00 AM y 5:30 AM en vehículo 4x4, se llega a Puerto Cartí a las 8:30 AM. Esto permite disfrutar de más de 6 horas completas de sol, navegación entre islas y snorkel antes de emprender el regreso a media tarde.',
            },
            {
              q: '¿Qué documentos son obligatorios para viajar?',
              a: 'Es estrictamente obligatorio llevar el pasaporte físico original vigente (o cédula nacional para panameños). Las autoridades tradicionales de la Comarca rechazan categóricamente copias digitales o fotografías en el teléfono.',
            },
            {
              q: '¿Qué sucede si hay mal tiempo o restricciones de navegación?',
              a: 'Operamos en estricto cumplimiento de las directrices de SINAPROC y la Capitanía de Puerto. En caso de cierre oficial de puerto por oleaje o mal tiempo, se ofrece reprogramación sin penalización o reembolso íntegro de la excursión.',
            },
            {
              q: '¿Cuánto dinero en efectivo debo llevar?',
              a: 'En toda la comarca Guna Yala no existen cajeros automáticos ni terminales de tarjetas. Debe llevar efectivo en billetes pequeños (USD $1, $5, $10, $20) para el impuesto comarcal ($22 extranjeros / $7 panameños), tasa de puerto ($5) y bebidas o artesanías.',
            },
          ]
        : [
            {
              q: 'Is a day trip from Panama City enough time to enjoy San Blas?',
              a: 'Yes, absolutely. Departing between 5:00 AM and 5:30 AM by 4x4 puts you at Cartí Port by 8:30 AM. This gives you over 6 full hours on the islands, swimming, snorkeling, and relaxing on coral beaches before heading back in the afternoon.',
            },
            {
              q: 'What travel documents are required at the checkpoint?',
              a: 'An original physical passport with at least 6 months validity (or Panamanian cédula) is mandatory. Border authorities strictly reject photocopies or photos on smartphones.',
            },
            {
              q: 'What happens in case of rough weather or marine advisories?',
              a: 'We operate in strict coordination with SINAPROC and maritime port authorities. If an official port closure occurs due to high swells, free rescheduling or a complete refund is provided.',
            },
            {
              q: 'How much cash should I bring on a day trip?',
              a: 'There are zero ATMs or card terminals in Guna Yala. Bring small US Dollar bills ($1, $5, $10, $20) to cover the entrance fee ($22 foreigner / $7 resident), port tax ($5), and any cold drinks or molas.',
            },
          ],
    },

    'overnight-stays': {
      h1: isEs
        ? 'Estadías y Cabañas en Islas San Blas'
        : 'San Blas Overnight Stays & Island Experiences',
      tagline: isEs
        ? 'Duerma frente al mar en cabañas tradicionales de madera y paja. Desconexión auténtica, cielo estrellado y el ritmo pausado de las comunidades gunas.'
        : 'Sleep steps from the Caribbean surf in traditional beachfront and overwater cabanas. Untamed Caribbean stars, digital detox, and authentic Guna hospitality.',
      heroImage: '/pictures/04 Franklin.jpg',
      heroAlt: isEs
        ? 'Cabañas rústicas sobre la arena de una isla de San Blas'
        : 'Traditional beachfront cabanas on white sand coral island in San Blas',
      category: 'overnight' as ExperienceCategory,
      ctaText: isEs ? 'Consultar Estadía en Cabaña' : 'Check Cabana Availability',
      breadcrumbs: isEs ? 'Estadías en Isla' : 'Overnight Stays',
      highlights: isEs
        ? [
            {
              title: 'Cabañas Frente al Mar y Sobre el Agua',
              desc: 'Alojamientos rústicos construidos en madera autóctona y paja de palma, ubicados directamente sobre la arena blanca o suspendidos sobre la laguna turquesa.',
            },
            {
              title: 'Opciones con Baño Privado y Compartido',
              desc: 'Cabañas en islas como Chichime Grande con baño privado en suite, o cabañas tradicionales con servicios higiénicos compartidos bien mantenidos.',
            },
            {
              title: 'Plan de 3 Comidas Diarias Incluidas',
              desc: 'Desayunos, almuerzos y cenas preparados con pesca fresca local, plátano, arroz con coco y frutas tropicales servidos por familias anfitrionas.',
            },
            {
              title: 'Excursiones Diarias en Bote',
              desc: 'Cada día de su estadía incluye una excursión en lancha hacia cayos vecinos deshabitados, arrecifes de coral y la Piscina Natural.',
            },
          ]
        : [
            {
              title: 'Beachfront & Overwater Cabanas',
              desc: 'Rustic island dwellings built with local hardwood and thatched palm roofs, positioned directly on the sand or standing over the shallow lagoon.',
            },
            {
              title: 'Private & Shared Bathroom Options',
              desc: 'Choose comfortable cabins with ensuite private bathrooms (such as on Isla Chichime Grande) or authentic traditional shared facility stays.',
            },
            {
              title: 'All Daily Meals Included',
              desc: 'Full island board featuring fresh seafood, coconut rice, fried plantains, and tropical fruit prepared by local Guna families.',
            },
            {
              title: 'Daily Boat Excursions to Outer Cays',
              desc: 'Every full day of your stay includes guided boat trips to neighboring uninhabited islands, barrier reef drop-offs, and starfish sandbanks.',
            },
          ],
      itinerary: isEs
        ? [
            { time: 'Día 1: Mañana', title: 'Traslado y Llegada a la Isla', desc: 'Salida 5:00 AM de Ciudad de Panamá en 4x4. Llegada a la isla asignada hacia las 10:00 AM y bienvenida por su anfitrión.' },
            { time: 'Día 1: Tarde', title: 'Almuerzo y Excursión en Bote', desc: 'Almuerzo fresco de bienvenida. Paseo en lancha para hacer snorkel en arrecifes cercanos y relajarse en playas vírgenes.' },
            { time: 'Día 1: Noche', title: 'Cena y Cielo Estrellado', desc: 'Cena típica en el comedor isleño. Noche apacible sin contaminación lumínica al arrullo de las olas del Caribe.' },
            { time: 'Días Intermedios', title: 'Días Completos de Desconexión', desc: 'Desayuno, nueva excursión a islas exteriores, tiempo de lectura, nado en aguas cristalinas y descanso total.' },
            { time: 'Día Final', title: 'Desayuno y Retorno', desc: 'Desayuno isleño. Salida en bote hacia Cartí Port (o late checkout opcional con almuerzo) y retorno a Ciudad de Panamá.' },
          ]
        : [
            { time: 'Day 1: Morning', title: 'Overland & Sea Transit', desc: '5:00 AM 4x4 departure from Panama City. Arrive on your host island by 10:00 AM, check in, and meet your local hosts.' },
            { time: 'Day 1: Afternoon', title: 'Lunch & Island Boat Excursion', desc: 'Fresh seafood lunch followed by an afternoon motorboat trip to nearby snorkeling reefs and secluded beaches.' },
            { time: 'Day 1: Evening', title: 'Dinner & Starlit Ocean Serenity', desc: 'Family-style dinner in the thatched dining area. Zero light pollution beneath Caribbean stars with waves breaking on the reef.' },
            { time: 'Intermediate Days', title: 'Full Days of Island Living', desc: 'Breakfast, morning boat navigation to outer cayes, swimming in calm lagoons, reading, and complete digital detox.' },
            { time: 'Departure Day', title: 'Morning Breakfast & Return Transfer', desc: 'Breakfast, morning boat transit to Cartí Port (or optional afternoon late checkout), arriving in Panama City by early evening.' },
          ],
      included: isEs
        ? [
            'Alojamiento en cabaña de playa (privada o compartida según reserva)',
            'Transporte terrestre compartido en 4x4 ida y vuelta desde Ciudad de Panamá',
            'Transporte marítimo compartido ida y vuelta desde Puerto Cartí a la isla',
            'Plan completo de comidas (Día 1: Almuerzo, Cena; Días completos: Desayuno, Almuerzo, Cena; Día salida: Desayuno)',
            'Excursión guiada diaria en bote a cayos y arrecifes cercanos',
            'Atención personalizada y coordinación directa con Petra',
          ]
        : [
            'Beach cabin accommodation (private or shared bathroom as selected)',
            'Shared round-trip 4x4 ground transportation from Panama City',
            'Shared round-trip motorboat transit between Cartí Port and host island',
            'Complete meal plan (Day 1: Lunch, Dinner; Intermediate days: Breakfast, Lunch, Dinner; Final day: Breakfast)',
            'Daily guided island-hopping boat excursions to reefs and neighboring cays',
            'Personal travel coordination and pre-arrival verification by Petra',
          ],
      excluded: isEs
        ? [
            'Entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales en efectivo)',
            'Tasa portuaria ($5 por persona en efectivo)',
            'Bebidas embotelladas, cervezas, sodas y gastos personales',
            'Salida tardía opcional después del mediodía con almuerzo ($35 por persona)',
          ]
        : [
            'Guna Yala entrance checkpoint fee ($22 foreign / $7 resident in cash)',
            'Port tax ($5 per person in cash)',
            'Bottled beverages, beers, sodas, and personal snacks',
            'Optional afternoon late checkout with extra lunch ($35 per person)',
          ],
      faqs: isEs
        ? [
            {
              q: '¿Cómo son las cabañas y qué servicios tienen?',
              a: 'Son cabañas rústicas tradicionales de madera y paja. Cuentan con camas, mosquiteros y suelo de arena o madera. La electricidad proviene de paneles solares o generadores en horarios específicos (habitualmente de 6:30 PM a 10:00 PM).',
            },
            {
              q: '¿Hay agua dulce y cómo son los baños?',
              a: 'Las islas cuentan con depósitos de agua dulce para duchas y aseo. Cabañas como las de Chichime Grande ofrecen baños privados en suite, mientras que otras islas utilizan baños compartidos higiénicos.',
            },
            {
              q: '¿Hay señal de teléfono o internet Wi-Fi en las islas?',
              a: 'La señal celular es débil y la mayoría de las islas no disponen de conexión Wi-Fi. Recomendamos asumir el viaje como una valiosa oportunidad de desconexión digital en la naturaleza.',
            },
            {
              q: '¿Qué tipo de equipaje debo empacar?',
              a: 'Recomendamos maletas flexibles, bolsos deportivos o mochilas medianas. Las maletas rígidas de gran tamaño son difíciles de acomodar en las lanchas tradicionales. No olvide linterna de mano y batería externa (power bank).',
            },
          ]
        : [
            {
              q: 'What are the cabins like and what amenities are provided?',
              a: 'Cabins are authentic eco-rustic structures built from local wood and thatched palm. They feature comfortable beds, mosquito nets, and natural ventilation. Electricity is powered by solar or generators during scheduled evening hours (typically 6:30 PM–10:00 PM).',
            },
            {
              q: 'Is there fresh water and how do the bathrooms work?',
              a: 'Host islands have freshwater reserves for rinsing and showering. Properties like Chichime Grande feature private ensuite bathrooms with flushing toilets, while other islands have shared facilities.',
            },
            {
              q: 'Is there Wi-Fi or reliable phone coverage?',
              a: 'Cellular reception is faint and most outer islands have no Wi-Fi. We encourage guests to embrace a true digital detox away from emails and screens.',
            },
            {
              q: 'What type of luggage should I bring for an overnight stay?',
              a: 'Pack soft duffel bags or backpacks. Large hard-shell rolling suitcases are difficult to handle on small motorboats. Essential packing includes a headlamp/flashlight, portable power bank, and biodegradable toiletries.',
            },
          ],
    },

    'sailing': {
      h1: isEs
        ? 'Veleros y Catamaranes en San Blas Panamá'
        : 'San Blas Sailing & Private Charters',
      tagline: isEs
        ? 'Navegue por el archipiélago a bordo de veleros monocasco y catamaranes privados. Atolones vírgenes, fondeos en lagunas turquesas y cocina a bordo.'
        : 'Sail the outer barrier reefs aboard private catamarans and classic sailboats. Secluded anchorages, untouched lagoons, and all-inclusive nautical living.',
      heroImage: '/pictures/catamaran.jpg',
      heroAlt: isEs
        ? 'Catamarán fondeado en aguas cristalinas de Cayos Holandeses San Blas'
        : 'Private catamaran anchored in crystal clear lagoon in Cayos Holandeses San Blas',
      category: 'sailing' as ExperienceCategory,
      ctaText: isEs ? 'Solicitar Cotización de Velero' : 'Request Private Sailing Quote',
      breadcrumbs: isEs ? 'Veleros y Catamaranes' : 'Sailing Charters',
      highlights: isEs
        ? [
            {
              title: 'Navegación Exclusiva a Vela',
              desc: 'Impulsados por el viento caribeño, explore atolones alejados del turismo masivo como Cayos Holandeses, Coco Bandero y Cambombia.',
            },
            {
              title: 'Veleros Monocasco y Catamaranes',
              desc: 'Embarcaciones privadas con cabinas dobles independientes, salón interior, cubierta para tomar sol y auxiliar semirrígido (dinghy).',
            },
            {
              title: 'Capitán Dedicado y Pensión Completa',
              desc: 'Patrón profesional a cargo de la navegación y comidas gourmet preparadas a bordo con mariscos frescos, langosta en temporada y cocina internacional.',
            },
            {
              title: 'Equipo Náutico y Deportes Acuáticos',
              desc: 'Uso libre de tablas de paddleboard (SUP), equipos de snorkel completos para arrecifes profundos y kayaks para explorar cayos solitarios.',
            },
          ]
        : [
            {
              title: 'Exclusive Wind-Powered Cruising',
              desc: 'Harness the trade winds to reach untouched outer atolls beyond the reach of standard day tours, including Cayos Holandeses and Coco Bandero.',
            },
            {
              title: 'Private Monohull & Catamaran Options',
              desc: 'Charters featuring private double cabins, spacious salons, open trampolines, shaded cockpits, and motorized dinghies for island landings.',
            },
            {
              title: 'Dedicated Skipper & Full Board',
              desc: 'Experienced captain and crew managing all navigation, with fresh meals prepared daily featuring Caribbean seafood, tropical fruit, and provisions.',
            },
            {
              title: 'Water Sports Gear Included',
              desc: 'Complimentary stand-up paddleboards (SUP), complete snorkeling gear for deep reef drop-offs, and kayaks for exploring uninhabited islets.',
            },
          ],
      itinerary: isEs
        ? [
            { time: 'Día 1: Embarque', title: 'Recepción y Navegación Inicial', desc: 'Traslado en 4x4 desde Ciudad de Panamá hasta el puerto, embarque en el velero, cóctel de bienvenida y primer fondeo en aguas tranquilas.' },
            { time: 'Día 2: Atolones Exteriores', title: 'Cayos Holandeses y Arrecife Profundo', desc: 'Navegación matutina hacia la barrera exterior. Snorkel en aguas de 20 metros de visibilidad y paddleboard entre cayos vírgenes.' },
            { time: 'Día 3: Coco Bandero', title: 'Playas Secretas y Noche Fondeados', desc: 'Visita a pequeños cayos de arena con palmeras solitarias. Atardecer caribeño en cubierta y cena bajo el firmamento.' },
            { time: 'Días Adicionales', title: 'Itinerario a la Medida', desc: 'Flexibilidad total para navegar hacia comunidades tradicionales o fondear en bahías completamente desiertas.' },
            { time: 'Día Final: Desembarque', title: 'Último Baño y Retorno', desc: 'Desayuno a bordo, navegación de vuelta a puerto Cartí y traslado 4x4 de regreso a Ciudad de Panamá.' },
          ]
        : [
            { time: 'Day 1: Embarkation', title: 'Welcome Aboard & First Anchorage', desc: 'Morning 4x4 transfer from Panama City to port, dinghy transfer to your charter boat, welcome briefing, and initial sail to a calm protected cay.' },
            { time: 'Day 2: Outer Barrier Reefs', title: 'Cayos Holandeses & Deep Wall Snorkel', desc: 'Morning navigation under sail to outer atolls. Snorkel in crystal clarity with 20+ meter visibility and paddleboard between untouched sandbanks.' },
            { time: 'Day 3: Coco Bandero Cays', title: 'Secluded Cays & Sunset Dining', desc: 'Anchor in picturesque turquoise lagoons. Swim to uninhabited micro-islets, enjoy sundowners on deck, and dine under canopy of stars.' },
            { time: 'Extended Days', title: 'Fully Personalized Voyage', desc: 'Complete flexibility to tailor stops: visit remote traditional Guna villages, fish offshore, or remain anchored in tranquil seclusion.' },
            { time: 'Final Day: Disembarkation', title: 'Final Morning Swim & Homeward Transit', desc: 'Breakfast on deck, short morning sail to Cartí Port, and private or shared 4x4 return journey back to Panama City.' },
          ],
      included: isEs
        ? [
            'Uso exclusivo del velero o catamarán privado con tripulación',
            'Capitán experimentado a cargo de la navegación y seguridad marítima',
            'Todas las comidas a bordo (desayunos, almuerzos, cenas y aperitivos)',
            'Agua purificada, café, té y refrescos a bordo',
            'Uso libre de tablas de paddleboard (SUP) y equipo de snorkel',
            'Bote auxiliar con motor para desembarques en las islas',
            'Combustible del barco y tasas de fondeo en la comarca',
          ]
        : [
            'Exclusive private charter of sailboat or catamaran with crew',
            'Licensed captain managing navigation, anchoring, and maritime safety',
            'Full board meals prepared on board (breakfast, lunch, dinner, and snacks)',
            'Filtered water, coffee, tea, and non-alcoholic refreshments',
            'Complimentary use of stand-up paddleboards (SUP) and snorkeling masks',
            'Motorized dinghy for island shore landings and beach visits',
            'Boat fuel, marine insurance, and comarca anchorage permits',
          ],
      excluded: isEs
        ? [
            'Transporte terrestre 4x4 desde Ciudad de Panamá al puerto (coordinado por separado)',
            'Impuesto de entrada a la Comarca Guna Yala ($22 extranjeros / $7 nacionales en efectivo)',
            'Tasa de puerto ($5 por persona en efectivo)',
            'Bebidas alcohólicas especiales (los clientes pueden traer sus botellas preferidas)',
            'Propinas para la tripulación',
          ]
        : [
            '4x4 overland transfer between Panama City and Cartí Port (coordinated upon request)',
            'Guna Yala entrance checkpoint fee ($22 foreign / $7 resident cash)',
            'Port tax ($5 per person cash)',
            'Special alcoholic beverages or spirits (guests welcome to bring preferences aboard)',
            'Crew gratuities',
          ],
      faqs: isEs
        ? [
            {
              q: '¿Cuál es la diferencia entre un catamarán y un velero monocasco?',
              a: 'El catamarán cuenta con dos cascos, lo que le otorga mayor estabilidad, menos escora (inclinación) al navegar, mayor espacio en cubierta y salón más amplio. El velero monocasco ofrece la sensación náutica clásica y romántica de la navegación tradicional.',
            },
            {
              q: '¿Es seguro navegar en San Blas?',
              a: 'San Blas se encuentra completamente fuera del cinturón de huracanes del Caribe. Sus aguas interiores están protegidas por extensas barreras de coral que disipan el oleaje oceánico, ofreciendo fondeos en calma absoluta.',
            },
            {
              q: '¿Cómo se coordina el traslado hasta el barco?',
              a: 'Coordinamos su traslado en 4x4 desde cualquier hotel en Ciudad de Panamá hasta Puerto Cartí. Al llegar, el auxiliar del barco (dinghy) o una lancha local le trasladará directamente al velero.',
            },
            {
              q: '¿Puedo personalizar el itinerario de navegación?',
              a: 'Sí. Todos los chárteres son privados y adaptables a sus preferencias de viaje. Petra y el capitán diseñarán el itinerario óptimo según los días contratados y el estado del viento.',
            },
          ]
        : [
            {
              q: 'What is the difference between a catamaran and a monohull sailboat?',
              a: 'A catamaran has twin hulls providing exceptional stability, virtually zero heel (tilting) while under sail, spacious deck trampolines, and a large central salon. A monohull provides a romantic, classic sailing feel favored by sailing purists.',
            },
            {
              q: 'Is sailing in San Blas safe from storms?',
              a: 'San Blas lies entirely outside the Caribbean hurricane belt. Furthermore, the archipelago is buffered by hundreds of coral reefs that block open ocean swells, creating calm, lake-like anchorages.',
            },
            {
              q: 'How do we reach the sailboat from Panama City?',
              a: 'We coordinate round-trip 4x4 transfers from any hotel or residence in Panama City to Cartí Port. Upon arrival, the boat dinghy or licensed Guna launch transfers you directly to your yacht.',
            },
            {
              q: 'Can we customize our sailing route and island stops?',
              a: 'Yes, absolutely. Because our charters are 100% private, you dictate the pace. Petra and your captain will recommend the best outer atolls based on weather, wind, and your travel wishes.',
            },
          ],
    },
  };

  const currentContent = content[experienceType];

  const handleOpenCategoryBooking = () => {
    onOpenBooking(currentContent.category);
  };

  const getSiblingExperience = (target: LandingExperienceType) => {
    if (target === 'day-trips') {
      return {
        url: isEs ? '/es/san-blas-day-trips' : '/san-blas-day-trips',
        title: isEs ? 'Pasadías en San Blas' : 'Day Trips from Panama City',
        desc: isEs ? 'Excursión de día completo visitando 2-3 islas y la Piscina Natural.' : 'Full-day island hopping visiting coral reefs and starfish sandbanks.',
        img: '/pictures/10 Boat Day Tour.jpg',
      };
    }
    if (target === 'overnight-stays') {
      return {
        url: isEs ? '/es/san-blas-overnight-stays' : '/san-blas-overnight-stays',
        title: isEs ? 'Estadías y Cabañas en Isla' : 'Overnight Island Stays',
        desc: isEs ? 'Alojamiento en cabañas rústicas de playa con comidas y paseos diarios.' : 'Beachfront cabana stays with 3 daily meals and guided boat excursions.',
        img: '/pictures/04 Franklin.jpg',
      };
    }
    return {
      url: isEs ? '/es/san-blas-sailing' : '/san-blas-sailing',
      title: isEs ? 'Veleros y Catamaranes' : 'Sailing & Private Charters',
      desc: isEs ? 'Navegación privada a vela por atolones vírgenes y Cayos Holandeses.' : 'Private liveaboard charters navigating remote outer atolls with captain.',
      img: '/pictures/catamaran.jpg',
    };
  };

  const sibling1Key: LandingExperienceType = experienceType === 'day-trips' ? 'overnight-stays' : 'day-trips';
  const sibling2Key: LandingExperienceType = experienceType === 'sailing' ? 'overnight-stays' : 'sailing';

  const sibling1 = getSiblingExperience(sibling1Key);
  const sibling2 = getSiblingExperience(sibling2Key);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F2] text-[#173D36] selection:bg-[#E2D2BB] selection:text-[#173D36] font-sans">
      {/* 1. Header Navigation */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        onOpenPlanner={handleOpenCategoryBooking}
      />

      {/* 2. Hero Editorial Section */}
      <header className="relative bg-[#071722] text-[#FAF8F2] pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b-2 border-[#C5A46B]/40 overflow-hidden">
        {/* Subtle Decorative Ocean Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#071722] via-[#0B2924]/90 to-[#071722] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono tracking-wider text-[#C8AC75]">
            <a
              href={isEs ? '/?lang=es' : '/'}
              onClick={(e) => {
                e.preventDefault();
                onBackToHome();
              }}
              className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isEs ? 'Inicio' : 'Home'}</span>
            </a>
            <span className="text-[#C8AC75]/40">/</span>
            <span className="text-white font-medium">{currentContent.breadcrumbs}</span>
          </nav>

          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A46B]/15 border border-[#C5A46B]/30 text-[11px] font-mono tracking-widest uppercase text-[#E2D2BB]">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A46B]" />
            <span>{isEs ? 'Comarca Guna Yala · Gestión y Operación Local' : 'Guna Yala Comarca · Authentic Local Operation'}</span>
          </div>

          {/* Main Primary H1 Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-normal text-white tracking-tight max-w-4xl leading-tight">
            {currentContent.h1}
          </h1>

          {/* Lead Paragraph */}
          <p className="text-base sm:text-lg md:text-xl text-[#E2D2BB] font-serif italic max-w-3xl leading-relaxed">
            {currentContent.tagline}
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <button
              onClick={handleOpenCategoryBooking}
              className="px-8 py-3.5 bg-[#C5A46B] text-[#071722] text-xs sm:text-sm font-semibold uppercase tracking-wider rounded-xl hover:bg-[#d8b87d] transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>{currentContent.ctaText}</span>
            </button>
            <a
              href="#itinerary"
              className="px-6 py-3.5 bg-white/10 text-[#FAF8F2] hover:text-white text-xs sm:text-sm font-semibold uppercase tracking-wider rounded-xl hover:bg-white/15 transition-colors border border-white/20 flex items-center justify-center gap-2 text-center"
            >
              <span>{isEs ? 'Ver Itinerario y Logística' : 'View Itinerary & Logistics'}</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* 3. Editorial Visual Showcase */}
      <section className="relative -mt-8 sm:-mt-12 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl border-2 border-[#C5A46B]/30 p-2 sm:p-3 shadow-2xl overflow-hidden">
          <div className="relative aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden bg-[#071722]">
            <img
              src={currentContent.heroImage}
              alt={currentContent.heroAlt}
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-4 left-4 right-4 text-white text-xs sm:text-sm font-serif italic flex items-center justify-between">
              <span>{isEs ? 'Archipiélago de Guna Yala, Panamá' : 'Guna Yala Archipelago, Panama'}</span>
              <span className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#C8AC75]">
                {isEs ? 'Fotografía Original' : 'Original Photography'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Experience Highlights Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-20 w-full">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#C5A46B] font-semibold block">
            {isEs ? 'Aspectos Destacados' : 'Experience Highlights'}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#173D36]">
            {isEs ? 'Por Qué Esta Experiencia es Única' : 'What Makes This Experience Special'}
          </h2>
          <p className="text-sm sm:text-base text-[#4A5568] leading-relaxed">
            {isEs
              ? 'Guna Yala es una comarca indígena autónoma protegida. Viaje con anfitriones nativos respetando las normas comarcales y la conservación marina.'
              : 'Guna Yala is a self-governed indigenous territory. Travel with authentic native hosts supporting cultural preservation and coral stewardship.'}
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {currentContent.highlights.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E2D2BB] rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#173D36]/10 text-[#173D36] flex items-center justify-center font-serif font-bold text-sm">
                  0{idx + 1}
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-bold text-[#173D36]">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed font-light">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 5. Detailed Itinerary & Timeline */}
        <section id="itinerary" className="bg-[#FAF8F5] border border-[#C5A46B]/40 rounded-3xl p-6 sm:p-10 md:p-12 space-y-8 scroll-mt-28">
          <div className="space-y-2 border-b border-[#E2D2BB] pb-6">
            <span className="text-xs font-mono uppercase tracking-widest text-[#0E3B2F] font-semibold block">
              {isEs ? 'Logística y Cronograma' : 'Step-by-Step Logistics'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0E3B2F]">
              {isEs ? 'Itinerario de la Experiencia' : 'Experience Timeline & Itinerary'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4A5568]">
              {isEs
                ? 'Detalle de horarios y traslados para asegurar una travesía cómoda, puntual y sin contratiempos.'
                : 'Exact schedule and transfers coordinated to ensure a seamless, punctual Caribbean journey.'}
            </p>
          </div>

          <div className="space-y-6">
            {currentContent.itinerary.map((step, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 border-l-2 border-[#C5A46B] pl-4 sm:pl-6 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#C5A46B] absolute -left-[6px] top-1.5" />
                <div className="sm:w-44 shrink-0 font-mono text-xs font-semibold text-[#C5A46B] tracking-wider">
                  {step.time}
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-serif font-bold text-[#173D36] text-base">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A5568] font-light leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Inclusions vs Exclusions */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#173D36]">
              {isEs ? 'Transparencia de Tarifas y Servicios' : 'Package Inclusions & Checkpoint Requirements'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4A5568]">
              {isEs
                ? 'Conozca con total claridad qué incluye su paquete y qué importes se abonan en efectivo en el sitio.'
                : 'Know exactly what is covered in your package and what fees are payable in cash on site.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Included */}
            <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
                <h3 className="text-lg font-serif font-bold text-emerald-950">
                  {isEs ? 'Qué Incluye el Paquete' : 'What is Included'}
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-[#2D3748]">
                {currentContent.included.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Excluded & Checkpoint */}
            <div className="bg-white border-2 border-amber-600/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-amber-100 pb-4">
                <AlertCircle className="w-6 h-6 text-amber-700 shrink-0" />
                <h3 className="text-lg font-serif font-bold text-amber-950">
                  {isEs ? 'No Incluido · Pagos en Efectivo' : 'Excluded · Cash Payments on Site'}
                </h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-[#2D3748]">
                {currentContent.excluded.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-amber-700 font-bold">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-amber-100 text-[11px] text-amber-900/80 leading-relaxed italic">
                {isEs
                  ? '* Recordatorio: En la Comarca Guna Yala no existen cajeros automáticos ni terminales de tarjetas. El pasaporte físico original es obligatorio para la entrada.'
                  : '* Mandatory Reminder: There are zero ATMs or card terminals in Guna Yala. Original physical passport is mandatory at the border checkpoint.'}
              </div>
            </div>
          </div>
        </section>

        {/* 7. Frequently Asked Questions */}
        <section className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#C5A46B] font-semibold">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#173D36]">
              {isEs ? 'Preguntas Frecuentes de Viajeros' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-xs sm:text-sm text-[#4A5568]">
              {isEs ? 'Respuestas claras y honestas a las dudas habituales.' : 'Clear and honest answers to common traveler questions.'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {currentContent.faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E2D2BB] rounded-xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-serif font-bold text-sm sm:text-base text-[#173D36] hover:bg-[#FAF8F5] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-[#C5A46B] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#4A5568] leading-relaxed border-t border-[#FAF8F2] font-light">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 8. Conversion Call to Action Banner */}
        <section className="bg-gradient-to-r from-[#071722] via-[#0B2924] to-[#071722] text-[#FAF8F2] rounded-3xl p-8 sm:p-12 md:p-16 border-2 border-[#C5A46B] shadow-2xl space-y-6 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A46B]/20 text-[11px] font-mono tracking-widest uppercase text-[#E2D2BB]">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A46B]" />
            <span>{isEs ? 'Reserva Garantizada con Petra' : 'Guaranteed Booking with Petra'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-normal text-white max-w-2xl mx-auto leading-tight">
            {isEs
              ? 'Comience a Planificar su Viaje a Guna Yala'
              : 'Begin Planning Your Unforgettable Guna Yala Journey'}
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#E2D2BB] max-w-xl mx-auto font-light leading-relaxed">
            {isEs
              ? 'Complete el formulario con sus fechas y número de viajeros. Petra verificará la disponibilidad y le enviará los detalles oficiales de su cotización.'
              : 'Submit your dates and group size. Petra will personally verify island capacity and provide your official itinerary quotation.'}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleOpenCategoryBooking}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#C5A46B] text-[#071722] text-xs sm:text-sm font-semibold uppercase tracking-wider rounded-xl hover:bg-[#d8b87d] transition-all duration-200 shadow-lg cursor-pointer flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>{currentContent.ctaText}</span>
            </button>
            <a
              href="https://wa.me/50764443649"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 bg-white/10 text-white text-xs sm:text-sm font-semibold uppercase tracking-wider rounded-xl hover:bg-white/15 transition-colors border border-[#C5A46B]/40 flex items-center justify-center gap-2"
            >
              <span>WhatsApp: +507 6444-3649</span>
            </a>
          </div>
        </section>

        {/* 9. Cross-Navigation to Sibling Experiences */}
        <section className="space-y-6 pt-4 border-t border-[#E2D2BB]">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-widest text-[#C5A46B] font-semibold">
              {isEs ? 'Otras Formas de Viajar' : 'Other Ways to Experience Guna Yala'}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#173D36]">
              {isEs ? 'Explore Nuestras Otras Experiencias' : 'Explore Our Other Island Experiences'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sibling 1 */}
            <a
              href={sibling1.url}
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', sibling1.url);
                window.dispatchEvent(new Event('popstate'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white border border-[#E2D2BB] hover:border-[#C5A46B] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#071722]">
                <img src={sibling1.img} alt={sibling1.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A46B] font-semibold block">
                  {isEs ? 'Ver Experiencia' : 'View Experience'}
                </span>
                <h3 className="font-serif font-bold text-base text-[#173D36] group-hover:text-[#C5A46B] transition-colors truncate">
                  {sibling1.title}
                </h3>
                <p className="text-xs text-[#4A5568] line-clamp-2 font-light">
                  {sibling1.desc}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#C5A46B] shrink-0 group-hover:translate-x-1 transition-transform" />
            </a>

            {/* Sibling 2 */}
            <a
              href={sibling2.url}
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', sibling2.url);
                window.dispatchEvent(new Event('popstate'));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="bg-white border border-[#E2D2BB] hover:border-[#C5A46B] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group cursor-pointer"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-[#071722]">
                <img src={sibling2.img} alt={sibling2.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#C5A46B] font-semibold block">
                  {isEs ? 'Ver Experiencia' : 'View Experience'}
                </span>
                <h3 className="font-serif font-bold text-base text-[#173D36] group-hover:text-[#C5A46B] transition-colors truncate">
                  {sibling2.title}
                </h3>
                <p className="text-xs text-[#4A5568] line-clamp-2 font-light">
                  {sibling2.desc}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-[#C5A46B] shrink-0 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </section>
      </main>

      {/* 10. Footer */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        onOpenPlanner={handleOpenCategoryBooking}
      />
    </div>
  );
};
