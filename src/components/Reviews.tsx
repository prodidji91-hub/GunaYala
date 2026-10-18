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
    <section id="reviews" className="py-24 sm:py-32 bg-[#0B2924] text-[#F6F2E9] border-b border-[#C8AC75]/20 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Prominent 5.0 Rating */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C8AC75] mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
              <span>{t.reviews.kicker}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white tracking-tight">
              {t.reviews.title}
            </h2>
            <p className="text-sm sm:text-base text-[#F6F2E9]/80 mt-3 leading-relaxed font-sans font-light">
              {t.reviews.subtitle}
            </p>
          </div>

          {/* Prominent Rating Card */}
          <div className="bg-[#061815] border border-[#C8AC75]/35 rounded-2xl p-6 flex items-center gap-5 shrink-0 shadow-2xl">
            <div className="text-4xl sm:text-5xl font-serif font-light text-[#C8AC75] tabular-nums">
              {REVIEWS_METRIC.rating.toFixed(1)}
            </div>
            <div>
              <div className="flex text-[#C8AC75] mb-1 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-xs text-[#F6F2E9]/75 font-sans">
                <span className="font-bold text-white">{REVIEWS_METRIC.reviewCount}</span> {currentLang === 'es' ? 'reseñas verificadas en Google' : 'verified Google reviews'}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {REVIEWS_DATA.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#061815]/90 border border-[#C8AC75]/25 rounded-2xl p-8 flex flex-col justify-between shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Rating stars & trip type */}
                <div className="flex items-center justify-between">
                  <div className="flex text-[#C8AC75] gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-sans font-medium text-[#C8AC75] uppercase tracking-wider">
                    {rev.tripType[currentLang]}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-base text-[#F6F2E9] leading-relaxed font-serif italic">
                  “{rev.text[currentLang]}”
                </p>
              </div>

              {/* Author & Verification */}
              <div className="pt-6 mt-6 border-t border-[#C8AC75]/20 flex items-center justify-between text-xs text-[#F6F2E9]/70">
                <div>
                  <span className="font-serif font-medium text-white block text-base">
                    {rev.author}
                  </span>
                  <span className="font-light">{rev.country}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#C8AC75] font-sans text-[11px]">
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
