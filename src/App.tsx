import React, { useState, useEffect } from 'react';
import { Language, Experience, ExperienceCategory } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WhyUs } from './components/WhyUs';
import { ExperienceMatcher } from './components/ExperienceMatcher';
import { InteractiveTravelMap } from './components/InteractiveTravelMap';
import { FloatingGallery } from './components/FloatingGallery';
import { ExperienceDetailModal } from './components/ExperienceDetailModal';
import { GunaStory } from './components/GunaStory';
import { Reviews } from './components/Reviews';
import { FaqSection } from './components/FaqSection';
import { TripPlannerSection } from './components/TripPlannerSection';
import { ExperienceBookingModal } from './components/planner/ExperienceBookingModal';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { AdminAuthGuard } from './components/admin/AdminAuthGuard';
import { EXPERIENCES_DATA } from './data/experiences';
import { supabase } from './lib/supabase';

const isAuthCallbackUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('type=recovery') ||
    hash.includes('type=invite') ||
    hash.includes('access_token=') ||
    hash.includes('error=') ||
    hash.includes('error_code=') ||
    search.includes('code=') ||
    search.includes('type=recovery') ||
    search.includes('type=invite') ||
    search.includes('error=') ||
    search.includes('error_code=')
  );
};

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [selectedExperienceForModal, setSelectedExperienceForModal] = useState<Experience | null>(null);
  
  // Dedicated Experience Booking Modal State
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState<boolean>(false);
  const [plannerModalCategory, setPlannerModalCategory] = useState<ExperienceCategory | undefined>(undefined);
  const [plannerPreSelectedCategory, setPlannerPreSelectedCategory] = useState<ExperienceCategory | ''>('');

  // Routing State for /admin route, including Supabase auth callback detection from root URL
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.pathname.startsWith('/admin')) return true;
    if (isAuthCallbackUrl()) {
      // Securely transfer URL to /admin preserving token/hash/code for AdminAuthGuard
      window.history.replaceState(
        {},
        '',
        '/admin' + window.location.search + window.location.hash
      );
      return true;
    }
    return false;
  });

  // Handle Shareable Experience Deep Links (?experience=id or ?exp=id)
  const handleSetExperienceModal = (exp: Experience | null) => {
    setSelectedExperienceForModal(exp);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (exp) {
        url.searchParams.set('experience', exp.id);
      } else {
        url.searchParams.delete('experience');
        url.searchParams.delete('exp');
      }
      window.history.pushState({}, '', url.pathname + url.search + url.hash);
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const atAdmin = window.location.pathname.startsWith('/admin') || isAuthCallbackUrl();
      if (atAdmin && !window.location.pathname.startsWith('/admin')) {
        window.history.replaceState(
          {},
          '',
          '/admin' + window.location.search + window.location.hash
        );
      }
      setIsAdminRoute(atAdmin);

      // Sync experience parameter on back/forward or initial navigate
      const params = new URLSearchParams(window.location.search);
      const expParam = params.get('experience') || params.get('exp');
      if (expParam) {
        const found = EXPERIENCES_DATA.find((e) => e.id === expParam || e.category === expParam);
        if (found) {
          setSelectedExperienceForModal(found);
        }
      } else {
        setSelectedExperienceForModal(null);
      }
    };

    // Initial check on load
    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Listen for Supabase PASSWORD_RECOVERY events
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
          window.history.replaceState(
            {},
            '',
            '/admin' + window.location.search + window.location.hash
          );
        }
        setIsAdminRoute(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigateToPublic = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      setIsAdminRoute(false);
      window.scrollTo(0, 0);
    }
  };

  const handleOpenPlanner = (category?: ExperienceCategory) => {
    if (category) {
      setPlannerModalCategory(category);
      setPlannerPreSelectedCategory(category);
    } else {
      setPlannerModalCategory(undefined);
    }
    setIsPlannerModalOpen(true);
  };

  const handleExploreExperiences = () => {
    const expEl = document.getElementById('experiences') || document.getElementById('planner') || document.getElementById('finder');
    if (expEl) {
      expEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewExperienceDetailsById = (id: string) => {
    const found = EXPERIENCES_DATA.find((e) => e.id === id);
    if (found) {
      handleSetExperienceModal(found);
    }
  };

  // Render Admin Auth Guard / Dashboard at /admin with secure authorization
  if (isAdminRoute) {
    return <AdminAuthGuard onBackToWebsite={handleNavigateToPublic} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#1c242c] selection:bg-[#d8e6dd] selection:text-[#0e3b2f]">
      {/* Top Bar Navigation: Mathematically Centered GUNA YALA + Direct Sub-Navigation */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenPlanner={() => handleOpenPlanner()}
      />

      {/* Main Editorial Flow */}
      <main className="flex-1">
        {/* 1. Full-Screen Cinematic Destination Video Hero (LOCKED) */}
        <Hero
          currentLang={currentLang}
          onExploreClick={handleExploreExperiences}
          onPlanClick={() => handleOpenPlanner()}
        />

        {/* 2. Discover Guna Yala: Autonomous Sanctuary & Natural Stewardship */}
        <WhyUs currentLang={currentLang} />

        {/* 3. Find Your Experience: Refined Guided Questionnaire Flow */}
        <ExperienceMatcher
          currentLang={currentLang}
          onSelectExperience={(cat) => handleOpenPlanner(cat)}
          onViewExperienceDetails={handleViewExperienceDetailsById}
        />

        {/* Interactive Editorial Archipelago Travel Map Section */}
        <InteractiveTravelMap
          currentLang={currentLang}
          onOpenPlanner={(cat) => handleOpenPlanner(cat)}
        />

        {/* Motion Lab 2 Floating Gallery: Cinematic Visual Moments Showcase */}
        <FloatingGallery
          currentLang={currentLang}
          onOpenPlanner={(cat) => handleOpenPlanner(cat as any)}
        />

        {/* 6. The Guna Experience: Authentic & Respectful Indigenous Cultural Storytelling */}
        <GunaStory currentLang={currentLang} />

        {/* 8. What Travelers Say: Real Google Social Proof (5.0 Rating · 54 Reviews) */}
        <Reviews currentLang={currentLang} />

        {/* 9. Essential Island FAQ */}
        <FaqSection currentLang={currentLang} />

        {/* 10. Easy Structured Trip Planning & Experience Selection (How Do You Want to Experience Guna Yala?) */}
        <TripPlannerSection
          currentLang={currentLang}
          preSelectedCategory={plannerPreSelectedCategory}
          onOpenExperienceDetails={(exp) => handleSetExperienceModal(exp)}
        />

        {/* 11. Final Call to Action */}
        <FinalCta
          currentLang={currentLang}
          onPlanClick={() => handleOpenPlanner()}
        />
      </main>

      {/* Footer */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onOpenPlanner={() => handleOpenPlanner()}
      />

      {/* Dedicated Experience Discovery & Booking Flow Modal */}
      <ExperienceBookingModal
        isOpen={isPlannerModalOpen}
        onClose={() => setIsPlannerModalOpen(false)}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        initialCategory={plannerModalCategory}
        onOpenExperienceDetails={(exp) => {
          setIsPlannerModalOpen(false);
          handleSetExperienceModal(exp);
        }}
      />

      {/* Deep-Dive Experience Modal */}
      <ExperienceDetailModal
        experience={selectedExperienceForModal}
        currentLang={currentLang}
        onLanguageChange={setCurrentLang}
        onClose={() => handleSetExperienceModal(null)}
        onInquire={(cat) => handleOpenPlanner(cat)}
        onSelectExperience={(exp) => handleSetExperienceModal(exp)}
      />
    </div>
  );
}
