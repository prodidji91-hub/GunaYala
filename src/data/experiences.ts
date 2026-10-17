import { Experience } from '../types';

export const EXPERIENCES_DATA: Experience[] = [
  {
    id: 'day-trip-classic',
    category: 'day-trip',
    title: {
      en: 'Classic San Blas Island Hopping Day Trip',
      es: 'Excursión de Un Día por las Islas de San Blas',
    },
    subtitle: {
      en: 'Full-day Caribbean immersion visiting pristine islands and natural starfish sandbanks',
      es: 'Inmersión caribeña de día completo visitando islas vírgenes y bancos de arena naturales',
    },
    duration: {
      en: 'Full Day (approx. 5:00 AM – 7:00 PM return)',
      es: 'Día Completo (aprox. 5:00 AM – 7:00 PM regreso)',
    },
    suitableFor: {
      en: 'Travelers with limited time in Panama wanting a genuine Caribbean island experience',
      es: 'Viajeros con tiempo limitado en Panamá que desean una auténtica experiencia caribeña',
    },
    overview: {
      en: 'An organized day excursion from Panama City into the Guna Yala archipelago. You will travel across the Serranía del Darién mountains to the Caribbean coast, board a traditional Guna boat, and visit multiple idyllic coral islands, including the shallow natural swimming pool sandbar.',
      es: 'Una excursión organizada de un día desde la Ciudad de Panamá hacia el archipiélago de Guna Yala. Viajará a través de las montañas hasta la costa del Caribe, abordará un bote tradicional guna y visitará múltiples islas de coral idílicas, incluyendo la piscina natural.',
    },
    highlights: {
      en: [
        'Visit to 2 to 3 pristine coral sand islands',
        'Swimming and snorkeling at the Natural Pool (Piscina Natural) sandbank',
        'Freshly prepared traditional island lunch (fresh fish or chicken with coconut rice)',
        'Experienced local Guna boat captain and guide',
      ],
      es: [
        'Visita a 2 o 3 islas vírgenes de arena de coral',
        'Nado y snorkel en el banco de arena de la Piscina Natural',
        'Almuerzo tradicional isleño recién preparado (pescado o pollo fresco con arroz con coco)',
        'Capitán de bote y guía local guna experimentado',
      ],
    },
    transportation: {
      en: 'Shared 4x4 SUV transfer from your Panama City accommodation to Cartí port (approx. 2.5 hrs), followed by Guna motor boat transfers between islands.',
      es: 'Traslado en 4x4 compartido desde su alojamiento en Ciudad de Panamá hasta el puerto de Cartí (aprox. 2.5 hrs), seguido de traslados en bote guna entre islas.',
    },
    included: {
      en: [
        'Roundtrip 4x4 transportation from Panama City',
        'Roundtrip boat transportation from Cartí port to islands',
        'Traditional island lunch and one non-alcoholic beverage',
        'Visit to designated islands and natural swimming pool',
        'Island landing fees on itinerary islands',
      ],
      es: [
        'Transporte 4x4 ida y vuelta desde Ciudad de Panamá',
        'Transporte en bote ida y vuelta desde puerto Cartí hacia las islas',
        'Almuerzo tradicional de la isla y una bebida no alcohólica',
        'Visita a las islas del itinerario y a la piscina natural',
        'Tarifas de entrada a las islas visitadas',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Personal drinks, snacks, and souvenirs (handcrafted molas)',
        'Snorkel mask (recommended to bring your own or confirm rental in advance)',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Bebidas personales, aperitivos y artesanías (molas hechas a mano)',
        'Equipo de snorkel (se recomienda traer el propio o confirmar alquiler previo)',
      ],
    },
    pricingNote: {
      en: 'Rates are confirmed per person upon inquiry based on pickup location and party size.',
      es: 'Las tarifas se confirman por persona al consultar según el punto de recogida y el número de viajeros.',
    },
    importantInfo: {
      en: [
        'Original physical passport is mandatory at the comarca checkpoint (copies or digital photos are strictly rejected).',
        'There are no ATM machines or card terminals anywhere in Guna Yala; bring US Dollar cash in small denominations ($1, $5, $10, $20).',
        '4x4 vehicles depart very early (approx. 5:00 AM–5:30 AM) to maximize island daylight.',
      ],
      es: [
        'El pasaporte físico original es obligatorio en el punto de control de la comarca (no se aceptan copias ni fotos).',
        'No hay cajeros automáticos ni terminales de tarjetas en Guna Yala; lleve efectivo en dólares en billetes pequeños ($1, $5, $10, $20).',
        'Los vehículos 4x4 parten muy temprano (aprox. 5:00 AM–5:30 AM) para aprovechar la luz natural en las islas.',
      ],
    },
    whatToBring: {
      en: [
        'Physical passport (valid for 6 months)',
        'Cash in small bills (USD)',
        'Swimwear, rashguard, and quick-drying beach towel',
        'Reef-safe sunscreen and sunglasses',
        'Waterproof dry bag for phone, camera, and valuables',
        'Personal water bottle and any preferred snacks',
      ],
      es: [
        'Pasaporte físico (vigente por 6 meses)',
        'Dinero en efectivo en billetes de baja denominación (USD)',
        'Traje de baño y toalla de secado rápido',
        'Protector solar respetuoso con el arrecife y gafas de sol',
        'Bolsa impermeable para teléfono, cámara y objetos de valor',
        'Botella de agua personal y aperitivos preferidos',
      ],
    },
    imageType: 'day-trip',
  },
  {
    id: 'overnight-island-stay',
    category: 'overnight',
    title: {
      en: 'Authentic Island Cabana Overnight Stay',
      es: 'Estadía Nocturna en Cabaña Tradicional de Isla',
    },
    subtitle: {
      en: 'Sleep steps from the Caribbean sea in rustic beachfront cabanas under unpolluted starry skies',
      es: 'Duerma a pocos pasos del mar Caribe en cabañas playeras rústicas bajo cielos estrellados',
    },
    duration: {
      en: '2 Days / 1 Night (Extended stays available)',
      es: '2 Días / 1 Noche (Estadías prolongadas disponibles)',
    },
    suitableFor: {
      en: 'Couples, friends, and travelers seeking tranquility, digital disconnection, and a true island rhythm',
      es: 'Parejas, amigos y viajeros que buscan tranquilidad, desconexión digital y el auténtico ritmo isleño',
    },
    overview: {
      en: 'Experience the magic of San Blas after day-trip boats depart. Enjoy quiet island sunsets, fall asleep to gentle Caribbean waves in a rustic wood-and-thatch cabana, and wake up to serene turquoise water at sunrise. Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
      es: 'Viva la magia de San Blas después de que los botes de excursión de día se marchan. Disfrute de atardeceres tranquilos, duerma con el rumor de las olas en una cabaña rústica de madera y techo de paja, y amanezca frente al agua turquesa. Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
    },
    highlights: {
      en: [
        'Peaceful island atmosphere after daytime visitors leave',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Daily island tour boat excursion to surrounding reefs and sandbanks',
        'Stargazing with zero light pollution',
      ],
      es: [
        'Ambiente isleño apacible una vez finalizadas las visitas diurnas',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Excursión diaria en bote a arrecifes y bancos de arena cercanos',
        'Observación de estrellas sin contaminación lumínica',
      ],
    },
    accommodation: {
      en: 'Rustic beachfront cabana built from natural wood and wild cane with thatched palm roof. Options include private cabanas or private rooms with shared or private basic bathroom facilities. Electricity is powered by solar/generator during scheduled evening hours.',
      es: 'Cabaña playera rústica construida con madera natural y caña brava con techo de hojas de palma. Opciones de cabaña privada o habitación privada con baño compartido o privado básico. Electricidad solar o por generador durante horas nocturnas específicas.',
    },
    transportation: {
      en: 'Roundtrip 4x4 SUV transfer from Panama City hotel to Cartí port, plus local boat transportation to and from the host island.',
      es: 'Traslado ida y vuelta en 4x4 desde hotel en Ciudad de Panamá al puerto de Cartí, más transporte marítimo local hacia y desde la isla anfitriona.',
    },
    included: {
      en: [
        'Roundtrip 4x4 SUV and boat transportation',
        '1 night lodging in authentic island cabana',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Island hopping boat tour on Day 1 or Day 2',
      ],
      es: [
        'Transporte ida y vuelta en 4x4 y bote',
        '1 noche de hospedaje en cabaña rústica',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Tour en bote por islas cercanas en el Día 1 o Día 2',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Additional beverages, beer, sodas, or bottled drinking water',
        'Optional late-checkout boat surcharge (if returning late on Day 2)',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Bebidas adicionales, cervezas, refrescos o agua embotellada',
        'Suplemento opcional por salida tardía en bote (si regresa en la tarde del Día 2)',
      ],
    },
    pricingNote: {
      en: 'Confirmed upon inquiry according to cabana type (private vs shared bathroom) and travel dates.',
      es: 'Confirmado previa consulta según el tipo de cabaña (baño privado vs compartido) y fechas de viaje.',
    },
    importantInfo: {
      en: [
        'Accommodations in Guna Yala are rustic and eco-conscious. Expect authentic sand floors, basic freshwater showers, and scheduled power.',
        'Internet/Wi-Fi is generally unavailable or weak on outer islands; embrace the chance to unplug.',
        'Strict comarca regulations prohibit outside hotel chains; all cabins are managed by local indigenous families.',
      ],
      es: [
        'El hospedaje en Guna Yala es rústico y respetuoso con la naturaleza: pisos de arena, duchas de agua dulce básicas y energía en horarios programados.',
        'El internet/Wi-Fi suele ser limitado o nulo en las islas exteriores; disfrute la oportunidad de desconectar.',
        'Las regulaciones de la comarca prohíben cadenas hoteleras externas; todas las cabañas son gestionadas por familias indígenas locales.',
      ],
    },
    whatToBring: {
      en: [
        'Passport (mandatory physical document)',
        'Cash in small denominations ($1, $5, $10, $20 bills)',
        'Flashlight or headlamp for evening cabana lighting',
        'Portable battery power bank for charging phones',
        'Eco-friendly personal toiletries (biodegradable soap and shampoo)',
        'Insect repellent and reef-friendly sunscreen',
        'Light change of clothes and microfiber towels',
      ],
      es: [
        'Pasaporte (documento físico obligatorio)',
        'Efectivo en billetes pequeños ($1, $5, $10, $20)',
        'Linterna de mano o frontal para la noche en la cabaña',
        'Batería portátil (power bank) para cargar dispositivos móviles',
        'Artículos de higiene biodegradables y respetuosos con el ambiente',
        'Repelente de insectos y protector solar apto para arrecifes',
        'Ropa ligera de cambio y toallas de microfibra',
      ],
    },
    imageType: 'overnight',
  },
  {
    id: 'multi-day-exploration',
    category: 'multi-day',
    title: {
      en: 'Multi-Day Guna Yala Expedition (3+ Days)',
      es: 'Expedición Multidía por Guna Yala (3+ Días)',
    },
    subtitle: {
      en: 'Deeper exploration across outer atolls, Cayos Holandeses, and cultural heritage communities',
      es: 'Exploración profunda por atolones exteriores, Cayos Holandeses y comunidades culturales',
    },
    duration: {
      en: '3 to 5 Days (Customizable itinerary)',
      es: '3 a 5 Días (Itinerario personalizado)',
    },
    suitableFor: {
      en: 'Adventure seekers, photographers, families, and travelers wanting a comprehensive immersion beyond the standard tourist circuit',
      es: 'Aventureros, fotógrafos, familias y viajeros que buscan una inmersión completa más allá del circuito turístico habitual',
    },
    overview: {
      en: 'Journey further into the archipelago to explore remote islands with untouched barrier reefs. You will have time to visit authentic Guna community islands to witness traditional governance, mola textile creation, and daily life, balanced with secluded days on uninhabited cayes.',
      es: 'Viaje más lejos en el archipiélago para explorar islas remotas con arrecifes de barrera intactos. Tendrá tiempo de visitar comunidades tradicionales guna para conocer su gobernanza, la confección de molas y la vida cotidiana, alternando con días en cayos deshabitados.',
    },
    highlights: {
      en: [
        'Exploration of outer archipelagos including Cayos Holandeses or Lemon Cays',
        'Guided visit to an authentic indigenous community village (Cartí Sugdup or similar)',
        'Snorkeling at vibrant offshore coral walls and submerged shipwreck',
        'Traditional home-cooked meals by local Guna families',
      ],
      es: [
        'Exploración de archipiélagos exteriores incluyendo Cayos Holandeses o Cayos Limón',
        'Visita guiada a una comunidad indígena tradicional (Cartí Sugdup o similar)',
        'Snorkel en arrecifes de coral vivos y barco hundido',
        'Comidas caseras tradicionales preparadas por familias locales guna',
      ],
    },
    accommodation: {
      en: 'Overnight in selected island cabanas or island-to-island stays with advance coordination.',
      es: 'Hospedaje en cabañas seleccionadas o estadías de isla en isla con coordinación previa.',
    },
    transportation: {
      en: 'Roundtrip 4x4 land transfer + dedicated local boat navigation across outer islands.',
      es: 'Traslado terrestre 4x4 ida y vuelta + navegación en bote local por islas exteriores.',
    },
    included: {
      en: [
        'Complete roundtrip land and sea transportation',
        'All nights of island accommodation',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Daily island-hopping excursions and community cultural visit',
        'Local Guna guide support throughout the journey',
      ],
      es: [
        'Transporte completo terrestre y marítimo ida y vuelta',
        'Todas las noches de alojamiento en cabaña de isla',
        'Included meals depend on arrival, departure, and the selected package; details are confirmed in your quotation.',
        'Excursiones diarias entre islas y visita cultural comunitaria',
        'Acompañamiento de guía local guna durante el viaje',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Personal drinks and artisan mola purchases in communities',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Bebidas personales y compras de artesanías en las comunidades',
      ],
    },
    pricingNote: {
      en: 'Customized based on total nights, island selection, and party size.',
      es: 'Personalizado según el número total de noches, selección de islas y número de personas.',
    },
    importantInfo: {
      en: [
        'Luggage policy: Please bring compact duffel bags or backpacks (hard-shell large suitcases are difficult to transport on small boats).',
        'When visiting indigenous communities, photography of residents (especially elders and children) must always be preceded by polite verbal permission.',
      ],
      es: [
        'Política de equipaje: Lleve maletas flexibles o mochilas (las maletas grandes rígidas son difíciles de transportar en botes pequeños).',
        'Al visitar comunidades indígenas, siempre se debe pedir permiso antes de fotografiar a los residentes (especialmente ancianos y niños).',
      ],
    },
    whatToBring: {
      en: [
        'Passport',
        'Sufficient cash in small notes',
        'Modest attire for community village visits (covering shoulders/knees)',
        'Snorkel mask and fins',
        'Personal medications and travel essentials',
      ],
      es: [
        'Pasaporte',
        'Efectivo suficiente en billetes pequeños',
        'Vestimenta respetuosa para visitas comunitarias (hombros y rodillas cubiertos)',
        'Máscara de snorkel y aletas',
        'Medicamentos personales y artículos básicos de viaje',
      ],
    },
    imageType: 'multi-day',
  },
  {
    id: 'private-custom-experience',
    category: 'private-custom',
    title: {
      en: 'Private & Custom San Blas Experience',
      es: 'Experiencia Privada y Personalizada en San Blas',
    },
    subtitle: {
      en: 'Tailor-made itineraries, private boats, and flexible island schedules for families or groups',
      es: 'Itinerarios a medida, bote privado y horarios flexibles entre islas para familias o grupos',
    },
    duration: {
      en: 'Custom (1 Day to 1 Week)',
      es: 'A medida (De 1 Día a 1 Semana)',
    },
    suitableFor: {
      en: 'Private groups, family reunions, couples seeking complete privacy, and special celebrations',
      es: 'Grupos privados, reuniones familiares, parejas que buscan privacidad total y celebraciones especiales',
    },
    overview: {
      en: 'Enjoy San Blas on your own terms. With a dedicated private 4x4 vehicle and private Guna boat, you dictate the rhythm of your day—linger longer at secluded sandbars, choose uncrowded reefs, and enjoy personalized attention from our local team.',
      es: 'Disfrute de San Blas a su propio ritmo. Con un vehículo 4x4 privado y un bote guna privado, usted decide el horario: disfrute más tiempo en bancos de arena solitarios, elija arrecifes sin aglomeraciones y reciba atención personalizada de nuestro equipo local.',
    },
    highlights: {
      en: [
        'Private 4x4 transportation directly from your residence or hotel',
        'Private boat and dedicated local captain throughout the stay',
        'Flexibility to avoid crowds and choose preferred island stops',
        'Direct personal planning coordination with Petra',
      ],
      es: [
        'Transporte privado en 4x4 directo desde su residencia u hotel',
        'Bote privado y capitán local dedicado durante toda la estancia',
        'Flexibilidad para evitar multitudes y elegir islas preferidas',
        'Coordinación directa y personalizada con Petra',
      ],
    },
    transportation: {
      en: 'Private 4x4 SUV and private charter boat reserved exclusively for your group.',
      es: 'Vehículo 4x4 SUV privado y bote chárter exclusivo para su grupo.',
    },
    included: {
      en: [
        'Exclusive private transportation on land and water',
        'Tailored itinerary designed with Petra',
        'Meals and island fees according to agreed custom plan',
      ],
      es: [
        'Transporte privado exclusivo terrestre y marítimo',
        'Itinerario diseñado a la medida con Petra',
        'Comidas y tarifas de islas según el plan acordado',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Personal gratuities',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Propinas personales',
      ],
    },
    pricingNote: {
      en: 'Quoted individually based on group size, vehicle requirements, and preferred island stops.',
      es: 'Cotizado individualmente según el tamaño del grupo, vehículos requeridos e islas de preferencia.',
    },
    importantInfo: {
      en: [
        'Private experiences should be planned in advance to guarantee dedicated boat captain and vehicle availability.',
      ],
      es: [
        'Las experiencias privadas deben coordinarse con antelación para garantizar disponibilidad de vehículo y capitán.',
      ],
    },
    whatToBring: {
      en: [
        'Original passports for all guests',
        'Cash in small USD denominations',
        'Preferred personal beach gear and dry bags',
      ],
      es: [
        'Pasaportes originales para todos los integrantes',
        'Efectivo en billetes pequeños (USD)',
        'Equipo personal de playa y bolsas impermeables',
      ],
    },
    imageType: 'private',
  },
  {
    id: 'sailing-adventure',
    category: 'sailing',
    title: {
      en: 'Monohull Sailing Charter Adventure',
      es: 'Aventura a Vela en Velero Monocasco',
    },
    subtitle: {
      en: 'Classic wind-powered island navigation between remote uninhabited reefs and coral lagoons',
      es: 'Navegación clásica a vela entre arrecifes deshabitados y lagunas de coral',
    },
    duration: {
      en: '2 Nights Minimum (3 to 5 Nights recommended)',
      es: 'Mínimo 2 Noches (3 a 5 Noches recomendado)',
    },
    suitableFor: {
      en: 'Sailing enthusiasts, ocean lovers, and adventurers who appreciate authentic nautical living',
      es: 'Entusiastas de la navegación, amantes del mar y aventureros que valoran la vida náutica clásica',
    },
    overview: {
      en: 'Experience San Blas under sail. Anchor each night in crystal-clear calm lagoons protected by coral reefs. Swim, snorkel, paddleboard directly from the boat, and dine on fresh meals prepared aboard while admiring Caribbean sunsets from the deck.',
      es: 'Viva San Blas a vela. Fondee cada noche en lagunas cristalinas y tranquilas protegidas por arrecifes de coral. Nade, haga snorkel o paddleboard directamente desde el barco y disfrute de comidas frescas preparadas a bordo con vistas al atardecer.',
    },
    highlights: {
      en: [
        'Wind-powered navigation between outer coral cays',
        'Accommodations in private onboard nautical cabins',
        'All onboard meals prepared with fresh local seafood and provisions',
        'Access to stand-up paddleboards and snorkeling gear',
      ],
      es: [
        'Navegación impulsada por el viento entre cayos de coral exteriores',
        'Alojamiento en cabinas náuticas privadas a bordo',
        'Todas las comidas a bordo preparadas con mariscos frescos y provisiones locales',
        'Acceso a tablas de paddleboard y equipo de snorkel',
      ],
    },
    accommodation: {
      en: 'Private double cabins onboard a seaworthy sailing vessel, with shared marine head (bathroom) and salon.',
      es: 'Cabinas dobles privadas a bordo de un velero equipado para altamar, con baño marino compartido y salón.',
    },
    transportation: {
      en: '4x4 transfer from Panama City to Cartí, followed by water taxi to the sailing boat anchorage.',
      es: 'Traslado 4x4 de Ciudad de Panamá a Cartí, seguido de taxi acuático hasta el punto de anclaje del velero.',
    },
    included: {
      en: [
        'Private cabin onboard the sailing vessel',
        'Full board (breakfast, lunch, dinner, snacks, and water)',
        'Use of onboard dinghy, paddleboards, and snorkel gear',
        'Professional skipper and hospitality support',
      ],
      es: [
        'Cabina privada a bordo del velero',
        'Pensión completa (desayuno, almuerzo, cena, refrigerios y agua)',
        'Uso del bote auxiliar, paddleboards y equipo de snorkel',
        'Capitán profesional y atención a bordo',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        '4x4 land transfer (can be coordinated directly with Petra)',
        'Specialty alcoholic beverages (guests may bring their own provisions)',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Traslado terrestre 4x4 (se puede coordinar directamente con Petra)',
        'Bebidas alcohólicas especiales (los viajeros pueden llevar sus provisiones)',
      ],
    },
    pricingNote: {
      en: 'Available as private charter or shared cabin; pricing confirmed upon inquiry for specific dates.',
      es: 'Disponible como chárter privado o cabina compartida; precios confirmados al consultar fechas.',
    },
    importantInfo: {
      en: [
        'Pack light in soft duffel bags; hard luggage cannot be stowed easily in sailboat cabins.',
        'Sailing itineraries depend on prevailing wind and sea conditions for optimal comfort.',
      ],
      es: [
        'Empaque ligero en bolsos de lona; las maletas rígidas no se pueden almacenar fácilmente en veleros.',
        'Los itinerarios dependen de las condiciones del viento y del mar para mayor confort.',
      ],
    },
    whatToBring: {
      en: [
        'Passport',
        'Deck shoes or bare feet policy onboard',
        'Reef-safe sunscreen and sunglasses with strap',
        'Personal snacks or beverages of choice',
      ],
      es: [
        'Pasaporte',
        'Calzado de cubierta suave o descalzo a bordo',
        'Protector solar seguro para arrecifes y gafas de sol con cordón',
        'Bebidas o aperitivos de su preferencia',
      ],
    },
    imageType: 'sailing',
  },
  {
    id: 'luxury-catamaran-charter',
    category: 'catamaran',
    title: {
      en: 'Private Catamaran Charter Experience',
      es: 'Chárter Privado en Catamarán de Lujo',
    },
    subtitle: {
      en: 'Maximum comfort, stability, spacious deck living, and gourmet dining in pristine anchorages',
      es: 'Máximo confort, estabilidad, amplias cubiertas y gastronomía a bordo en fondeaderos vírgenes',
    },
    duration: {
      en: '2 Nights Minimum (3 to 7 Nights recommended)',
      es: 'Mínimo 2 Noches (3 a 7 Noches recomendado)',
    },
    suitableFor: {
      en: 'Families, friends, and travelers seeking premium comfort, stability on the water, and private chef service',
      es: 'Familias, amigos y viajeros que buscan el máximo confort, navegación estable y servicio de chef privado',
    },
    overview: {
      en: 'The ultimate way to discover Guna Yala in elevated comfort. Modern catamarans offer wide sun decks, comfortable private double cabins with en-suite bathrooms, stable cruising without tilting, and fresh Caribbean gourmet meals prepared by an onboard crew.',
      es: 'La forma más confortable de descubrir Guna Yala. Los catamaranes modernos ofrecen amplias terrazas para tomar el sol, camarotes dobles privados con baño en suite, navegación estable sin balanceo pronunciado y deliciosos platos caribeños preparados por la tripulación.',
    },
    highlights: {
      en: [
        'Spacious trampoline net and flybridge lounge for relaxing',
        'Comfortable air-conditioned cabins (during generator hours)',
        'Private chef preparing freshly caught seafood (lobster in season, red snapper)',
        'Access to secluded shallow anchorages inaccessible to larger ships',
      ],
      es: [
        'Amplia red de proa y área de descanso para relajarse',
        'Camarotes cómodos con aire acondicionado (en horarios de generador)',
        'Chef a bordo preparando pesca fresca (langosta en temporada, pargo rojo)',
        'Acceso a fondeaderos poco profundos inaccesibles para barcos grandes',
      ],
    },
    accommodation: {
      en: 'Private en-suite double cabins with private shower and marine toilet, large salon, and shaded cockpit dining.',
      es: 'Camarotes dobles privados con baño privado en suite, amplio salón y comedor exterior techado.',
    },
    transportation: {
      en: 'Coordinated 4x4 land transfer from Panama City or optional private scenic charter flight to Guna Yala airstrips.',
      es: 'Traslado terrestre 4x4 coordinado desde Ciudad de Panamá o vuelo chárter privado opcional hacia pistas de Guna Yala.',
    },
    included: {
      en: [
        'Entire private catamaran charter for your private group',
        'Captain and private chef/host',
        'Gourmet meals, fresh tropical fruits, snacks, and water',
        'Paddleboards, sea kayaks, and premium snorkeling gear',
        'Fuel and tender boat transfers to islands',
      ],
      es: [
        'Catamarán privado completo para su grupo exclusivo',
        'Capitán y chef/anfitrión privado a bordo',
        'Comidas gourmet, frutas tropicales frescas, aperitivos y agua',
        'Tablas de paddleboard, kayaks de mar y equipo de snorkel',
        'Combustible y traslados en bote auxiliar a las islas',
      ],
    },
    notIncluded: {
      en: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Optional private charter flight or 4x4 SUV land transfer',
        'Premium champagne or specialty wines (bring your own welcome)',
      ],
      es: [
        'Entrance and port fees will be confirmed in your quotation.',
        'Vuelo chárter opcional o traslado terrestre en 4x4',
        'Champán premium o vinos especiales (se permite llevar provisiones propias)',
      ],
    },
    pricingNote: {
      en: 'Quoted per night based on boat model, season, and number of guests.',
      es: 'Cotizado por noche según el modelo del catamarán, temporada y número de huéspedes.',
    },
    importantInfo: {
      en: [
        'Catamarans anchor in calm, reef-sheltered lagoons, providing calm nights with minimal water motion.',
        'High season dates (December through April) should be requested several weeks in advance.',
      ],
      es: [
        'Los catamaranes fondean en lagunas protegidas por arrecifes, garantizando noches tranquilas con mínimo oleaje.',
        'Las fechas de temporada alta (diciembre a abril) deben solicitarse con varias semanas de anticipación.',
      ],
    },
    whatToBring: {
      en: [
        'Passports',
        'Soft luggage only (no rigid rolling suitcases)',
        'Swimsuits, light breathable cotton clothing, and sun hats',
        'Reef-safe sunscreen and favorite personal snacks',
      ],
      es: [
        'Pasaportes',
        'Solo equipaje blando (no maletas rígidas con ruedas)',
        'Trajes de baño, ropa ligera de algodón y sombrero para el sol',
        'Protector solar para arrecifes y aperitivos favoritos',
      ],
    },
    imageType: 'catamaran',
  },
];
