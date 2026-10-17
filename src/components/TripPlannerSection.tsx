import React, { useState, useEffect } from 'react';
import { Language, ExperienceCategory, Experience } from '../types';
import { ExperienceSelector } from './planner/ExperienceSelector';
import { DayTripBookingFlow } from './planner/DayTripBookingFlow';
import { OvernightFlow } from './planner/OvernightFlow';
import { PrivateCustomFlow } from './planner/PrivateCustomFlow';
import { HelpMeChooseFlow } from './planner/HelpMeChooseFlow';
import { PlannerFlowPath } from './planner/ExperienceBookingModal';

interface TripPlannerProps {
  currentLang: Language;
  preSelectedCategory?: ExperienceCategory | '';
  onOpenExperienceDetails?: (exp: Experience) => void;
}

export const TripPlannerSection: React.FC<TripPlannerProps> = ({
  currentLang,
  preSelectedCategory = '',
  onOpenExperienceDetails,
}) => {
  const [activePath, setActivePath] = useState<PlannerFlowPath>('selector');

  // React to preSelectedCategory if user arrives from an experience card
  useEffect(() => {
    if (preSelectedCategory === 'day-trip') {
      setActivePath('day-trip');
    } else if (preSelectedCategory === 'overnight' || preSelectedCategory === 'multi-day') {
      setActivePath('overnight');
    } else if (
      preSelectedCategory === 'private-custom' ||
      preSelectedCategory === 'sailing' ||
      preSelectedCategory === 'catamaran'
    ) {
      setActivePath('private-custom');
    }
  }, [preSelectedCategory]);

  return (
    <section id="planner" className="py-16 sm:py-24 bg-[#faf7f2] border-t border-[#ede4d5] scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        {activePath === 'selector' && (
          <ExperienceSelector
            currentLang={currentLang}
            onSelectPath={(path) => setActivePath(path)}
          />
        )}

        {activePath === 'day-trip' && (
          <DayTripBookingFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
          />
        )}

        {(activePath === 'overnight' || activePath === 'multi-day') && (
          <OvernightFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
            onOpenDetailsModal={onOpenExperienceDetails}
          />
        )}

        {(activePath === 'private-custom' || activePath === 'sailing' || activePath === 'catamaran') && (
          <PrivateCustomFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
          />
        )}

        {activePath === 'help-me-choose' && (
          <HelpMeChooseFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
            onNavigateToPath={(path) => setActivePath(path)}
          />
        )}
      </div>
    </section>
  );
};
