import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { REVIEWS_DATA, REVIEWS_METRIC } from '../data/reviews';
import { Star, CheckCircle2, Sparkles } from 'lucide-react';

interface ReviewsProps {
  currentLang: Language;
}

export const Reviews: React.FC<ReviewsProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section id="reviews" className="py-24 sm:py-32 bg-[#F0E7D8] text-[#173D36] border-b border-[#E2D2BB] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Prominent 5.0 Rating */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C5A46B] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#55B8B3]" />
              <span>{t.reviews.kicker}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#173D36] tracking-tight">
              {t.reviews.title}
            </h2>
            <p className="text-sm sm:text-base text-[#53645E] mt-3 leading-relaxed font-sans font-light">
              {t.reviews.subtitle}
            </p>
          </div>

          {/* Prominent Rating Card */}
          <div className="bg-white border border-[#E2D2BB] rounded-2xl p-6 flex items-center gap-5 shrink-0 shadow-md">
            <div className="text-4xl sm:text-5xl font-serif font-light text-[#C5A46B] tabular-nums">
              {REVIEWS_METRIC.rating.toFixed(1)}
            </div>
            <div>
              <div className="flex text-[#C5A46B] mb-1 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-xs text-[#53645E] font-sans">
                <span className="font-bold text-[#173D36]">{REVIEWS_METRIC.reviewCount}</span> {currentLang === 'es' ? 'reseñas verificadas en Google' : 'verified Google reviews'}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {REVIEWS_DATA.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-[#E2D2BB] rounded-2xl p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Rating stars & trip type */}
                <div className="flex items-center justify-between">
                  <div className="flex text-[#C5A46B] gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-sans font-semibold text-[#55B8B3] uppercase tracking-wider">
                    {rev.tripType[currentLang]}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-base text-[#173D36] leading-relaxed font-serif italic">
                  “{rev.text[currentLang]}”
                </p>
              </div>

              {/* Author & Verification */}
              <div className="pt-6 mt-6 border-t border-[#E2D2BB] flex items-center justify-between text-xs text-[#53645E]">
                <div>
                  <span className="font-serif font-medium text-[#173D36] block text-base">
                    {rev.author}
                  </span>
                  <span className="font-light">{rev.country}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#55B8B3] font-sans text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Google Verified</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
