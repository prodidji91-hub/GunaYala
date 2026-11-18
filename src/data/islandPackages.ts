export interface IslandPackageDetail {
  id: string;
  name: string;
  title: string;
  subtitle: { en: string; es: string };
  description: { en: string; es: string };
  accommodation: { en: string; es: string };
  highlights: { en: string[]; es: string[] };
  firstNightRate: { en: string; es: string };
  additionalNightRate: { en: string; es: string };
  isPriceOnRequest?: boolean;
  image: string;
  isVerifiedImage: boolean;
  optionalActivity?: { en: string; es: string };
  packageInclusions: {
    included: { en: string[]; es: string[] };
    excluded: { en: string[]; es: string[] };
    transportation: { en: string; es: string };
    meals: { en: string; es: string };
    excursions: { en: string; es: string };
  };
}

export const ISLAND_PACKAGES: IslandPackageDetail[] = [
  {
    id: 'chichime-grande',
    name: 'Chichime Grande',
    title: 'CHICHIME ISLAND',
    subtitle: {
      en: 'Unwind. Explore. Recharge.',
      es: 'Desconecta. Explora. Recarga.',
    },
    description: {
      en: 'Discover a peaceful Caribbean escape on one of Guna Yala’s larger islands, where white sand beaches, crystal-clear waters, and a relaxed atmosphere invite you to reconnect with nature.',
      es: 'Descubre un pacífico refugio caribeño en una de las islas más grandes de Guna Yala, donde las playas de arena blanca, aguas cristalinas y un ambiente relajado te invitan a reconectarte con la naturaleza.',
    },
    accommodation: {
      en: 'Private beach cabin with private bathroom.',
      es: 'Cabaña privada de playa con baño privado.',
    },
    highlights: {
      en: [
        'Private Beach Cabins — Oceanfront cabin accommodation with private bathroom facilities.',
        'Shared Round-Trip Transportation — Coordinated 4×4 SUV transfer from Panama City & boat transfers.',
        'Traditional Island Meals — Arrival lunch/dinner, daily full board, and departure breakfast.',
        'Included Boat Excursion — Shared excursion to a nearby island and the Natural Pool with local Guna guide.',
      ],
      es: [
        'Cabañas Privadas de Playa — Alojamiento frente al mar con baño privado.',
        'Traslados Compartidos Ida y Vuelta — Transporte 4×4 coordinado desde Ciudad de Panamá y lancha.',
        'Comidas Tradicionales de la Isla — Almuerzo/cena de llegada, pensión completa y desayuno de salida.',
        'Excursión en Bote Incluida — Recorrido compartido a isla cercana y Piscina Natural con guía local guna.',
      ],
    },
    firstNightRate: {
      en: 'FROM USD $259 per person',
      es: 'DESDE USD $259 por persona',
    },
    additionalNightRate: {
      en: 'FROM USD $119 per person (Additional nights)',
      es: 'DESDE USD $119 por persona (Noches adicionales)',
    },
    isPriceOnRequest: false,
    image: '/pictures/10 Boat Day Tour.jpg',
    isVerifiedImage: true,
    optionalActivity: {
      en: 'Optional Add-On: Afternoon departure around 03:00 PM with lunch included: USD $35 per person (cabin vacated by 08:00 AM; luggage stored securely). Seasonal lobster lunch from USD $20.',
      es: 'Opción adicional: Salida por la tarde alrededor de las 03:00 PM con almuerzo incluido: USD $35 por persona (entrega de cabaña a las 08:00 AM; equipaje guardado de forma segura). Almuerzo con langosta de temporada desde USD $20.',
    },
    packageInclusions: {
      included: {
        en: [
          'Private beach cabin with private bathroom',
          'Shared round-trip 4×4 transportation from Panama City',
          'Pickup/drop-off at a Panama City hotel, Airbnb, or residence',
          'Shared round-trip boat transfer',
          'Shared excursion to a nearby island and the Natural Pool',
          'Entrance fees to islands visited during the included excursion',
          'Local Guna guide during the excursion',
          'Meals: arrival lunch/dinner; full intermediate days breakfast/lunch/dinner; departure breakfast',
          'Standard morning departure after breakfast (or optional afternoon departure around 03:00 PM for additional USD $35 per person, including lunch)',
        ],
        es: [
          'Cabaña privada de playa con baño privado',
          'Transporte terrestre compartido en 4×4 ida y vuelta desde Ciudad de Panamá',
          'Recogida y retorno en hotel, Airbnb o residencia en Ciudad de Panamá',
          'Traslado marítimo compartido ida y vuelta',
          'Excursión compartida a una isla cercana y la Piscina Natural',
          'Tarifas de entrada a las islas visitadas durante la excursión incluida',
          'Guía local guna durante la excursión',
          'Comidas: llegada almuerzo/cena; días intermedios desayuno/almuerzo/cena; salida desayuno',
          'Salida estándar por la mañana tras el desayuno (o salida opcional por la tarde alrededor de las 03:00 PM por USD $35 adicionales por persona, incluyendo almuerzo)',
        ],
      },
      excluded: {
        en: [
          'Guna Yala territory entrance fee (USD $22 foreign passport holders / USD $7 Panamanian citizens and residents, paid in cash at the border)',
          'Drinks, snacks, and personal expenses',
          'Afternoon departure option around 03:00 PM with lunch: USD $35 per person (cabin checkout by 08:00 AM / luggage stored securely)',
          'Pickup/drop-off outside central Panama City (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: USD $20 per person)',
          'Seasonal fresh lobster lunch upgrade: From USD $20 (subject to availability)',
        ],
        es: [
          'Entrada al territorio de Guna Yala (USD $22 titulares de pasaporte extranjero / USD $7 ciudadanos y residentes panameños, en efectivo en el punto de control/frontera)',
          'Bebidas, aperitivos y gastos personales',
          'Opción de salida por la tarde alrededor de las 03:00 PM con almuerzo: USD $35 por persona (entrega de cabaña a las 08:00 AM / equipaje guardado de forma segura)',
          'Recogida o retorno fuera del centro de Ciudad de Panamá (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: USD $20 por persona)',
          'Mejora con langosta fresca de temporada: Desde USD $20 (sujeto a disponibilidad)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Be ready for pickup around 5:00 AM in a shared 4×4 SUV from your hotel, Airbnb, or residence to Cartí Port, followed by a shared boat transfer to Chichime Grande. Standard return: Depart the island after breakfast, arriving in Panama City around 12:00–1:00 PM. Optional afternoon return ($35): depart island around 03:00 PM with lunch included, arriving in Panama City around 7:30–8:00 PM (cabin must be vacated by 08:00 AM; luggage stored securely). All travel times are approximate depending on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Estar listo para la recogida alrededor de las 5:00 AM en SUV 4×4 compartido desde su hotel, Airbnb o residencia hacia el puerto de Cartí, seguido de traslado en lancha a Chichime Grande. Retorno estándar: salida de la isla tras el desayuno, llegada a Ciudad de Panamá alrededor de 12:00–1:00 PM. Retorno opcional en la tarde ($35): salida de la isla alrededor de las 03:00 PM con almuerzo incluido, llegada a Ciudad de Panamá alrededor de 7:30–8:00 PM (la cabaña debe entregarse a las 08:00 AM; equipaje guardado de forma segura). Todos los tiempos de viaje son aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Traditional island meals included according to stay itinerary: Arrival day (Lunch and dinner), Full intermediate days (Breakfast, lunch, and dinner), Departure day (Breakfast). Fresh fish, chicken, coconut rice, and plantains. Seasonal lobster lunch upgrade available from USD $20.',
        es: 'Comidas tradicionales de la isla incluidas según el itinerario: Día de llegada (Almuerzo y cena), Días intermedios completos (Desayuno, almuerzo y cena), Día de salida (Desayuno). Pescado fresco, pollo, arroz con coco y patacones. Mejora con langosta de temporada disponible desde USD $20.',
      },
      excursions: {
        en: 'Includes a shared boat excursion to a nearby island and the Natural Pool (Piscina Natural), with island entrance fees and local Guna guide included.',
        es: 'Incluye una excursión compartida en lancha a una isla cercana y la Piscina Natural, con tarifas de entrada a islas y guía local guna incluidos.',
      },
    },
  },
  {
    id: 'chichime-chico',
    name: 'Chichime Chico',
    title: 'CHICHIME CHICO',
    subtitle: {
      en: 'Simplicity. Nature. Guna Hospitality.',
      es: 'Simplicidad. Naturaleza. Hospitalidad Guna.',
    },
    description: {
      en: 'Escape to an intimate, peaceful Caribbean cay in Guna Yala. With rustic beachfront cabins set against white coral sands and turquoise waters, Chichime Chico invites you to slow down, disconnect from modern haste, and experience heartfelt local hospitality in a tranquil natural setting.',
      es: 'Escápate a un íntimo y apacible cayo caribeño en Guna Yala. Con cabañas rústicas frente al mar sobre arenas de coral blanco y aguas turquesas, Chichime Chico te invita a pausar el ritmo, desconectar de las prisas y disfrutar de una cálida hospitalidad local en un entorno natural sereno.',
    },
    accommodation: {
      en: 'Rustic beachfront wooden cabins with shared bathroom facilities.',
      es: 'Cabañas rústicas de madera frente al mar con baños compartidos.',
    },
    highlights: {
      en: [
        'Beachfront Rustic Cabins — Ocean-facing wooden cabanas steps from the calm turquoise water with shared bathroom facilities.',
        'Shared Round-Trip Transfers — Coordinated 4×4 SUV transfer from Panama City & boat transfer between Cartí Port and Chichime Chico.',
        'Home-Cooked Traditional Meals — Freshly prepared island dining by local Guna hosts according to stay duration.',
        'Peaceful Reef Surroundings — Relaxed Caribbean coral cay setting ideal for swimming, snorkeling, and unwinding.',
      ],
      es: [
        'Cabañas Rústicas Playeras — Cabañas de madera frente al mar a pocos pasos del agua turquesa con baños compartidos.',
        'Traslados Compartidos Ida y Vuelta — Transporte terrestre 4×4 coordinado desde Ciudad de Panamá y lancha.',
        'Comidas Tradicionales Caseras — Gastronomía isleña recién preparada por anfitriones locales según la estadía.',
        'Entorno de Arrecife Tranquilo — Apacible cayo de coral ideal para nadar, hacer snorkel y descansar.',
      ],
    },
    firstNightRate: {
      en: 'Price on Request',
      es: 'Precio a consultar',
    },
    additionalNightRate: {
      en: 'Rates confirmed upon inquiry based on dates and party size',
      es: 'Tarifas confirmadas bajo solicitud según fechas y número de viajeros',
    },
    isPriceOnRequest: true,
    image: '/pictures/01 Boat Day Tour .jpg',
    isVerifiedImage: false,
    packageInclusions: {
      included: {
        en: [
          'Rustic beachfront wooden cabin accommodation with shared bathroom facilities',
          'Shared round-trip 4×4 ground transportation from Panama City (hotel, Airbnb, or residence pickup and drop-off)',
          'Shared round-trip boat transfer between Cartí Port and Chichime Chico',
          'Traditional home-cooked island meals according to stay duration (catch of the day, chicken, coconut rice, and plantains)',
          'Warm and attentive local Guna family hospitality',
        ],
        es: [
          'Alojamiento en cabaña rústica de madera frente al mar con baños compartidos',
          'Transporte terrestre compartido en 4×4 ida y vuelta desde Ciudad de Panamá (recogida y retorno en hotel, Airbnb o residencia)',
          'Traslado marítimo compartido ida y vuelta entre Puerto Cartí y Chichime Chico',
          'Comidas tradicionales caseras según la duración de la estadía (pesca del día, pollo, arroz con coco y patacones)',
          'Cálida y atenta hospitalidad de la familia local guna',
        ],
      },
      excluded: {
        en: [
          'Guna Yala territory entrance fee (USD $22 foreign passport holders / USD $7 Panamanian citizens and residents, paid in cash at the border)',
          'Drinks, snacks, and personal expenses',
          'Optional island boat excursions (arranged locally upon request with island hosts)',
        ],
        es: [
          'Entrada al territorio de Guna Yala (USD $22 titulares de pasaporte extranjero / USD $7 ciudadanos y residentes panameños, en efectivo en el punto de control/frontera)',
          'Bebidas, aperitivos y gastos personales',
          'Excursiones opcionales en lancha entre islas (coordinadas localmente bajo solicitud con los anfitriones)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Morning pickup starting around 5:00 AM in a shared 4×4 SUV from your accommodation to Cartí Port, followed by a shared boat transfer across the archipelago to Chichime Chico. Return is coordinated on departure day after breakfast, arriving in Panama City around 12:00–1:00 PM. All travel times are approximate depending on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Recogida por la mañana a partir de las 5:00 AM en SUV 4×4 compartido desde su alojamiento hacia el puerto de Cartí, seguido de traslado en lancha a Chichime Chico. El retorno se coordina el día de salida tras el desayuno, llegando a Ciudad de Panamá alrededor de 12:00–1:00 PM. Todos los tiempos de viaje son aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Fresh home-cooked island meals prepared daily by local Guna hosts (catch of the day, chicken, coconut rice, and plantains).',
        es: 'Comidas caseras tradicionales frescas preparadas diariamente por anfitriones locales gunas (pesca del día, pollo, arroz con coco y patacones).',
      },
      excursions: {
        en: 'Direct access to the surrounding coral reef for swimming, snorkeling, and relaxing. Optional boat excursions to neighboring cays and the Natural Pool can be coordinated locally upon request with the island hosts.',
        es: 'Acceso directo al arrecife de coral para nadar, hacer snorkel y relajarse. Excursiones opcionales en lancha a cayos vecinos y la Piscina Natural se pueden coordinar localmente bajo solicitud con los anfitriones.',
      },
    },
  },
  {
    id: 'guasirdub',
    name: 'Guasirdub',
    title: 'GUASIRDUB',
    subtitle: {
      en: 'Peace. Comfort. Tranquility.',
      es: 'Paz. Confort. Tranquilidad.',
    },
    description: {
      en: 'Discover an intimate and serene overwater retreat in Guna Yala. With only three spacious private overwater cabins built over calm turquoise waters, Guasirdub offers a secluded island atmosphere where you can wake up to uninterrupted Caribbean horizon views, gentle ocean breezes, and natural tranquility.',
      es: 'Descubre un íntimo y sereno refugio sobre el agua en Guna Yala. Con solo tres amplias cabañas privadas sobre el agua construidas sobre aguas turquesas y tranquilas, Guasirdub ofrece un ambiente insular reservado donde despertar con vistas ininterrumpidas al horizonte caribeño, la suave brisa del mar y tranquilidad natural.',
    },
    accommodation: {
      en: 'Only three spacious private overwater cabins with shared bathroom facilities.',
      es: 'Solo tres amplias cabañas privadas sobre el agua con baños compartidos.',
    },
    highlights: {
      en: [
        'Three Overwater Cabins — Exclusive, intimate setting with only three private cabins built over calm turquoise waters.',
        'Shared Round-Trip Transportation — Coordinated 4×4 SUV transfer from Panama City & boat transfers included.',
        'Traditional Island Meals — Arrival lunch/dinner, full board on intermediate days, and breakfast AND lunch on final departure day.',
        'Included Boat Excursion — Shared excursion to a nearby island and the Natural Pool with local Guna guide.',
      ],
      es: [
        'Tres Cabañas Sobre el Agua — Exclusivo entorno íntimo con solo tres cabañas privadas construidas sobre aguas turquesas.',
        'Transporte Compartido Ida y Vuelta — Traslado en 4×4 coordinado desde Ciudad de Panamá y lancha incluidos.',
        'Comidas Tradicionales de la Isla — Llegada almuerzo/cena, pensión completa en días intermedios, y desayuno Y almuerzo el día final.',
        'Excursión en Bote Incluida — Recorrido compartido a isla cercana y Piscina Natural con guía local guna.',
      ],
    },
    firstNightRate: {
      en: 'FROM USD $249 per person',
      es: 'DESDE USD $249 por persona',
    },
    additionalNightRate: {
      en: 'FROM USD $119 per person (Additional nights)',
      es: 'DESDE USD $119 por persona (Noches adicionales)',
    },
    isPriceOnRequest: false,
    image: '/pictures/04 Catamaran San Blas Island .jpg',
    isVerifiedImage: false,
    optionalActivity: {
      en: 'Optional Extras: Seasonal fresh lobster lunch from $20. Pickup/drop-off at Westin Playa Bonita, Dreams Playa Bonita, Clayton, Paraíso, Summit, or Gamboa: $20/person. Private 4×4 transport: Price on request.',
      es: 'Extras opcionales: Almuerzo con langosta fresca de temporada desde $20. Recogida/retorno en Westin Playa Bonita, Dreams Playa Bonita, Clayton, Paraíso, Summit o Gamboa: $20/persona. Transporte privado en 4×4: Precio a consultar.',
    },
    packageInclusions: {
      included: {
        en: [
          'Private overwater cabin accommodation with shared bathroom facilities',
          'Shared round-trip 4×4 transportation from Panama City',
          'Pickup/drop-off at a Panama City hotel, Airbnb, or residence',
          'Shared round-trip boat transfer between the port and Guasirdub',
          'Shared excursion to a nearby island and the Natural Pool',
          'Local Guna guide during the excursion',
          'Entrance fees to islands visited during the included excursion',
          'Traditional meals (Arrival: Lunch and dinner; Intermediate days: Breakfast, lunch, dinner; Final day: Breakfast AND lunch)',
        ],
        es: [
          'Alojamiento en cabaña privada sobre el agua con baños compartidos',
          'Transporte terrestre compartido en 4×4 ida y vuelta desde Ciudad de Panamá',
          'Recogida y retorno en hotel, Airbnb o residencia en Ciudad de Panamá',
          'Traslado marítimo compartido ida y vuelta entre el puerto y Guasirdub',
          'Excursión compartida a una isla cercana y la Piscina Natural',
          'Guía local guna durante la excursión',
          'Tarifas de entrada a las islas visitadas durante la excursión incluida',
          'Comidas tradicionales (Llegada: Almuerzo y cena; Días intermedios: Desayuno, almuerzo, cena; Día final: Desayuno Y almuerzo)',
        ],
      },
      excluded: {
        en: [
          'Guna Yala entrance fee: $22 foreign visitors aged 10+ / $7 Panamanian citizens and residents, payable in cash',
          'Drinks, snacks, and personal expenses',
          'Optional seasonal fresh lobster lunch: From $20',
          'Optional private 4×4 transportation: Price on request',
          'Pickup/drop-off outside central Panama City (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: $20 per person)',
        ],
        es: [
          'Entrada a Guna Yala: $22 visitantes extranjeros mayores de 10 años / $7 ciudadanos y residentes panameños, en efectivo',
          'Bebidas, aperitivos y gastos personales',
          'Almuerzo opcional con langosta fresca de temporada: Desde $20',
          'Transporte privado en 4×4 opcional: Precio a consultar',
          'Recogida o retorno fuera del centro de Ciudad de Panamá (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: $20 por persona)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Be ready for pickup at 5:00 AM in a shared 4×4 SUV from your hotel, Airbnb, or residence to Cartí Port, followed by a shared boat transfer to Guasirdub. Cabin check-in is around 2:00–3:00 PM. On the final day, checkout is between 2:00–3:00 PM after lunch, with arrival back in Panama City around 7:00–8:00 PM. All travel times are approximate depending on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Estar listo para la recogida a las 5:00 AM en SUV 4×4 compartido desde su hotel, Airbnb o residencia hacia el puerto de Cartí, seguido de traslado en lancha a Guasirdub. El check-in de la cabaña es alrededor de 2:00–3:00 PM. El último día, el check-out es entre 2:00–3:00 PM tras el almuerzo, llegando a Ciudad de Panamá alrededor de 7:00–8:00 PM. Todos los tiempos de viaje son aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Traditional island meals included: Arrival day (Lunch and dinner), Full intermediate days (Breakfast, lunch, dinner), and Final day (Breakfast AND lunch). Fresh fish, chicken, coconut rice, and plantains. Seasonal lobster lunch upgrade available from $20.',
        es: 'Comidas tradicionales de la isla incluidas: Día de llegada (Almuerzo y cena), Días intermedios completos (Desayuno, almuerzo, cena) y Día final (Desayuno Y almuerzo). Pescado fresco, pollo, arroz con coco y patacones. Mejora con langosta fresca de temporada disponible desde $20.',
      },
      excursions: {
        en: 'Includes a shared boat excursion to a nearby island and the Natural Pool (Piscina Natural), with island entrance fees and local Guna guide included.',
        es: 'Incluye una excursión compartida en lancha a una isla cercana y la Piscina Natural, con tarifas de entrada a islas y guía local guna incluidos.',
      },
    },
  },
  {
    id: 'perro-chico',
    name: 'Perro Chico',
    title: 'PERRO CHICO',
    subtitle: {
      en: 'Relax. Snorkel. Explore.',
      es: 'Relájate. Snorkel. Explora.',
    },
    description: {
      en: 'Famed for its iconic coral-encrusted shipwreck resting just off the beach, Perro Chico is one of Guna Yala’s most celebrated destinations. Experience recently renovated beachfront and overwater cabins with private bathrooms, unwind on the rooftop terrace with stunning sunset views, enjoy the outdoor bar, and snorkel crystal-clear turquoise waters teeming with marine life.',
      es: 'Famosa por su icónico barco hundido cubierto de coral a pocos metros de la orilla, Perro Chico es uno de los destinos más célebres de Guna Yala. Disfruta de cabañas recientemente renovadas frente al mar y sobre el agua con baño privado, relájate en la terraza de la azotea con vistas al atardecer, disfruta del bar al aire libre y explora aguas turquesas llenas de vida marina.',
    },
    accommodation: {
      en: 'Private beachfront or overwater cabin with private bathroom facilities. Recently renovated cabins featuring a rooftop terrace with sunset views and an outdoor bar.',
      es: 'Cabaña privada frente al mar o sobre el agua con baño privado. Cabañas recientemente renovadas con terraza en la azotea con vista al atardecer y bar al aire libre.',
    },
    highlights: {
      en: [
        'Iconic Sunken Shipwreck — World-renowned snorkeling right off the beach teeming with tropical fish and coral.',
        'Renovated Beachfront & Overwater Cabins — Private bathroom facilities, rooftop sunset terrace, and outdoor bar.',
        'Shared Round-Trip Transportation — Coordinated 4×4 SUV transfer from Panama City & boat transfers included.',
        'Natural Pool Boat Excursion — Shared boat tour to nearby islands and the shallow starfish sandbank.',
      ],
      es: [
        'Icónico Barco Hundido — Snorkel de fama mundial a pasos de la orilla entre corales y peces tropicales.',
        'Cabañas Renovadas de Playa y Sobre el Agua — Baño privado, terraza en la azotea para atardeceres y bar al aire libre.',
        'Transporte Compartido Ida y Vuelta — Traslado en 4×4 coordinado desde Ciudad de Panamá y lancha incluidos.',
        'Excursión a la Piscina Natural — Recorrido compartido en lancha a islas cercanas y banco de arena de estrellas de mar.',
      ],
    },
    firstNightRate: {
      en: 'FROM USD $249 per person',
      es: 'DESDE USD $249 por persona',
    },
    additionalNightRate: {
      en: 'FROM USD $109 per person (Additional nights)',
      es: 'DESDE USD $109 por persona (Noches adicionales)',
    },
    isPriceOnRequest: false,
    image: '/pictures/perrochico.jpg',
    isVerifiedImage: true,
    optionalActivity: {
      en: 'Optional Add-Ons: Afternoon island departure until 3:00 PM including lunch: USD $35 per person (cabin vacated by 8:00 AM; luggage securely stored). Seasonal fresh lobster lunch from USD $20. Pickup/drop-off at Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, or Gamboa: USD $20/person. Private 4×4 transportation: Price on request.',
      es: 'Opciones adicionales: Salida de la isla por la tarde hasta las 3:00 PM con almuerzo incluido: USD $35 por persona (entrega de cabaña a las 8:00 AM; equipaje guardado de forma segura). Almuerzo con langosta fresca de temporada desde USD $20. Recogida/retorno en Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit o Gamboa: USD $20/persona. Transporte privado en 4×4: Precio a consultar.',
    },
    packageInclusions: {
      included: {
        en: [
          'Private beachfront or overwater cabin with private bathroom',
          'Shared round-trip 4×4 transportation from Panama City',
          'Pickup and drop-off at hotel, Airbnb, or residence within Panama City',
          'Shared round-trip boat transfer to Perro Chico',
          'Shared boat excursion to nearby islands and the Natural Pool',
          'Local Guna guide during the excursion',
          'Entrance fees to islands visited during the excursion',
          'Traditional island meals (Arrival day: Lunch and dinner; Intermediate days: Breakfast, lunch, dinner; Final day: Breakfast)',
          'Standard morning checkout on departure day',
        ],
        es: [
          'Cabaña privada frente al mar o sobre el agua con baño privado',
          'Transporte terrestre compartido en 4×4 ida y vuelta desde Ciudad de Panamá',
          'Recogida y retorno en hotel, Airbnb o residencia dentro de Ciudad de Panamá',
          'Traslado marítimo compartido ida y vuelta a Perro Chico',
          'Excursión compartida en lancha a islas cercanas y la Piscina Natural',
          'Guía local guna durante la excursión',
          'Tarifas de entrada a las islas visitadas durante la excursión',
          'Comidas tradicionales de la isla (Llegada: Almuerzo y cena; Días intermedios: Desayuno, almuerzo, cena; Día final: Desayuno)',
          'Salida estándar por la mañana el día de partida',
        ],
      },
      excluded: {
        en: [
          'Guna Yala territory entrance fee (USD $22 foreign visitors aged 10+ / USD $7 Panamanian citizens and residents, paid in cash at checkpoint)',
          'Drinks, snacks, and personal expenses',
          'Afternoon island departure option until 3:00 PM including lunch: USD $35 per person (cabin checkout by 8:00 AM; luggage stored securely)',
          'Optional private 4×4 transportation: Price on request',
          'Seasonal fresh lobster lunch upgrade: From USD $20',
          'Pickup/drop-off outside central Panama City (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: USD $20 per person)',
        ],
        es: [
          'Entrada al territorio de Guna Yala (USD $22 visitantes extranjeros mayores de 10 años / USD $7 ciudadanos y residentes panameños, en efectivo en el punto de control)',
          'Bebidas, aperitivos y gastos personales',
          'Opción de salida por la tarde hasta las 3:00 PM con almuerzo incluido: USD $35 por persona (entrega de cabaña a las 8:00 AM; equipaje guardado de forma segura)',
          'Transporte privado en 4×4 opcional: Precio a consultar',
          'Mejora con langosta fresca de temporada: Desde USD $20',
          'Recogida o retorno fuera del centro de Ciudad de Panamá (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: USD $20 por persona)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Be ready for pickup at approximately 5:00 AM in a shared 4×4 SUV from your hotel, Airbnb, or residence to Cartí Port, followed by a shared boat transfer to Perro Chico. Standard return: Depart the island after breakfast, arriving in Panama City around 12:00–1:00 PM. Optional afternoon departure ($35/person): Leave island around 3:00 PM with lunch included, arriving in Panama City around 7:30–8:00 PM (cabin must be vacated by 8:00 AM; luggage is securely stored). All times are approximate depending on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Estar listo para la recogida aproximadamente a las 5:00 AM en SUV 4×4 compartido desde su hotel, Airbnb o residencia hacia el puerto de Cartí, seguido de traslado en lancha a Perro Chico. Retorno estándar: salida de la isla tras el desayuno, llegando a Ciudad de Panamá alrededor de 12:00–1:00 PM. Salida opcional por la tarde ($35/persona): salida de la isla alrededor de las 3:00 PM con almuerzo incluido, llegando a Ciudad de Panamá alrededor de 7:30–8:00 PM (la cabaña debe entregarse a las 8:00 AM; el equipaje se guarda de forma segura). Todos los horarios son aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Traditional island meals included: Arrival day (Lunch and dinner), Full intermediate days (Breakfast, lunch, dinner), Departure day (Breakfast). Fresh catch of the day, chicken, coconut rice, fried plantains, and salad. Seasonal fresh lobster upgrade available from USD $20.',
        es: 'Comidas tradicionales de la isla incluidas: Día de llegada (Almuerzo y cena), Días intermedios completos (Desayuno, almuerzo, cena), Día de salida (Desayuno). Pesca fresca del día, pollo, arroz con coco, patacones y ensalada. Mejora con langosta fresca de temporada disponible desde USD $20.',
      },
      excursions: {
        en: 'Direct swimming and snorkeling access to the famous offshore shipwreck teeming with marine life, plus a shared boat excursion to nearby islands and the Natural Pool (Piscina Natural) shallow sandbank with local Guna guide.',
        es: 'Acceso directo a nado y snorkel en el famoso barco hundido repleto de vida marina, más una excursión compartida en lancha a islas cercanas y la Piscina Natural con guía local guna.',
      },
    },
  },
  {
    id: 'franklin-island',
    name: 'Franklin Island',
    title: 'FRANKLIN ISLAND',
    subtitle: {
      en: 'Relax. Connect. Explore.',
      es: 'Relájate. Conecta. Explora.',
    },
    description: {
      en: 'Known for its welcoming community spirit and pristine palm-fringed shoreline, Franklin Island offers an authentic Caribbean experience. Stay in private rustic wood-and-thatch beachfront cabins stepping directly onto white coral sands, unwind in a friendly communal atmosphere with beach gatherings and evening bonfires, and enjoy calm turquoise waters perfect for swimming, snorkeling, and reef exploration.',
      es: 'Conocida por su cálido espíritu comunitario y su orilla bordeada de palmeras, Isla Franklin ofrece una auténtica experiencia caribeña. Hospédate en cabañas privadas rústicas de madera y paja con acceso directo a la arena blanca, relájate en un acogedor ambiente comunitario con reuniones y fogatas nocturnas, y disfruta de aguas turquesas ideales para nadar, hacer snorkel y explorar arrecifes.',
    },
    accommodation: {
      en: 'Private rustic beachfront cabin with shared bathroom facilities.',
      es: 'Cabaña privada rústica frente al mar con baños compartidos.',
    },
    highlights: {
      en: [
        'Beachfront Rustic Cabins — Private wood-and-thatch cabins stepping directly onto white coral sands with shared bathroom facilities.',
        'Social Island Atmosphere — Friendly, welcoming communal vibe with beach gatherings and evening bonfires.',
        'Shared Round-Trip Transfers — Coordinated 4×4 SUV overland transfer and island boat taxi included.',
        'Natural Pool Boat Excursion — Guided boat tour to nearby islands and the Natural Pool shallow sandbank.',
      ],
      es: [
        'Cabañas Rústicas Playeras — Cabañas privadas de madera y paja con acceso directo a la arena blanca y baños compartidos.',
        'Ambiente Isleño Social — Cálido ambiente comunitario con reuniones en la playa y fogatas nocturnas.',
        'Traslados Compartidos Ida y Vuelta — Transporte terrestre 4×4 coordinado y taxi marítimo incluidos.',
        'Excursión a la Piscina Natural — Recorrido guiado en lancha a islas cercanas y el banco de arena de la Piscina Natural.',
      ],
    },
    firstNightRate: {
      en: 'FROM USD $229 per person',
      es: 'DESDE USD $229 por persona',
    },
    additionalNightRate: {
      en: 'FROM USD $79 per person (Additional nights)',
      es: 'DESDE USD $79 por persona (Noches adicionales)',
    },
    isPriceOnRequest: false,
    image: '/pictures/04 Franklin.jpg',
    isVerifiedImage: true,
    optionalActivity: {
      en: 'Optional Add-Ons: Afternoon island departure until 3:00 PM including lunch: $25/person (cabin vacated by 8:00 AM; luggage securely stored). Cultural visit to a traditional Guna community: $35/person. Seasonal lobster lunch: $15–$20/person.',
      es: 'Opciones adicionales: Salida de la isla por la tarde hasta las 3:00 PM con almuerzo incluido: $25/persona (entrega de cabaña a las 8:00 AM; equipaje guardado de forma segura). Visita cultural a una comunidad tradicional guna: $35/persona. Almuerzo con langosta de temporada: $15–$20/persona.',
    },
    packageInclusions: {
      included: {
        en: [
          'Private rustic beachfront cabin accommodation with shared bathroom facilities',
          'Shared round-trip 4×4 transportation from Panama City',
          'Pickup/drop-off at a Panama City hotel, Airbnb, or residence',
          'Shared round-trip boat transfer between Cartí Port and Franklin Island',
          'One shared boat excursion to nearby islands and the Natural Pool',
          'Local Guna guide during the excursion',
          'Entrance fees to islands visited during the excursion',
          'Meals: arrival lunch and dinner; full intermediate days breakfast, lunch, dinner; final day breakfast',
          'Standard morning checkout on departure day',
        ],
        es: [
          'Alojamiento en cabaña privada rústica frente al mar con baños compartidos',
          'Transporte terrestre compartido en 4×4 ida y vuelta desde Ciudad de Panamá',
          'Recogida y retorno en hotel, Airbnb o residencia en Ciudad de Panamá',
          'Traslado marítimo compartido ida y vuelta entre Puerto Cartí e Isla Franklin',
          'Una excursión compartida en lancha a islas cercanas y la Piscina Natural',
          'Guía local guna durante la excursión',
          'Tarifas de entrada a las islas visitadas durante la excursión',
          'Comidas: llegada almuerzo y cena; días intermedios desayuno, almuerzo, cena; día final desayuno',
          'Salida estándar por la mañana el día de partida',
        ],
      },
      excluded: {
        en: [
          'Guna Yala entrance fee: $22 foreign visitors aged 10+ / $7 Panamanian citizens and residents, payable in cash',
          'Drinks, snacks, and personal expenses',
          'Afternoon island departure option until 3:00 PM including lunch: $25 per person (cabin vacated by 8:00 AM; luggage securely stored)',
          'Cultural visit to a traditional Guna community: $35 per person',
          'Seasonal lobster lunch: $15–$20 per person',
          'Optional private 4×4 transportation: Price on request',
          'Pickup/drop-off outside central Panama City (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: $20 per person)',
        ],
        es: [
          'Entrada a Guna Yala: $22 visitantes extranjeros mayores de 10 años / $7 ciudadanos y residentes panameños, en efectivo',
          'Bebidas, aperitivos y gastos personales',
          'Salida opcional por la tarde hasta las 3:00 PM con almuerzo incluido: $25 por persona (entrega de cabaña a las 8:00 AM; equipaje guardado de forma segura)',
          'Visita cultural a una comunidad tradicional guna: $35 por persona',
          'Almuerzo con langosta de temporada: $15–$20 por persona',
          'Transporte privado en 4×4 opcional: Precio a consultar',
          'Recogida o retorno fuera del centro de Ciudad de Panamá (Westin Playa Bonita, Dreams, Clayton, Paraíso, Summit, Gamboa: $20 por persona)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Be ready for pickup at 5:00 AM in a shared 4×4 SUV from your hotel, Airbnb, or residence to Cartí Port, followed by a shared boat transfer to Franklin Island. Standard morning return: Depart after breakfast, arriving in Panama City around 12:00–1:00 PM. Optional afternoon return ($25/person): Depart island around 3:00 PM with lunch included, arriving in Panama City around 7:30–8:00 PM (cabin must be vacated by 8:00 AM; luggage can be securely stored). All travel times are approximate depending on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Estar listo para la recogida a las 5:00 AM en SUV 4×4 compartido desde su hotel, Airbnb o residencia hacia el puerto de Cartí, seguido de traslado en lancha a Isla Franklin. Retorno estándar por la mañana: salida tras el desayuno, llegando a Ciudad de Panamá alrededor de 12:00–1:00 PM. Retorno opcional en la tarde ($25/persona): salida de la isla alrededor de las 3:00 PM con almuerzo incluido, llegando a Ciudad de Panamá alrededor de 7:30–8:00 PM (la cabaña debe entregarse a las 8:00 AM; el equipaje se guarda de forma segura). Todos los tiempos de viaje son aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Traditional island meals included according to stay: Arrival day (Lunch and dinner), Full intermediate days (Breakfast, lunch, dinner), Departure day (Breakfast). Catch of the day, chicken, coconut rice, and plantains. Optional seasonal lobster lunch upgrade: $15–$20 per person.',
        es: 'Comidas tradicionales de la isla incluidas según la estadía: Día de llegada (Almuerzo y cena), Días intermedios completos (Desayuno, almuerzo, cena), Día de salida (Desayuno). Pesca del día, pollo, arroz con coco y patacones. Mejora opcional de langosta de temporada: $15–$20 por persona.',
      },
      excursions: {
        en: 'Includes one shared boat excursion to nearby islands and the Natural Pool (Piscina Natural) shallow sandbank, with island entrance fees and local Guna guide included. Optional cultural visit to a traditional Guna community available for $35 per person.',
        es: 'Incluye una excursión compartida en lancha a islas cercanas y la Piscina Natural, con tarifas de entrada a islas y guía local guna incluidos. Visita cultural opcional a una comunidad tradicional guna disponible por $35 por persona.',
      },
    },
  },
  {
    id: 'yansailadub',
    name: 'Yansailadub',
    title: 'YANSAILADUB ISLAND',
    subtitle: {
      en: 'Wake Up Above the Caribbean.',
      es: 'Despierta Sobre el Caribe.',
    },
    description: {
      en: 'Escape to the peaceful rhythm of island life on Yansailadub, where private overwater cabins overlook beautiful turquoise Caribbean waters. Spend your days relaxing on the beach, exploring nearby islands, and reconnecting with nature. This intimate Guna Yala experience combines simple island living, traditional meals, and warm local hospitality.',
      es: 'Escápate al ritmo apacible de la vida insular en Yansailadub, donde cabañas privadas sobre el agua contemplan hermosas aguas turquesas del Caribe. Pasa tus días relajándote en la playa, explorando islas cercanas y reconectando con la naturaleza. Esta íntima experiencia en Guna Yala combina la sencillez de la vida isleña, comidas tradicionales y una cálida hospitalidad local.',
    },
    accommodation: {
      en: 'Private overwater cabin with shared bathroom facilities.',
      es: 'Cabaña privada sobre el agua con baños compartidos.',
    },
    highlights: {
      en: [
        'Private Overwater Cabins — Wake up directly above beautiful turquoise Caribbean waters.',
        'Shared Round-Trip Transportation — 4×4 SUV transfer from Panama City & boat transfer included.',
        'Traditional Island Meals — Arrival lunch/dinner, daily full board, and departure breakfast.',
        'Included Boat Excursion — Shared boat tour to nearby islands and the Natural Pool with local Guna guide.',
      ],
      es: [
        'Cabañas Privadas Sobre el Agua — Despierta directamente sobre hermosas aguas turquesas del Caribe.',
        'Transporte Compartido Ida y Vuelta — Traslado 4×4 desde Ciudad de Panamá y lancha incluidos.',
        'Comidas Tradicionales de la Isla — Almuerzo/cena de llegada, pensión completa y desayuno de salida.',
        'Excursión en Bote Incluida — Recorrido a islas cercanas y Piscina Natural con guía local guna.',
      ],
    },
    firstNightRate: {
      en: 'FROM USD $229 per person',
      es: 'DESDE USD $229 por persona',
    },
    additionalNightRate: {
      en: 'FROM USD $109 per person (Additional nights)',
      es: 'DESDE USD $109 por persona (Noches adicionales)',
    },
    isPriceOnRequest: false,
    image: '/pictures/piscinanat.jpg',
    isVerifiedImage: false,
    optionalActivity: {
      en: 'Optional Add-On: Afternoon Island Checkout until 3:00 PM with lunch included: USD $35 per person (cabin vacated by 8:00 AM; luggage stored while enjoying the island). Seasonal lobster lunch upgrade from USD $20.',
      es: 'Opción adicional: Salida tardía de la isla hasta las 3:00 PM con almuerzo incluido: USD $35 por persona (entrega de cabaña a las 8:00 AM; equipaje guardado mientras disfruta la isla). Almuerzo con langosta de temporada desde USD $20.',
    },
    packageInclusions: {
      included: {
        en: [
          'Private overwater cabin with shared bathroom facilities',
          'Shared round-trip 4×4 transportation between Panama City and the Guna Yala port (hotel, Airbnb, or residence pickup and drop-off)',
          'Shared round-trip boat transfer between the port and Yansailadub',
          'Shared boat excursion to nearby islands and the Natural Pool (Piscina Natural)',
          'Traditional island meals (Arrival day: Lunch and dinner; Full intermediate days: Breakfast, lunch, dinner; Departure day: Breakfast)',
          'Entrance fees to islands visited during the included excursion',
          'Local Guna guide during the excursion',
          'Morning checkout on the departure day',
        ],
        es: [
          'Alojamiento en cabaña privada sobre el agua con baños compartidos',
          'Transporte terrestre compartido en 4×4 ida y vuelta entre Ciudad de Panamá y el puerto (recogida y retorno en hotel, Airbnb o residencia)',
          'Traslado marítimo compartido ida y vuelta entre el puerto y Yansailadub',
          'Excursión compartida en lancha a islas cercanas y la Piscina Natural',
          'Comidas tradicionales de la isla (Llegada: Almuerzo y cena; Días intermedios: Desayuno, almuerzo, cena; Salida: Desayuno)',
          'Tarifas de entrada a las islas visitadas durante la excursión incluida',
          'Guía local guna durante la excursión',
          'Salida por la mañana el día de partida',
        ],
      },
      excluded: {
        en: [
          'Guna Yala territory entrance fee: USD $22 per person (foreign visitors 10+ yrs) / USD $7 (Panamanian citizens & residents), payable in cash at checkpoint',
          'Afternoon Island Checkout option until 3:00 PM with lunch included: USD $35 per person (cabin checkout by 8:00 AM / luggage stored)',
          'Private 4×4 transportation option: Price on request',
          'Seasonal fresh lobster lunch upgrade: From USD $20 (subject to availability)',
          'Pickup/drop-off in Westin Playa Bonita, Dreams Playa Bonita, Clayton, Paraíso, Summit, or Gamboa: USD $20 per person',
          'Drinks, snacks, and other personal expenses',
        ],
        es: [
          'Entrada al territorio de Guna Yala: USD $22 por persona (visitantes extranjeros 10+ años) / USD $7 (ciudadanos y residentes panameños), en efectivo en el punto de control',
          'Opción de salida tardía hasta las 3:00 PM con almuerzo incluido: USD $35 por persona (entrega de cabaña a las 8:00 AM / equipaje guardado)',
          'Opción de transporte 4×4 privado: Precio bajo solicitud',
          'Mejora con langosta fresca de temporada: Desde USD $20 (sujeto a disponibilidad)',
          'Recogida o retorno en Westin Playa Bonita, Dreams Playa Bonita, Clayton, Paraíso, Summit o Gamboa: USD $20 por persona',
          'Bebidas personales, aperitivos y otros gastos personales',
        ],
      },
      transportation: {
        en: 'Panama City departure: Pickup ready at approx. 5:00 AM in a shared 4×4 SUV from your hotel or residence to Guna Yala port, followed by a shared boat transfer to Yansailadub. Standard return: Depart island after breakfast, arriving in Panama City approx. 12:00–1:00 PM. Optional afternoon return ($35): depart island approx. 3:00 PM with lunch included, arriving Panama City approx. 7:30–8:00 PM (cabin must be vacated by 8:00 AM; luggage stored securely). All timing is approximate based on weather, sea conditions, and road traffic.',
        es: 'Salida de Ciudad de Panamá: Recogida lista aprox. 5:00 AM en SUV 4×4 compartido hacia el puerto de Guna Yala, seguido de traslado en lancha a Yansailadub. Retorno estándar de mañana: salida tras el desayuno, llegada a Ciudad de Panamá aprox. 12:00–1:00 PM. Retorno opcional en la tarde ($35): salida de la isla aprox. 3:00 PM con almuerzo incluido, llegada a Ciudad de Panamá aprox. 7:30–8:00 PM (la cabaña se entrega a las 8:00 AM; equipaje guardado de forma segura). Horarios aproximados según clima, mar y tráfico.',
      },
      meals: {
        en: 'Traditional island meals included according to stay duration: Arrival day (Lunch and dinner), Full intermediate days (Breakfast, lunch, and dinner), Departure day (Breakfast). Fresh fish, chicken, coconut rice, and plantains. Seasonal lobster lunch upgrade available from USD $20.',
        es: 'Comidas tradicionales incluidas según duración de la estadía: Día de llegada (Almuerzo y cena), Días intermedios completos (Desayuno, almuerzo y cena), Día de salida (Desayuno). Pescado fresco, pollo, arroz con coco y patacones. Mejora de langosta fresca disponible desde USD $20 en temporada.',
      },
      excursions: {
        en: 'Includes shared boat excursion to nearby islands and the Natural Pool (Piscina Natural) shallow sandbank, with island landing fees and local Guna guide included.',
        es: 'Incluye excursión compartida en lancha a islas cercanas y la piscina natural de arena poco profunda, con tarifas de entrada a islas y guía local guna incluidos.',
      },
    },
  },
  {
    id: 'nurdub-community',
    name: 'Nurdub Community',
    title: 'NURDUB COMMUNITY',
    subtitle: {
      en: 'Culture. Community. Immersion.',
      es: 'Cultura. Comunidad. Inmersión.',
    },
    description: {
      en: 'Experience authentic Guna community life through traditional island accommodation, heartfelt local hospitality, and genuine cultural heritage in an indigenous archipelago village.',
      es: 'Vive la auténtica vida comunitaria guna a través de alojamiento tradicional, una cálida hospitalidad local y un genuino patrimonio cultural en una aldea indígena del archipiélago.',
    },
    accommodation: {
      en: 'Traditional rustic Guna cabana with shared community facilities (details confirmed upon inquiry).',
      es: 'Cabaña rústica tradicional guna con instalaciones comunitarias compartidas (detalles confirmados bajo consulta).',
    },
    highlights: {
      en: [
        'Authentic Guna Village Life — Immerse yourself in the daily rhythms, heritage, and warmth of a traditional indigenous island community.',
        'Traditional Handcrafted Cabins — Rustic island accommodation built in the authentic Guna architectural style.',
        'Guna Cultural Heritage — Cultural immersion with local families, traditional storytelling, and artisan heritage.',
        'Archipelago Surroundings — Peaceful island setting surrounded by Caribbean waters and natural coral reefs.',
      ],
      es: [
        'Auténtica Vida en Aldea Guna — Sumérgete en los ritmos diarios, el patrimonio y la calidez de una comunidad indígena tradicional.',
        'Cabañas Tradicionales Artesanales — Alojamiento rústico insular construido en el auténtico estilo arquitectónico guna.',
        'Patrimonio Cultural Guna — Inmersión cultural con familias locales, historias tradicionales y patrimonio artesanal.',
        'Entorno del Archipiélago — Apacible entorno isleño rodeado de aguas caribeñas y arrecifes naturales.',
      ],
    },
    firstNightRate: {
      en: 'Price on Request',
      es: 'Precio a consultar',
    },
    additionalNightRate: {
      en: 'Rates confirmed upon inquiry based on dates and community availability',
      es: 'Tarifas confirmadas bajo solicitud según fechas y disponibilidad de la comunidad',
    },
    isPriceOnRequest: true,
    image: '/pictures/Gunamola.jpg',
    isVerifiedImage: false,
    optionalActivity: {
      en: 'Cultural workshops such as traditional Mola textile arts and guided community interactions may be coordinated upon inquiry, subject to artisan availability.',
      es: 'Talleres culturales como el arte textil tradicional de Molas e interacciones comunitarias guiadas pueden coordinarse bajo consulta, sujetos a disponibilidad de artesanas locales.',
    },
    packageInclusions: {
      included: {
        en: [
          'Traditional Guna island community stay',
          'Coordinated round-trip 4×4 overland transport from Panama City',
          'Coordinated round-trip boat transfer between the port and community island',
          'Home-cooked traditional meals according to stay duration',
          'Warm welcome and cultural introduction by local host family',
        ],
        es: [
          'Estadía tradicional en comunidad isleña guna',
          'Transporte terrestre coordinado en 4×4 ida y vuelta desde Ciudad de Panamá',
          'Traslado marítimo coordinado en lancha ida y vuelta entre el puerto y la comunidad',
          'Comidas tradicionales caseras según la duración de la estadía',
          'Cálida bienvenida e introducción cultural por la familia anfitriona local',
        ],
      },
      excluded: {
        en: [
          'Guna Yala territory entrance fee (USD $22 foreign visitors aged 10+ / USD $7 Panamanian citizens and residents, paid in cash at checkpoint)',
          'Drinks, snacks, and personal expenses',
          'Optional artisan workshops and cultural activities (coordinated upon request)',
        ],
        es: [
          'Entrada al territorio de Guna Yala (USD $22 visitantes extranjeros mayores de 10 años / USD $7 ciudadanos y residentes panameños, en efectivo en el punto de control)',
          'Bebidas, aperitivos y gastos personales',
          'Talleres artesanales opcionales y actividades culturales (coordinados bajo solicitud)',
        ],
      },
      transportation: {
        en: 'Panama City departure: Morning pickup from your accommodation in a shared 4×4 SUV to Cartí Port, followed by a boat transfer to the Nurdub community. Return details and schedules confirmed upon booking inquiry.',
        es: 'Salida de Ciudad de Panamá: Recogida por la mañana desde su alojamiento en SUV 4×4 hacia el puerto de Cartí, seguido de traslado en lancha a la comunidad de Nurdub. Horarios y detalles de retorno confirmados bajo consulta de reserva.',
      },
      meals: {
        en: 'Traditional home-cooked meals prepared by community hosts with local fish, coconut rice, and comarca produce.',
        es: 'Comidas tradicionales caseras preparadas por anfitriones de la comunidad con pesca local, arroz con coco y productos de la comarca.',
      },
      excursions: {
        en: 'Village cultural orientation with opportunities to explore surrounding island shallows and reef environments. Additional excursions coordinated upon request.',
        es: 'Orientación cultural en la aldea con oportunidades para explorar arrecifes cercanos. Excursiones adicionales coordinadas bajo solicitud.',
      },
    },
  },
];
