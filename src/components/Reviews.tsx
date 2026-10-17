import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { REVIEWS_DATA, REVIEWS_METRIC } from '../data/reviews';
import { Star, CheckCircle2 } from 'lucide-react';

interface ReviewsProps {
  currentLang: Language;
}

export const Reviews: React.FC<ReviewsProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section id="reviews" className="py-24 md:py-36 bg-[#06121E] text-white border-t border-[#C6A15B]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Prominent 5.0 Rating */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="max-w-2xl">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.25em] text-[#C6A15B] mb-3">
              {t.reviews.kicker}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white tracking-tight">
              {t.reviews.title}
            </h2>
            <p className="text-sm sm:text-base text-[#94a3b8] mt-3 leading-relaxed font-light">
              {t.reviews.subtitle}
            </p>
          </div>

          {/* Prominent Rating Card */}
          <div className="bg-[#0B2733] border border-[#C6A15B]/30 rounded-2xl p-6 flex items-center gap-5 shrink-0 shadow-2xl">
            <div className="text-4xl sm:text-5xl font-serif font-light text-[#C6A15B] tabular-nums">
              {REVIEWS_METRIC.rating.toFixed(1)}
            </div>
            <div>
              <div className="flex text-[#C6A15B] mb-1 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <div className="text-xs text-[#94a3b8] font-mono">
                <span className="font-bold text-white">{REVIEWS_METRIC.reviewCount}</span> verified Google reviews
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {REVIEWS_DATA.map((rev) => (
            <div
              key={rev.id}
              className="bg-[#0B2733]/90 border border-[#C6A15B]/25 rounded-2xl p-8 flex flex-col justify-between shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="space-y-4">
                {/* Rating stars & trip type */}
                <div className="flex items-center justify-between">
                  <div className="flex text-[#C6A15B] gap-1">
                    {[...Array(rev.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#C6A15B] uppercase tracking-wider">
                    {rev.tripType[currentLang]}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-base text-[#F7F3EC] leading-relaxed font-serif italic">
                  “{rev.text[currentLang]}”
                </p>
              </div>

              {/* Author & Verification */}
              <div className="pt-6 mt-6 border-t border-[#C6A15B]/20 flex items-center justify-between text-xs text-[#94a3b8]">
                <div>
                  <span className="font-serif font-medium text-white block text-base">
                    {rev.author}
                  </span>
                  <span className="font-light">{rev.country}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#38bdf8] font-mono text-[11px]">
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
