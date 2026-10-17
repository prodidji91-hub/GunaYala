import { Review } from '../types';

export const REVIEWS_METRIC = {
  rating: 5.0,
  reviewCount: 54,
  platform: 'Google Business',
};

export const REVIEWS_DATA: Review[] = [
  {
    id: 'rev-1',
    author: 'Mathieu Laurent',
    country: 'Canada',
    date: 'Recent traveler',
    rating: 5,
    tripType: {
      en: '2-Night Island Cabana Stay',
      es: 'Estadía de 2 Noches en Cabaña de Isla',
    },
    text: {
      en: 'Petra made the entire organization seamless. Travelling to San Blas can feel daunting with the border and boat transfers, but she gave us exact instructions before we left Panama City. The islands are paradise on earth, and knowing the company is Guna-owned gave us peace of mind that local communities are supported.',
      es: 'Petra hizo que toda la organización fuera impecable. Viajar a San Blas puede parecer complejo por los traslados y la frontera, pero ella nos dio instrucciones exactas antes de salir de Ciudad de Panamá. Las islas son un verdadero paraíso, y saber que la empresa es guna nos dio total tranquilidad.',
    },
  },
  {
    id: 'rev-2',
    author: 'Elena & Carlos R.',
    country: 'Spain',
    date: 'Recent traveler',
    rating: 5,
    tripType: {
      en: 'Classic Day Trip',
      es: 'Excursión de Un Día',
    },
    text: {
      en: 'Unbelievable experience. The 4x4 pickup was right on time at 5:15 AM at our hotel in Casco Viejo. The boat ride through the turquoise cays and the natural swimming pool with starfish was unforgettable. Our boat captain was wonderful and respectful. Excellent communication with Petra via WhatsApp.',
      es: 'Experiencia inolvidable. El 4x4 nos recogió puntualmente a las 5:15 AM en nuestro hotel de Casco Viejo. El recorrido en bote por los cayos turquesa y la piscina natural con estrellas marinas fue mágico. Nuestro capitán guna fue súper amable y respetuoso. Excelente comunicación con Petra por WhatsApp.',
    },
  },
  {
    id: 'rev-3',
    author: 'David S.',
    country: 'United States',
    date: 'Recent traveler',
    rating: 5,
    tripType: {
      en: 'Catamaran Sailing Charter',
      es: 'Chárter en Catamarán a Vela',
    },
    text: {
      en: 'We spent 3 nights on a catamaran visiting Cayos Holandeses. It was by far the highlight of our two weeks in Panama. Fresh fish and lobster, crystal-clear water where you can see 30 meters down, and zero crowds. Abisua and Petra took care of every detail from land transfer to boat boarding.',
      es: 'Pasamos 3 noches en catamarán visitando Cayos Holandeses. Fue sin duda lo mejor de nuestras dos semanas en Panamá. Pescado fresco, agua transparente donde se ve a 30 metros de profundidad y cero aglomeraciones. Abisua y Petra cuidaron cada detalle.',
    },
  },
  {
    id: 'rev-4',
    author: 'Sofia Lindqvist',
    country: 'Sweden',
    date: 'Recent traveler',
    rating: 5,
    tripType: {
      en: 'Overnight Island Stay',
      es: 'Estadía Nocturna en Isla',
    },
    text: {
      en: 'The rustic cabanas on the sand are simple, authentic, and peaceful. Watching the sunset with no background noise other than the Caribbean breeze was pure therapy. Do bring cash and a battery bank as Petra advises in her checklist—she prepares you so well!',
      es: 'Las cabañas rústicas sobre la arena son sencillas, auténticas y tranquilas. Ver el atardecer solo con el sonido de la brisa marina fue una maravilla. Lleve efectivo y batería externa como aconseja Petra en su lista; ¡te prepara perfectamente!',
    },
  },
];
