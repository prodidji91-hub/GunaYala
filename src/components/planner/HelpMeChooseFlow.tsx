import React, { useState } from 'react';
import { Language } from '../../types';
import {
  Compass,
  Clock,
  Sparkles,
  Users,
  Moon,
  Sun,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  ShieldCheck,
} from 'lucide-react';

interface HelpMeChooseFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
  onNavigateToPath: (path: 'day-trip' | 'overnight' | 'private-custom') => void;
}

export const HelpMeChooseFlow: React.FC<HelpMeChooseFlowProps> = ({
  currentLang,
  onBackToSelector,
  onNavigateToPath,
}) => {
  const isEs = currentLang === 'es';

  // State for the 4 practical questions
  const [timeChoice, setTimeChoice] = useState<'1day' | 'overnight' | 'multiday' | null>(null);
  const [interestChoice, setInterestChoice] = useState<'relax' | 'snorkel' | 'culture' | 'sailing' | 'combination' | null>(null);
  const [overnightInterest, setOvernightInterest] = useState<'no' | 'rustic-cabana' | 'boat' | 'undecided' | null>(null);
  const [travelersChoice, setTravelersChoice] = useState<'1-2' | '3-5' | '6+' | null>(null);
  const [privacyPreference, setPrivacyPreference] = useState<'standard' | 'private' | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<1 | 2 | 3 | 4>(1);

  // Compute recommendation based on logic
  const getRecommendation = (): {
    path: 'day-trip' | 'overnight' | 'private-custom';
    title: { en: string; es: string };
    badge: { en: string; es: string };
    reason: { en: string; es: string };
    cta: { en: string; es: string };
  } => {
    // 1. Private preference or large group
    if (privacyPreference === 'private' || travelersChoice === '6+') {
      return {
        path: 'private-custom',
        title: {
          en: 'Private Custom Island Experience',
          es: 'Experiencia Privada a Medida en Guna Yala',
        },
        badge: {
          en: 'Recommended: Private Charter',
          es: 'Recomendación: Servicio Privado',
        },
        reason: {
          en: 'Having a dedicated 4x4 and private boat captain gives your party total freedom over schedule, island routes, and departure timing without sharing space with outside groups.',
          es: 'Contar con un vehículo 4x4 exclusivo y lancha privada brinda a su grupo total libertad en horarios, rutas por islas y ritmo de viaje.',
        },
        cta: {
          en: 'Plan Something Private',
          es: 'Planear Algo Privado',
        },
      };
    }

    // 2. Sailing interest
    if (interestChoice === 'sailing' || overnightInterest === 'boat') {
      return {
        path: 'private-custom',
        title: {
          en: 'San Blas Sailing or Catamaran Charter',
          es: 'Aventura a Vela o Catamarán en San Blas',
        },
        badge: {
          en: 'Recommended: Sailing Experience',
          es: 'Recomendación: Navegación a Vela',
        },
        reason: {
          en: 'Sailing allows you to reach remote outer reefs and Cayos Holandeses under wind power with comfortable onboard cabins and freshly prepared ocean dining.',
          es: 'Navegar a vela le permite llegar a los arrecifes más vírgenes y Cayos Holandeses con camarotes privados a bordo y comidas frescas del mar.',
        },
        cta: {
          en: 'Plan a Sailing Charter',
          es: 'Planear Navegación Privada',
        },
      };
    }

    // 3. Day trip condition: limited to 1 day or explicitly no overnight
    if (timeChoice === '1day' || overnightInterest === 'no') {
      return {
        path: 'day-trip',
        title: {
          en: 'Classic San Blas Island Hopping Day Trip',
          es: 'Pasadía Clásico por las Islas de San Blas',
        },
        badge: {
          en: 'Recommended: Day Trip (Instant Online Booking)',
          es: 'Recomendación: Pasadía (Reserva Directa en Línea)',
        },
        reason: {
          en: 'You can experience the best of Guna Yala—visiting 2 to 3 pristine coral islands and the natural starfish pool with traditional lunch—and return comfortably to Panama City tonight.',
          es: 'Disfrutará de lo mejor de Guna Yala visitando 2 o 3 islas paradisíacas y la piscina natural con almuerzo isleño, regresando a Ciudad de Panamá el mismo día.',
        },
        cta: {
          en: 'Book a Day Trip Online',
          es: 'Reservar Pasadía en Línea',
        },
      };
    }

    // 4. Overnight condition: 1-2 nights or multi-day
    return {
      path: 'overnight',
      title: {
        en: 'Rustic Beachfront Island Overnight Stay',
        es: 'Estadía Rústica con Noche Frente al Mar',
      },
      badge: {
        en: 'Recommended: Overnight Stay with Petra',
        es: 'Recomendación: Estadía con Petra',
      },
      reason: {
        en: 'Staying overnight on a traditional coral island lets you experience the tranquility of sunset and sunrise, uncrowded beaches after day-trippers leave, and authentic Guna hospitality.',
        es: 'Quedarse a dormir en una cabaña tradicional le permite vivir la tranquilidad del atardecer y amanecer caribeño, playas solitarias y hospitalidad guna.',
      },
      cta: {
        en: 'Explore Overnight Stays',
        es: 'Explorar Estadías con Noche',
      },
    };
  };

  const isCompleted = timeChoice && interestChoice && overnightInterest && travelersChoice;
  const recommendation = isCompleted ? getRecommendation() : null;

  const resetAll = () => {
    setTimeChoice(null);
    setInterestChoice(null);
    setOvernightInterest(null);
    setTravelersChoice(null);
    setPrivacyPreference(null);
    setCurrentQuestion(1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          onClick={onBackToSelector}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isEs ? 'Volver a Opciones' : 'Back to Options'}</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#64748b] hover:text-[#06121e] uppercase tracking-wider transition-colors"
            title="Reset answers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isEs ? 'Reiniciar' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {!isCompleted ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b45309]/10 text-[#b45309] text-[11px] font-mono uppercase tracking-[0.2em] mb-3">
              <Compass className="w-3.5 h-3.5" />
              <span>{isEs ? 'Guía de Decisión Rápida' : 'Guided Recommendation'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Encuentre su Experiencia Ideal' : 'Find Your Ideal Experience'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? '4 preguntas prácticas sobre su tiempo y preferencias para orientarle hacia el viaje correcto.'
                : '4 practical questions about your schedule and travel preferences to guide you directly.'}
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
            {[1, 2, 3, 4].map((q) => (
              <div
                key={q}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  currentQuestion >= q ? 'bg-[#b45309]' : 'bg-[#e2e8f0]'
                }`}
              />
            ))}
          </div>

          {/* Question 1: Time */}
          {currentQuestion === 1 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#b45309] font-bold">
                {isEs ? 'Pregunta 1 de 4' : 'Question 1 of 4'}
              </span>
              <h4 className="text-xl sm:text-2xl font-display font-medium text-[#06121e]">
                {isEs ? '¿De cuánto tiempo dispone en Panamá?' : 'How much time do you have in Panama?'}
              </h4>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: '1day',
                    label: isEs ? 'Solo 1 Día' : 'Just 1 Day',
                    desc: isEs ? 'Quiero visitar las islas y regresar a Ciudad de Panamá esta misma noche' : 'I want to see the islands and return to Panama City tonight',
                  },
                  {
                    id: 'overnight',
                    label: isEs ? '1 a 2 Noches' : '1 to 2 Nights',
                    desc: isEs ? 'Quiero dormir en una cabaña frente al mar y despertar con el sonido del océano' : 'I want to stay overnight in a beachfront cabana and wake up to the ocean',
                  },
                  {
                    id: 'multiday',
                    label: isEs ? '3 o más Días' : '3 or More Days',
                    desc: isEs ? 'Deseo una inmersión profunda, recorrer cayos remotos o navegar en velero' : 'I want an in-depth voyage, outer reef exploration, or sailing adventure',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setTimeChoice(item.id as any);
                      setCurrentQuestion(2);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      timeChoice === item.id
                        ? 'bg-[#fffbeb] border-[#b45309] ring-1 ring-[#b45309]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] hover:border-[#b45309]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#06121e]">{item.label}</div>
                      <div className="text-xs text-[#64748b] font-light mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#b45309] shrink-0 ml-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question 2: Interest */}
          {currentQuestion === 2 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#b45309] font-bold">
                {isEs ? 'Pregunta 2 de 4' : 'Question 2 of 4'}
              </span>
              <h4 className="text-xl sm:text-2xl font-display font-medium text-[#06121e]">
                {isEs ? '¿Qué tipo de experiencia le interesa más?' : 'What type of experience interests you most?'}
              </h4>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'relax',
                    label: isEs ? 'Relax y Playas de Arena Blanca' : 'Relaxing & White Sand Beaches',
                    desc: isEs ? 'Descansar bajo palmeras, nadar en aguas turquesas y desconectar' : 'Lounging under coconut palms, swimming in crystal water, and unwinding',
                  },
                  {
                    id: 'snorkel',
                    label: isEs ? 'Snorkel en Arrecifes y Piscina Natural' : 'Snorkeling Reefs & Natural Pools',
                    desc: isEs ? 'Vida marina, estrellas de mar, corales y barco hundido' : 'Marine life, starfish sandbanks, colorful corals, and shipwrecks',
                  },
                  {
                    id: 'culture',
                    label: isEs ? 'Cultura Guna y Tradición Indígena' : 'Guna Culture & Indigenous Tradition',
                    desc: isEs ? 'Conocer la comarca autónoma, molas artesanales y estilo de vida local' : 'Visiting autonomous communities, handwoven molas, and living heritage',
                  },
                  {
                    id: 'sailing',
                    label: isEs ? 'Navegación a Vela o Catamarán' : 'Sailing or Catamaran Charter',
                    desc: isEs ? 'Sentir el viento, explorar atolones exteriores y dormir a bordo' : 'Traveling under wind power, outer reefs, and sleeping onboard',
                  },
                  {
                    id: 'combination',
                    label: isEs ? 'Una Combinación Completa' : 'A Balanced Combination',
                    desc: isEs ? 'Un poco de todo: playas, snorkel, gastronomía isleña y descanso' : 'A bit of everything: beaches, snorkeling, local meals, and scenery',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setInterestChoice(item.id as any);
                      setCurrentQuestion(3);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      interestChoice === item.id
                        ? 'bg-[#fffbeb] border-[#b45309] ring-1 ring-[#b45309]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] hover:border-[#b45309]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#06121e]">{item.label}</div>
                      <div className="text-xs text-[#64748b] font-light mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#b45309] shrink-0 ml-3" />
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(1)}
                  className="text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider"
                >
                  {isEs ? '← Pregunta anterior' : '← Previous question'}
                </button>
              </div>
            </div>
          )}

          {/* Question 3: Overnight Interest */}
          {currentQuestion === 3 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#b45309] font-bold">
                {isEs ? 'Pregunta 3 de 4' : 'Question 3 of 4'}
              </span>
              <h4 className="text-xl sm:text-2xl font-display font-medium text-[#06121e]">
                {isEs ? '¿Le interesa quedarse a dormir en las islas?' : 'Are you interested in staying overnight?'}
              </h4>

              <div className="space-y-3 pt-2">
                {[
                  {
                    id: 'no',
                    label: isEs ? 'No, prefiero volver el mismo día (Pasadía)' : 'No, I prefer returning the same day (Day Trip)',
                    desc: isEs ? 'Regresar a dormir a mi hotel en Ciudad de Panamá' : 'Sleep at my hotel in Panama City tonight',
                  },
                  {
                    id: 'rustic-cabana',
                    label: isEs ? 'Sí, en una cabaña rústica tradicional frente al mar' : 'Yes, in a traditional rustic beachfront cabana',
                    desc: isEs ? 'Vivir la auténtica experiencia isleña en cabaña de madera' : 'Authentic island lifestyle in a traditional wooden cabana',
                  },
                  {
                    id: 'boat',
                    label: isEs ? 'Sí, a bordo de un velero o catamarán privado' : 'Yes, onboard a private sailboat or catamaran',
                    desc: isEs ? 'Camarote privado sobre el mar con comidas preparadas' : 'Private cabin on the water with full ocean crew',
                  },
                  {
                    id: 'undecided',
                    label: isEs ? 'Indeciso, abierto a recomendaciones' : 'Open to recommendations based on value',
                    desc: isEs ? 'Depende de la logística y la comodidad del viaje' : 'Depends on logistics and island comfort',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOvernightInterest(item.id as any);
                      setCurrentQuestion(4);
                    }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      overnightInterest === item.id
                        ? 'bg-[#fffbeb] border-[#b45309] ring-1 ring-[#b45309]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] hover:border-[#b45309]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#06121e]">{item.label}</div>
                      <div className="text-xs text-[#64748b] font-light mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#b45309] shrink-0 ml-3" />
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(2)}
                  className="text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider"
                >
                  {isEs ? '← Pregunta anterior' : '← Previous question'}
                </button>
              </div>
            </div>
          )}

          {/* Question 4: Travelers & Privacy */}
          {currentQuestion === 4 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm space-y-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#b45309] font-bold">
                {isEs ? 'Pregunta 4 de 4' : 'Question 4 of 4'}
              </span>
              <h4 className="text-xl sm:text-2xl font-display font-medium text-[#06121e]">
                {isEs ? '¿Cuántos viajan y qué nivel de privacidad prefiere?' : 'How many are traveling and what is your party style?'}
              </h4>

              <div className="space-y-3 pt-2">
                {[
                  {
                    travelers: '1-2',
                    privacy: 'standard',
                    label: isEs ? '1 a 2 Personas (Grupo Estándar Compartido)' : '1 to 2 People (Standard Shared Group)',
                    desc: isEs ? 'Viajo solo o en pareja; feliz de compartir 4x4 y lancha estándar' : 'Solo or couple; happy to join standard shared 4x4 and boat',
                  },
                  {
                    travelers: '3-5',
                    privacy: 'standard',
                    label: isEs ? 'Familia o Grupo Pequeño (3 a 5 Personas)' : 'Family or Small Group (3 to 5 People)',
                    desc: isEs ? 'Grupo pequeño familiar; experiencia estándar o privada' : 'Small family party; standard or private option',
                  },
                  {
                    travelers: '6+',
                    privacy: 'private',
                    label: isEs ? 'Grupo de 6+ Personas (Privacidad Recomendada)' : 'Group of 6+ People (Private Recommended)',
                    desc: isEs ? 'Requerimos vehículo y bote dedicado exclusivo' : 'We require a dedicated vehicle and private boat',
                  },
                  {
                    travelers: '1-2',
                    privacy: 'private',
                    label: isEs ? 'Cualquier tamaño, pero deseamos servicio 100% privado' : 'Any size, but strictly 100% private service',
                    desc: isEs ? 'Queremos horarios personalizados y bote propio' : 'We want custom departure times and an exclusive boat',
                  },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTravelersChoice(item.travelers as any);
                      setPrivacyPreference(item.privacy as any);
                    }}
                    className="w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between bg-[#faf8f5] border-[#e2d8c5] hover:border-[#b45309]"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#06121e]">{item.label}</div>
                      <div className="text-xs text-[#64748b] font-light mt-0.5">{item.desc}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#b45309] shrink-0 ml-3" />
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentQuestion(3)}
                  className="text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider"
                >
                  {isEs ? '← Pregunta anterior' : '← Previous question'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================
            RECOMMENDATION OUTCOME (CLEAR PATH TO CONTINUE)
           ======================================================== */
        <div className="space-y-6 text-center max-w-xl mx-auto py-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#b45309]/15 text-[#b45309] flex items-center justify-center mx-auto mb-3">
            <Compass className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#b45309]/10 text-[#b45309] text-[11px] font-mono uppercase tracking-[0.2em]">
            {recommendation?.badge[currentLang]}
          </div>

          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-light text-[#06121e]">
            {recommendation?.title[currentLang]}
          </h3>

          <p className="text-sm text-[#475569] font-light leading-relaxed max-w-lg mx-auto">
            {recommendation?.reason[currentLang]}
          </p>

          <div className="p-6 bg-white rounded-3xl border border-[#e2d8c5] shadow-sm space-y-4">
            <div className="text-xs font-mono uppercase tracking-wider text-[#64748b] border-b border-[#f1f5f9] pb-3">
              {isEs ? 'Camino Recomendado para Continuar:' : 'Recommended Path to Continue:'}
            </div>

            <button
              onClick={() => {
                if (recommendation) {
                  onNavigateToPath(recommendation.path);
                }
              }}
              className="w-full py-4 px-6 rounded-xl bg-[#06121e] hover:bg-[#b45309] text-white text-xs uppercase tracking-[0.18em] font-medium transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span>{recommendation?.cta[currentLang]}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={resetAll}
              className="text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider block mx-auto pt-2"
            >
              {isEs ? 'Rehacer Preguntas' : 'Start Questionnaire Over'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
